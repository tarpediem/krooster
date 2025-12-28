#!/bin/bash
# Krooster - Startup Script
# Kosmo Kompany Scheduling System

cd "$(dirname "$0")"

echo "🍽️  Starting Krooster..."
echo ""

podman-compose up -d

echo ""
echo "⏳ Waiting for services..."
sleep 5

echo ""
echo "✅ Krooster is running!"
echo ""
echo "   Frontend:  http://localhost:3000"
echo "   n8n:       http://localhost:5678"
echo "   NocoDB:    http://localhost:8080"
echo ""
echo "   Kosmo (Bangkok) & A la mer (Hua Hin)"
echo ""
