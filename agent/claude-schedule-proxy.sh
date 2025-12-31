#!/bin/bash
# Claude Code Schedule Proxy
# Uses claude CLI to generate schedules without needing API key
# The claude CLI handles its own authentication

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/tmp/krooster-schedule-proxy.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
}

# Parse arguments
ACTION="${1:-generate}"
WEEK_START="${2:-}"

case "$ACTION" in
    generate)
        if [ -z "$WEEK_START" ]; then
            # Default to next Monday
            WEEK_START=$(date -d "next monday" +%Y-%m-%d 2>/dev/null || date -v+monday +%Y-%m-%d)
        fi

        log "Generating schedule for week of $WEEK_START"

        PROMPT="You are working in the krooster project at $PROJECT_DIR.
Generate a weekly schedule for the week starting $WEEK_START for Kosmo restaurant (restaurant_id=2) only.

Connect to PostgreSQL: host=localhost, port=5432, database=planning, user=planning, password=qsIbK5BjdoMDB1rlFh49

STAFFING REQUIREMENTS per shift (13 staff total to ensure 48h/week for all):
- 3 kitchen staff
- 1 cashier
- 3 bar staff
- 5 service staff
- 1 steward
- Minimum 1 senior employee per shift

SHIFT TIMES (8 hours each):
- Morning: 10:00-18:00
- Evening: 16:30-00:30

HOURS:
- Each full-time employee MUST work 48 hours/week (6 shifts x 8h)
- break_duration = 30 minutes

CONSTRAINTS:
1. Query employees table to get all active Kosmo employees (restaurant_id=2) with seniority, positions, days_off, preferred_shift
2. Query absences for approved leave during that week - DO NOT schedule employees on leave
3. Query missions for active missions - DO NOT schedule employees on mission at Kosmo (they work at destination)
4. Respect days_off (0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun)
5. Try to respect preferred_shift (morning/afternoon) but not mandatory if understaffed
6. Fill evening shifts more if needed to reach 48h/week for each employee

INSERT the shifts into the shifts table with status='scheduled'.
Return a JSON summary with: {success: true, week: '$WEEK_START', shifts_created: <count>, hours_per_employee: {...}}"

        cd "$PROJECT_DIR"
        RESULT=$(claude -p --dangerously-skip-permissions --output-format json "$PROMPT" 2>&1)

        log "Result: $RESULT"
        echo "$RESULT"
        ;;

    readjust)
        ABSENCE_ID="$2"
        if [ -z "$ABSENCE_ID" ]; then
            echo '{"success": false, "error": "absence_id required"}'
            exit 1
        fi

        log "Readjusting schedule for absence $ABSENCE_ID"

        PROMPT="You are working in the krooster project at $PROJECT_DIR.
Readjust the schedule for approved absence ID $ABSENCE_ID.

Connect to PostgreSQL: host=localhost, port=5432, database=planning, user=planning, password=qsIbK5BjdoMDB1rlFh49

1. Get the absence details (employee_id, start_date, end_date)
2. Cancel any scheduled shifts for that employee during that period (UPDATE shifts SET status='cancelled')
3. Find replacement candidates for each cancelled shift
4. Return a JSON summary of what was done"

        cd "$PROJECT_DIR"
        RESULT=$(claude -p --dangerously-skip-permissions --output-format json "$PROMPT" 2>&1)

        log "Result: $RESULT"
        echo "$RESULT"
        ;;

    *)
        echo '{"success": false, "error": "Unknown action. Use: generate [week_start] or readjust [absence_id]"}'
        exit 1
        ;;
esac
