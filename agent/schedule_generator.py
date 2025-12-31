#!/usr/bin/env python3
"""
Krooster Schedule Generator using Claude Agent SDK
Generates optimal weekly schedules for restaurant staff
"""

import asyncio
import json
import os
import sys
from datetime import datetime, timedelta
from typing import Optional

import psycopg2
from psycopg2.extras import RealDictCursor

# Add parent directory for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from claude_agent_sdk import query, ClaudeAgentOptions


# Database configuration
DB_CONFIG = {
    "host": os.getenv("POSTGRES_HOST", "localhost"),
    "port": os.getenv("POSTGRES_PORT", "5432"),
    "database": os.getenv("POSTGRES_DB", "planning"),
    "user": os.getenv("POSTGRES_USER", "planning"),
    "password": os.getenv("POSTGRES_PASSWORD", "qsIbK5BjdoMDB1rlFh49"),
}


def get_db_connection():
    """Get PostgreSQL connection"""
    return psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)


def fetch_scheduling_context() -> dict:
    """Fetch all data needed for schedule generation"""
    conn = get_db_connection()
    cur = conn.cursor()

    # Fetch employees
    cur.execute("""
        SELECT e.id, e.first_name, e.last_name, e.restaurant_id, e.is_mobile,
               e.positions, e.active, e.employment_type, e.days_off,
               e.preferred_shift, e.max_hours_per_week,
               COALESCE(e.seniority, 'junior') as seniority,
               r.name as restaurant_name
        FROM employees e
        LEFT JOIN restaurants r ON e.restaurant_id = r.id
        WHERE e.active = true
        ORDER BY e.restaurant_id, e.last_name
    """)
    employees = cur.fetchall()

    # Fetch restaurants
    cur.execute("""
        SELECT id, name, location, opening_hours, closing_hours, closed_dates
        FROM restaurants
        ORDER BY id
    """)
    restaurants = cur.fetchall()

    # Fetch shift rules
    cur.execute("SELECT key, value FROM shift_rules")
    rules = {row['key']: row['value'] for row in cur.fetchall()}

    # Fetch existing shifts for the target week (to avoid duplicates)
    cur.execute("""
        SELECT employee_id, date, start_time, end_time, restaurant_id
        FROM shifts
        WHERE date >= CURRENT_DATE AND date < CURRENT_DATE + INTERVAL '14 days'
        AND status != 'cancelled'
    """)
    existing_shifts = cur.fetchall()

    # Fetch approved absences
    cur.execute("""
        SELECT employee_id, start_date, end_date, type
        FROM absences
        WHERE status = 'approved'
        AND end_date >= CURRENT_DATE
    """)
    absences = cur.fetchall()

    # Fetch active missions
    cur.execute("""
        SELECT employee_id, destination_restaurant_id, start_date, end_date
        FROM missions
        WHERE status IN ('accepted', 'proposed')
        AND end_date >= CURRENT_DATE
    """)
    missions = cur.fetchall()

    # Fetch pending shift swap requests
    cur.execute("""
        SELECT ssr.*,
               re.first_name || ' ' || re.last_name as requester_name,
               te.first_name || ' ' || te.last_name as target_name,
               rs.date as requester_date, rs.start_time as requester_start,
               ts.date as target_date, ts.start_time as target_start
        FROM shift_swap_requests ssr
        LEFT JOIN employees re ON ssr.requester_employee_id = re.id
        LEFT JOIN employees te ON ssr.target_employee_id = te.id
        LEFT JOIN shifts rs ON ssr.requester_shift_id = rs.id
        LEFT JOIN shifts ts ON ssr.target_shift_id = ts.id
        WHERE ssr.status = 'pending'
    """)
    pending_swaps = cur.fetchall()

    cur.close()
    conn.close()

    def serialize_row(row):
        """Convert a row to JSON-serializable dict"""
        d = dict(row)
        for k, v in d.items():
            if hasattr(v, 'isoformat'):  # date, datetime, time
                d[k] = str(v)
            elif isinstance(v, (list, tuple)) and v and hasattr(v[0], 'isoformat'):
                d[k] = [str(x) for x in v]
        return d

    return {
        "employees": [serialize_row(e) for e in employees],
        "restaurants": [serialize_row(r) for r in restaurants],
        "rules": rules,
        "existing_shifts": [serialize_row(s) for s in existing_shifts],
        "absences": [serialize_row(a) for a in absences],
        "missions": [serialize_row(m) for m in missions],
        "pending_swaps": [serialize_row(s) for s in pending_swaps],
    }


