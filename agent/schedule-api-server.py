#!/usr/bin/env python3
"""
Lightweight HTTP wrapper for claude-schedule-proxy.sh
Runs as a background service to accept schedule generation requests
"""

import subprocess
import json
import os
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROXY_SCRIPT = os.path.join(SCRIPT_DIR, "claude-schedule-proxy.sh")

class ScheduleHandler(BaseHTTPRequestHandler):
    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def do_GET(self):
        parsed = urlparse(self.path)

        if parsed.path == '/health':
            self._send_json({"status": "ok", "service": "krooster-schedule-proxy"})
            return

        self._send_json({"error": "Not found"}, 404)

    def do_POST(self):
        parsed = urlparse(self.path)

        # Read body
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode() if content_length else '{}'

        try:
            data = json.loads(body) if body else {}
        except:
            data = {}

        if parsed.path == '/api/generate-schedule':
            week_start = data.get('week_start', '')

            try:
                result = subprocess.run(
                    [PROXY_SCRIPT, 'generate', week_start],
                    capture_output=True,
                    text=True,
                    timeout=300  # 5 minute timeout
                )

                # Try to parse JSON from output
                try:
                    response = json.loads(result.stdout)
                except:
                    response = {
                        "success": result.returncode == 0,
                        "output": result.stdout,
                        "error": result.stderr if result.returncode != 0 else None
                    }

                self._send_json(response)

            except subprocess.TimeoutExpired:
                self._send_json({"success": False, "error": "Timeout"}, 504)
            except Exception as e:
                self._send_json({"success": False, "error": str(e)}, 500)
            return

        if parsed.path == '/api/readjust-for-absence':
            absence_id = data.get('absence_id')

            if not absence_id:
                self._send_json({"success": False, "error": "absence_id required"}, 400)
                return

            try:
                result = subprocess.run(
                    [PROXY_SCRIPT, 'readjust', str(absence_id)],
                    capture_output=True,
                    text=True,
                    timeout=120
                )

                try:
                    response = json.loads(result.stdout)
                except:
                    response = {
                        "success": result.returncode == 0,
                        "output": result.stdout,
                        "error": result.stderr if result.returncode != 0 else None
                    }

                self._send_json(response)

            except subprocess.TimeoutExpired:
                self._send_json({"success": False, "error": "Timeout"}, 504)
            except Exception as e:
                self._send_json({"success": False, "error": str(e)}, 500)
            return

        self._send_json({"error": "Not found"}, 404)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def log_message(self, format, *args):
        # Suppress default logging
        pass


def run_server(port=5680):
    server = HTTPServer(('0.0.0.0', port), ScheduleHandler)
    print(f"Schedule API server running on port {port}")
    print("Endpoints:")
    print("  GET  /health")
    print("  POST /api/generate-schedule  {week_start: 'YYYY-MM-DD'}")
    print("  POST /api/readjust-for-absence  {absence_id: <id>}")
    server.serve_forever()


if __name__ == '__main__':
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5680
    run_server(port)
