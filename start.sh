#!/bin/bash
# Start all Gunny Bags Manager services
# Usage: bash start.sh

echo "🚀 Starting Gunny Bags Manager..."
echo ""

# Start backend
echo "📡 Starting Backend API on :5050..."
cd "$(dirname "$0")/backend" && npm start &
BACKEND_PID=$!
sleep 2

# Start dashboard
echo "🖥️  Starting Dashboard on :3000..."
cd "$(dirname "$0")/dashboard" && npm run dev &
DASH_PID=$!

echo ""
echo "✅ Services started!"
echo "   Backend API:  http://localhost:5050/api/v1"
echo "   Dashboard:    http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait and cleanup
trap "kill $BACKEND_PID $DASH_PID 2>/dev/null; echo 'Stopped.'" SIGINT SIGTERM
wait