def build_scheduling_prompt(context: dict, week_start: str, options: dict = None) -> str:
    """Build the prompt for schedule generation"""

    options = options or {}

    # Format employees grouped by restaurant
    employees_by_rest = {1: [], 2: []}
    senior_count = {'total': 0, 1: 0, 2: 0}
    junior_count = {'total': 0, 1: 0, 2: 0}
    kitchen_staff = {1: [], 2: []}
    cashier_staff = {1: [], 2: []}

    for e in context['employees']:
        name = e.get('nickname') or f"{e['first_name']} {e['last_name']}".strip() or f"Employee {e['id']}"
        rest_id = e['restaurant_id'] or 1
        rest = e['restaurant_name'] or 'Unassigned'
        positions = e['positions'] or []
        positions_str = ', '.join(positions) or 'General'
        emp_type = {'full_time': 'FT', 'part_time': 'PT', 'extra': 'EX'}.get(e['employment_type'], 'FT')
        shift_pref = {'morning': 'AM', 'afternoon': 'PM', 'flexible': 'Flex'}.get(e['preferred_shift'], 'Flex')
        seniority = e.get('seniority', 'junior')
        seniority_label = 'SR' if seniority == 'senior' else 'JR'

        if seniority == 'senior':
            senior_count['total'] += 1
            senior_count[rest_id] = senior_count.get(rest_id, 0) + 1
        else:
            junior_count['total'] += 1
            junior_count[rest_id] = junior_count.get(rest_id, 0) + 1

        # Track position coverage
        if 'kitchen' in positions:
            kitchen_staff[rest_id].append(e['id'])
        if 'cashier' in positions:
            cashier_staff[rest_id].append(e['id'])

        days_off_str = ''
        if e['days_off']:
            days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
            days_off_str = f", Off: {','.join(days[d] for d in e['days_off'])}"
        mobile = ', Mobile' if e['is_mobile'] else ''
        max_hrs = f", Max {e['max_hours_per_week']}h/w" if e['max_hours_per_week'] else ''

        emp_line = f"    ID:{e['id']} {name} ({emp_type}, {seniority_label}, {shift_pref}, {positions_str}{mobile}{days_off_str}{max_hrs})"

        if rest_id in employees_by_rest:
            employees_by_rest[rest_id].append(emp_line)
        if e['is_mobile']:
            # Mobile employees appear in both restaurants' lists
            other_rest = 1 if rest_id == 2 else 2
            employees_by_rest[other_rest].append(f"    ID:{e['id']} {name} [MOBILE from {rest}] ({emp_type}, {seniority_label}, {shift_pref}, {positions_str}{days_off_str}{max_hrs})")

    # Format restaurants
    restaurants_text = []
    for r in context['restaurants']:
        closed = f", Closed: {r['closed_dates']}" if r.get('closed_dates') else ""
        restaurants_text.append(
            f"  - ID:{r['id']} {r['name']} ({r['location']}), Hours: {r['opening_hours']}-{r['closing_hours']}{closed}"
        )

    # Format absences for the week
    absences_text = []
    for a in context['absences']:
        emp = next((e for e in context['employees'] if e['id'] == a['employee_id']), None)
        name = f"{emp['first_name']} {emp['last_name']}" if emp else f"Employee {a['employee_id']}"
        absences_text.append(f"  - {name} (ID:{a['employee_id']}): {a['start_date']} to {a['end_date']} ({a['type']})")

    # Format missions
    missions_text = []
    for m in context['missions']:
        emp = next((e for e in context['employees'] if e['id'] == m['employee_id']), None)
        name = f"{emp['first_name']} {emp['last_name']}" if emp else f"Employee {m['employee_id']}"
        dest = next((r['name'] for r in context['restaurants'] if r['id'] == m['destination_restaurant_id']), 'Unknown')
        missions_text.append(f"  - {name} (ID:{m['employee_id']}) -> {dest}: {m['start_date']} to {m['end_date']}")

    # Format pending swaps
    swaps_text = []
    for s in context.get('pending_swaps', []):
        swaps_text.append(f"  - {s.get('requester_name', 'Unknown')} <-> {s.get('target_name', 'Unknown')} on {s.get('requester_date')}")

    rules = context['rules']

    prompt = f"""Generate a weekly schedule for the week starting {week_start}.

RESTAURANTS:
{chr(10).join(restaurants_text)}

=== HUA HIN TEAM (Restaurant ID: 1) ===
Seniors: {senior_count.get(1, 0)}, Juniors: {junior_count.get(1, 0)}
Kitchen staff IDs: {kitchen_staff.get(1, [])}
Cashier staff IDs: {cashier_staff.get(2, [])}
{chr(10).join(employees_by_rest.get(1, ['  None']))}

=== SATHORN/BANGKOK TEAM (Restaurant ID: 2) ===
Seniors: {senior_count.get(2, 0)}, Juniors: {junior_count.get(2, 0)}
Kitchen staff IDs: {kitchen_staff.get(2, [])}
Cashier staff IDs: {cashier_staff.get(2, [])}
{chr(10).join(employees_by_rest.get(2, ['  None']))}

APPROVED ABSENCES (DO NOT SCHEDULE THESE EMPLOYEES ON THESE DATES):
{chr(10).join(absences_text) if absences_text else '  None'}

ACTIVE MISSIONS (employee works at DESTINATION restaurant):
{chr(10).join(missions_text) if missions_text else '  None'}

PENDING SHIFT SWAPS (be aware, may change):
{chr(10).join(swaps_text) if swaps_text else '  None'}

=== SHIFT SYSTEM ===
TWO shifts per day per restaurant:
- MORNING SHIFT (Lunch service): 10:30-16:00 (5.5h) or 11:00-16:00 (5h)
- AFTERNOON SHIFT (Dinner service): 16:00-00:30 (8.5h) or 16:00-23:00 (7h)

Restaurant Hours:
- Hua Hin (A la mer): 11:00-23:00
- Sathorn (Kosmo Bangkok): 10:30-00:30

=== CRITICAL BUSINESS RULES ===

1. WEEKLY HOURS (48h target):
   - Full-time employees MUST work ~48 hours/week (6 days)
   - Each employee works 6 days, has 1 day off (their fixed day_off)
   - Schedule 8h/day for 6 days = 48h/week

2. SENIORITY REQUIREMENTS (MANDATORY):
   - MORNING/LUNCH SHIFT: Minimum 1 Senior (SR) employee per shift
   - AFTERNOON/DINNER SHIFT: Minimum 1-2 Senior (SR) employees per shift
   - Prefer 2 seniors on busy dinner shifts (Friday, Saturday, Sunday)

3. POSITION COVERAGE (MANDATORY):
   - EVERY shift MUST have at least 1 person with 'kitchen' position
   - EVERY shift MUST have at least 1 person with 'cashier' position
   - If an employee has multiple positions (e.g., service,cashier), they can cover cashier

4. SHIFT PREFERENCES:
   - AM preference employees: prioritize morning shifts
   - PM preference employees: prioritize afternoon shifts
   - Flexible employees: can work either shift

5. DAYS OFF:
   - NEVER schedule an employee on their fixed day off
   - days_off: [0]=Monday, [1]=Tuesday, ..., [6]=Sunday

6. MOBILE EMPLOYEES & MISSIONS:
   - Mobile employees CAN work at either restaurant
   - If on mission: schedule them at destination_restaurant_id
   - Non-mobile: only at their assigned restaurant

=== VALIDATION CHECKLIST ===
Before outputting, verify each day has:
[ ] At least 1 senior on morning shift (each restaurant)
[ ] At least 1-2 seniors on afternoon shift (each restaurant)
[ ] At least 1 kitchen position on each shift
[ ] At least 1 cashier position on each shift
[ ] No employee scheduled on their day off
[ ] No employee scheduled during approved absence
[ ] Employees on mission are at destination restaurant
[ ] Each full-time employee scheduled for ~8h x 6 days = 48h

=== OUTPUT FORMAT ===
Return a JSON array of shifts. Each shift:
{{
  "employee_id": <int>,
  "restaurant_id": <int>,
  "date": "YYYY-MM-DD",
  "start_time": "HH:MM",
  "end_time": "HH:MM",
  "position": "<primary position for this shift>",
  "is_mission": <boolean - true if working at non-home restaurant>
}}

Generate ALL shifts for 7 days ({week_start} to 6 days later).
Target: ~{len(context['employees']) * 6} total shifts (each employee works 6 days).

Return ONLY the JSON array, no other text."""

    return prompt


