#!/bin/bash
# Move to project directory
cd "/Users/harshitdubey/WorkSpace/guitar-dashboard"

# Set path for node/npm
export PATH="/usr/local/bin:$PATH"

echo "🎸 Initializing JustinGuitar Progress Dashboard..."
echo "------------------------------------------------"
echo "• Cleaning active ports 3001 and 5173..."
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null

echo "• Launching API server & Frontend client..."
echo "• The dashboard will open in your browser automatically."
echo "• Click 'Stop' in the dashboard to save and exit cleanly."
echo "------------------------------------------------"

# Auto-open browser in 3 seconds once dev starts
(sleep 3.5 && open "http://localhost:5173") &

# Run concurrently with --kill-others
npm run dev

# Once npm run dev exits (triggered by Stop button), auto-close this terminal tab/window
echo "Server stopped. Closing terminal window..."
osascript -e 'tell application "Terminal" to close (every window whose name contains "GuitarDashboard.command")' &
exit 0
