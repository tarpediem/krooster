#!/bin/bash
# Start the schedule API service in background
# This allows claude CLI to be invoked without API key (uses claude's own auth)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="/tmp/krooster-schedule.pid"
LOG_FILE="/tmp/krooster-schedule-server.log"

# Check if already running
if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "Schedule service already running (PID: $(cat "$PID_FILE"))"
    echo "To stop: kill $(cat "$PID_FILE")"
    exit 0
fi

# Start the API server in background
cd "$SCRIPT_DIR"
nohup python3 schedule-api-server.py 5680 > "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"

sleep 1

if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "Schedule service started (PID: $(cat "$PID_FILE"))"
    echo "API available at http://localhost:5680"
    echo ""
    echo "Commands:"
    echo "  tail -f $LOG_FILE  # View logs"
    echo "  kill \$(cat $PID_FILE)  # Stop service"
    echo ""
    echo "Test: curl http://localhost:5680/health"
else
    echo "Failed to start service. Check $LOG_FILE"
    exit 1
fi