async def generate_schedule(week_start: str, options: dict = None) -> dict:
    """Generate a schedule using Claude Agent SDK"""

    # Fetch context from database
    context = fetch_scheduling_context()

    # Build the prompt
    prompt = build_scheduling_prompt(context, week_start, options)

    result = {
        "success": False,
        "week_start": week_start,
        "shifts": [],
        "message": "",
        "raw_response": ""
    }

    try:
        # Use Claude Agent SDK to generate the schedule
        full_response = ""

        async for message in query(
            prompt=prompt,
            options=ClaudeAgentOptions(
                allowed_tools=[],  # No tools needed, just generation
                permission_mode="bypassPermissions",
                max_turns=1,  # Single turn for generation
            )
        ):
            msg_type = type(message).__name__

            if msg_type == 'AssistantMessage':
                if hasattr(message, 'content'):
                    for block in message.content:
                        if hasattr(block, 'text'):
                            full_response += block.text

            elif msg_type == 'ResultMessage':
                if hasattr(message, 'result'):
                    full_response = message.result

        result["raw_response"] = full_response

        # Parse the JSON response
        # Try to extract JSON from the response
        json_start = full_response.find('[')
        json_end = full_response.rfind(']') + 1

        if json_start >= 0 and json_end > json_start:
            json_str = full_response[json_start:json_end]
            shifts = json.loads(json_str)
            result["shifts"] = shifts
            result["success"] = True
            result["message"] = f"Generated {len(shifts)} shifts for week of {week_start}"
        else:
            result["message"] = "Could not extract JSON from response"

    except Exception as e:
        result["message"] = f"Error generating schedule: {str(e)}"

    return result


