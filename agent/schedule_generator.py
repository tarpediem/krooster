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

    return {
        "employees": [dict(e) for e in employees],
        "restaurants": [dict(r) for r in restaurants],
        "rules": rules,
        "existing_shifts": [dict(s) for s in existing_shifts],
        "absences": [dict(a) for a in absences],
        "missions": [dict(m) for m in missions],
        "pending_swaps": [dict(s) for s in pending_swaps],
    }


def build_scheduling_prompt(context: dict, week_start: str, options: dict = None) -> str:
    """Build the prompt for schedule generation"""

    options = options or {}

    # Format employees
    employees_text = []
    senior_count = 0
    junior_count = 0
    for e in context['employees']:
        name = f"{e['first_name']} {e['last_name']}".strip() or f"Employee {e['id']}"
        rest = e['restaurant_name'] or 'Unassigned'
        positions = ', '.join(e['positions'] or []) or 'General'
        emp_type = {'full_time': 'FT', 'part_time': 'PT', 'extra': 'EX'}.get(e['employment_type'], 'FT')
        shift_pref = {'morning': 'AM', 'afternoon': 'PM', 'flexible': 'Flex'}.get(e['preferred_shift'], 'Flex')
        seniority = e.get('seniority', 'junior')
        seniority_label = 'SR' if seniority == 'senior' else 'JR'
        if seniority == 'senior':
            senior_count += 1
        else:
            junior_count += 1
        days_off_str = ''
        if e['days_off']:
            days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
            days_off_str = f", Off: {','.join(days[d] for d in e['days_off'])}"
        mobile = ', Mobile' if e['is_mobile'] else ''
        max_hrs = f", Max {e['max_hours_per_week']}h/w" if e['max_hours_per_week'] else ''

        employees_text.append(
            f"  - ID:{e['id']} {name} ({rest}, {emp_type}, {seniority_label}, {shift_pref}, {positions}{mobile}{days_off_str}{max_hrs})"
        )

    # Format restaurants
    restaurants_text = []
    for r in context['restaurants']:
        closed = f", Closed: {r['closed_dates']}" if r.get('closed_dates') else ""
        restaurants_text.append(
            f"  - ID:{r['id']} {r['name']} ({r['location']}), Hours: {r['opening_hours']}-{r['closing_hours']}{closed}"
        )

    # Format absences
    absences_text = []
    for a in context['absences']:
        emp = next((e for e in context['employees'] if e['id'] == a['employee_id']), None)
        name = f"{emp['first_name']} {emp['last_name']}" if emp else f"Employee {a['employee_id']}"
        absences_text.append(f"  - {name}: {a['start_date']} to {a['end_date']} ({a['type']})")

    # Format missions
    missions_text = []
    for m in context['missions']:
        emp = next((e for e in context['employees'] if e['id'] == m['employee_id']), None)
        name = f"{emp['first_name']} {emp['last_name']}" if emp else f"Employee {m['employee_id']}"
        dest = next((r['name'] for r in context['restaurants'] if r['id'] == m['destination_restaurant_id']), 'Unknown')
        missions_text.append(f"  - {name} -> {dest}: {m['start_date']} to {m['end_date']}")

    rules = context['rules']

    prompt = f"""Generate a weekly schedule for the week starting {week_start}.

RESTAURANTS:
{chr(10).join(restaurants_text)}

EMPLOYEES ({len(context['employees'])} active, {senior_count} senior, {junior_count} junior):
Legend: FT=Full-time, PT=Part-time, EX=Extra, SR=Senior, JR=Junior, AM=Morning pref, PM=Afternoon pref
{chr(10).join(employees_text)}

APPROVED ABSENCES:
{chr(10).join(absences_text) if absences_text else '  None'}

ACTIVE MISSIONS (employee working at other restaurant):
{chr(10).join(missions_text) if missions_text else '  None'}

SHIFT SYSTEM:
- TWO shifts per day per restaurant: MORNING (open-16:00) and AFTERNOON (16:00-close)
- A la mer (Hua Hin): 11:00-23:00
- Kosmo (Bangkok): 10:30-00:30

RULES:
- Max shift duration: {rules.get('max_shift_hours', 8)} hours
- Mandatory break: {rules.get('min_break_duration', 30)} min for shifts > {rules.get('min_break_threshold', 5)}h
- Min rest between shifts: {rules.get('min_rest_between_shifts', 11)} hours
- Min employees per shift: {rules.get('min_employees_per_day', 3)}
- Max hours per week: {rules.get('max_hours_per_week', 48)}h
- SENIORITY: Each shift MUST have at least 1 senior (SR) employee, preferably 2

CONSTRAINTS:
- NEVER schedule employees on their days off
- Respect shift preferences (AM/PM) when possible
- Part-time and Extra employees: respect max_hours_per_week
- Mobile employees can work at either restaurant
- Non-mobile employees only at their assigned restaurant
- If an employee is on mission, schedule them at the destination restaurant

OUTPUT FORMAT:
Return a JSON array of shifts. Each shift must have:
{{
  "employee_id": <int>,
  "restaurant_id": <int>,
  "date": "YYYY-MM-DD",
  "start_time": "HH:MM",
  "end_time": "HH:MM",
  "position": "<position>",
  "is_mission": <boolean>
}}

Generate shifts for 7 days starting from {week_start}.
Ensure each restaurant has adequate coverage for both morning and afternoon shifts.
Balance workload fairly among employees.

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
