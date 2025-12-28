#!/bin/bash
# Krooster - Stop Script

cd "$(dirname "$0")"

echo "🛑 Stopping Krooster..."
podman-compose down
echo "✅ Stopped."