def validate_schedule(shifts: list, context: dict) -> dict:
    """Validate generated schedule against business rules"""
    from datetime import datetime as dt
    from collections import defaultdict

    issues = []
    warnings = []

    # Build lookup maps
    employees_by_id = {e['id']: e for e in context['employees']}

    # Group shifts by date and restaurant
    shifts_by_day_rest = defaultdict(lambda: {'morning': [], 'afternoon': []})

    for shift in shifts:
        emp_id = shift.get('employee_id')
        rest_id = shift.get('restaurant_id')
        date = shift.get('date')
        start_time = shift.get('start_time', '00:00')

        # Determine shift type
        hour = int(start_time.split(':')[0])
        shift_type = 'morning' if hour < 16 else 'afternoon'

        key = (date, rest_id)
        shifts_by_day_rest[key][shift_type].append({
            **shift,
            'employee': employees_by_id.get(emp_id, {})
        })

    # Check each day/restaurant/shift
    for (date, rest_id), day_shifts in shifts_by_day_rest.items():
        rest_name = 'Hua Hin' if rest_id == 1 else 'Sathorn'

        for shift_type, shift_list in day_shifts.items():
            if not shift_list:
                issues.append(f"{date} {rest_name}: No {shift_type} shift coverage!")
                continue

            # Check seniority
            seniors = [s for s in shift_list if s['employee'].get('seniority') == 'senior']
            if len(seniors) < 1:
                issues.append(f"{date} {rest_name} {shift_type}: No senior employee!")
            elif shift_type == 'afternoon' and len(seniors) < 2:
                # Check if it's a weekend
                try:
                    d = dt.strptime(date, '%Y-%m-%d')
                    if d.weekday() >= 4:  # Friday, Saturday, Sunday
                        warnings.append(f"{date} {rest_name} dinner: Only {len(seniors)} senior (recommend 2 on weekends)")
                except:
                    pass

            # Check kitchen coverage
            kitchen = [s for s in shift_list if 'kitchen' in (s['employee'].get('positions') or [])]
            if len(kitchen) < 1:
                issues.append(f"{date} {rest_name} {shift_type}: No kitchen staff!")

            # Check cashier coverage
            cashier = [s for s in shift_list if 'cashier' in (s['employee'].get('positions') or [])]
            if len(cashier) < 1:
                issues.append(f"{date} {rest_name} {shift_type}: No cashier!")

    # Check individual employee constraints
    hours_by_employee = defaultdict(float)
    days_by_employee = defaultdict(set)

    for shift in shifts:
        emp_id = shift.get('employee_id')
        emp = employees_by_id.get(emp_id, {})
        date = shift.get('date')

        # Check days off
        if emp.get('days_off'):
            try:
                d = dt.strptime(date, '%Y-%m-%d')
                if d.weekday() in emp['days_off']:
                    issues.append(f"{date}: {emp.get('first_name')} scheduled on day off!")
            except:
                pass

        # Track hours
        try:
            start = shift.get('start_time', '00:00')
            end = shift.get('end_time', '00:00')
            sh, sm = map(int, start.split(':'))
            eh, em = map(int, end.split(':'))
            hours = (eh + em/60) - (sh + sm/60)
            if hours < 0:
                hours += 24  # Overnight shift
            hours_by_employee[emp_id] += hours
            days_by_employee[emp_id].add(date)
        except:
            pass

    # Check 48h target
    for emp_id, hours in hours_by_employee.items():
        emp = employees_by_id.get(emp_id, {})
        if emp.get('employment_type') == 'full_time':
            if hours < 40:
                warnings.append(f"{emp.get('first_name')}: Only {hours:.1f}h scheduled (target 48h)")
            elif hours > 52:
                warnings.append(f"{emp.get('first_name')}: {hours:.1f}h scheduled (over 48h limit)")

    return {
        "valid": len(issues) == 0,
        "issues": issues,
        "warnings": warnings,
        "stats": {
            "total_shifts": len(shifts),
            "employees_scheduled": len(hours_by_employee),
            "days_covered": len(set(s.get('date') for s in shifts))
        }
    }


def save_shifts_to_db(shifts: list) -> dict:
    """Save generated shifts to the database"""
    conn = get_db_connection()
    cur = conn.cursor()

    inserted = 0
    errors = []

    for shift in shifts:
        try:
            cur.execute("""
                INSERT INTO shifts (employee_id, restaurant_id, date, start_time, end_time, position, is_mission, status)
                VALUES (%(employee_id)s, %(restaurant_id)s, %(date)s, %(start_time)s, %(end_time)s, %(position)s, %(is_mission)s, 'scheduled')
                ON CONFLICT DO NOTHING
                RETURNING id
            """, shift)
            if cur.fetchone():
                inserted += 1
        except Exception as e:
            errors.append(f"Shift for employee {shift.get('employee_id')} on {shift.get('date')}: {str(e)}")

    conn.commit()
    cur.close()
    conn.close()

    return {
        "inserted": inserted,
        "total": len(shifts),
        "errors": errors
    }


def readjust_schedule_for_absence(absence_id: int) -> dict:
    """Readjust schedule when an absence is approved"""
    conn = get_db_connection()
    cur = conn.cursor()

    # Get absence details
    cur.execute("""
        SELECT a.*, e.first_name, e.restaurant_id, e.positions
        FROM absences a
        JOIN employees e ON a.employee_id = e.id
        WHERE a.id = %s
    """, (absence_id,))
    absence = cur.fetchone()

    if not absence:
        return {"success": False, "error": "Absence not found"}

    # Find shifts that need to be cancelled
    cur.execute("""
        SELECT s.*, e.first_name
        FROM shifts s
        JOIN employees e ON s.employee_id = e.id
        WHERE s.employee_id = %s
        AND s.date BETWEEN %s AND %s
        AND s.status = 'scheduled'
    """, (absence['employee_id'], absence['start_date'], absence['end_date']))

    affected_shifts = cur.fetchall()

    if not affected_shifts:
        cur.close()
        conn.close()
        return {"success": True, "message": "No shifts affected", "cancelled": 0}

    # Cancel the affected shifts
    cur.execute("""
        UPDATE shifts SET status = 'cancelled', notes = 'Cancelled due to approved absence'
        WHERE employee_id = %s
        AND date BETWEEN %s AND %s
        AND status = 'scheduled'
    """, (absence['employee_id'], absence['start_date'], absence['end_date']))

    cancelled_count = cur.rowcount

    # Find replacement candidates for each affected shift
    replacements = []
    for shift in affected_shifts:
        cur.execute("""
            SELECT e.id, e.first_name, e.seniority, e.positions, e.preferred_shift
            FROM employees e
            WHERE e.active = TRUE
            AND e.restaurant_id = %s
            AND e.id NOT IN (
                SELECT employee_id FROM shifts
                WHERE date = %s AND status != 'cancelled'
            )
            AND e.id NOT IN (
                SELECT employee_id FROM absences
                WHERE status = 'approved'
                AND %s BETWEEN start_date AND end_date
            )
            AND (%s = ANY(e.days_off) IS NOT TRUE)
            ORDER BY e.seniority DESC, e.is_mobile DESC
            LIMIT 3
        """, (
            shift['restaurant_id'],
            shift['date'],
            shift['date'],
            shift['date'].weekday() if hasattr(shift['date'], 'weekday') else 0
        ))

        candidates = cur.fetchall()
        replacements.append({
            "date": str(shift['date']),
            "shift_time": f"{shift['start_time']}-{shift['end_time']}",
            "original_employee": shift['first_name'],
            "candidates": [dict(c) for c in candidates]
        })

    conn.commit()
    cur.close()
    conn.close()

    return {
        "success": True,
        "cancelled": cancelled_count,
        "affected_shifts": replacements,
        "message": f"Cancelled {cancelled_count} shifts. Replacement candidates identified."
    }


def readjust_schedule_for_swap(swap_id: int) -> dict:
    """Handle schedule changes after a shift swap is approved"""
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT ssr.*,
               rs.date as requester_date, rs.start_time as requester_start, rs.end_time as requester_end,
               ts.date as target_date, ts.start_time as target_start, ts.end_time as target_end,
               re.first_name as requester_name, te.first_name as target_name
        FROM shift_swap_requests ssr
        LEFT JOIN shifts rs ON ssr.requester_shift_id = rs.id
        LEFT JOIN shifts ts ON ssr.target_shift_id = ts.id
        LEFT JOIN employees re ON ssr.requester_employee_id = re.id
        LEFT JOIN employees te ON ssr.target_employee_id = te.id
        WHERE ssr.id = %s
    """, (swap_id,))

    swap = cur.fetchone()

    if not swap:
        cur.close()
        conn.close()
        return {"success": False, "error": "Swap request not found"}

    cur.close()
    conn.close()

    return {
        "success": True,
        "swap_details": dict(swap),
        "message": "Shift swap processed (shifts already exchanged during approval)"
    }


# Flask API for webhook integration
from flask import Flask, request, jsonify

app = Flask(__name__)


@app.route('/api/generate-schedule', methods=['POST'])
def api_generate_schedule():
    """API endpoint to generate a schedule"""
    data = request.get_json() or {}

    # Default to next Monday if no date provided
    week_start = data.get('week_start')
    if not week_start:
        today = datetime.now()
        days_until_monday = (7 - today.weekday()) % 7
        if days_until_monday == 0:
            days_until_monday = 7
        next_monday = today + timedelta(days=days_until_monday)
        week_start = next_monday.strftime('%Y-%m-%d')

    options = data.get('options', {})
    save_to_db = data.get('save_to_db', False)

    # Run the async generator
    result = asyncio.run(generate_schedule(week_start, options))

    # Optionally save to database
    if save_to_db and result['success']:
        db_result = save_shifts_to_db(result['shifts'])
        result['db_result'] = db_result

    return jsonify(result)


@app.route('/api/scheduling-context', methods=['GET'])
def api_get_context():
    """API endpoint to get current scheduling context"""
    try:
        context = fetch_scheduling_context()
        return jsonify({"success": True, "context": context})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({"status": "ok", "service": "krooster-schedule-agent"})


@app.route('/api/validate-schedule', methods=['POST'])
def api_validate_schedule():
    """Validate a schedule against business rules"""
    data = request.get_json() or {}
    shifts = data.get('shifts', [])

    if not shifts:
        return jsonify({"success": False, "error": "No shifts provided"}), 400

    try:
        context = fetch_scheduling_context()
        validation = validate_schedule(shifts, context)
        return jsonify({"success": True, **validation})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/readjust-for-absence', methods=['POST'])
def api_readjust_absence():
    """Readjust schedule when absence is approved"""
    data = request.get_json() or {}
    absence_id = data.get('absence_id')

    if not absence_id:
        return jsonify({"success": False, "error": "absence_id required"}), 400

    try:
        result = readjust_schedule_for_absence(int(absence_id))
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/readjust-for-swap', methods=['POST'])
def api_readjust_swap():
    """Handle schedule after shift swap approval"""
    data = request.get_json() or {}
    swap_id = data.get('swap_id')

    if not swap_id:
        return jsonify({"success": False, "error": "swap_id required"}), 400

    try:
        result = readjust_schedule_for_swap(int(swap_id))
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/employee-hours', methods=['GET'])
def api_employee_hours():
    """Get weekly hours for all employees"""
    week_start = request.args.get('week_start')

    conn = get_db_connection()
    cur = conn.cursor()

    query = """
        SELECT
            e.id,
            e.first_name,
            e.seniority,
            e.employment_type,
            e.max_hours_per_week,
            COUNT(s.id) as shift_count,
            COALESCE(SUM(
                EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600
            ), 0) as total_hours
        FROM employees e
        LEFT JOIN shifts s ON e.id = s.employee_id
            AND s.status != 'cancelled'
    """

    if week_start:
        query += f" AND s.date >= '{week_start}'::date AND s.date < '{week_start}'::date + INTERVAL '7 days'"

    query += """
        WHERE e.active = TRUE
        GROUP BY e.id, e.first_name, e.seniority, e.employment_type, e.max_hours_per_week
        ORDER BY e.restaurant_id, e.first_name
    """

    cur.execute(query)
    employees = cur.fetchall()

    cur.close()
    conn.close()

    result = []
    for emp in employees:
        hours = float(emp['total_hours'] or 0)
        target = 48 if emp['employment_type'] == 'full_time' else (emp['max_hours_per_week'] or 20)
        result.append({
            "id": emp['id'],
            "name": emp['first_name'],
            "seniority": emp['seniority'],
            "employment_type": emp['employment_type'],
            "hours_scheduled": round(hours, 1),
            "target_hours": target,
            "status": "ok" if abs(hours - target) <= 4 else ("under" if hours < target else "over")
        })

    return jsonify({"success": True, "data": result})


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='Krooster Schedule Generator')
    parser.add_argument('--server', action='store_true', help='Run as API server')
    parser.add_argument('--port', type=int, default=5679, help='Server port')
    parser.add_argument('--week', type=str, help='Week start date (YYYY-MM-DD)')
    parser.add_argument('--save', action='store_true', help='Save shifts to database')

    args = parser.parse_args()

    if args.server:
        print(f"Starting Krooster Schedule Agent on port {args.port}...")
        app.run(host='0.0.0.0', port=args.port, debug=True)
    else:
        # CLI mode - generate schedule
        week_start = args.week
        if not week_start:
            today = datetime.now()
            days_until_monday = (7 - today.weekday()) % 7
            if days_until_monday == 0:
                days_until_monday = 7
            next_monday = today + timedelta(days=days_until_monday)
            week_start = next_monday.strftime('%Y-%m-%d')

        print(f"Generating schedule for week of {week_start}...")
        result = asyncio.run(generate_schedule(week_start))

        if result['success']:
            print(f"\n{result['message']}")
            print(f"\nGenerated {len(result['shifts'])} shifts:")
            print(json.dumps(result['shifts'], indent=2, default=str))

            if args.save:
                print("\nSaving to database...")
                db_result = save_shifts_to_db(result['shifts'])
                print(f"Inserted {db_result['inserted']}/{db_result['total']} shifts")
                if db_result['errors']:
                    print(f"Errors: {db_result['errors']}")
        else:
            print(f"\nError: {result['message']}")
            if result['raw_response']:
                print(f"\nRaw response:\n{result['raw_response'][:500]}...")
