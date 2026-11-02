#!/usr/bin/env bash
cd "$(dirname "$0")"
PORT=8080
echo "Starting CrediPulse Personal Finance & Peer Lending PWA..."
echo "Open in browser: http://localhost:$PORT"
open "http://localhost:$PORT"
python3 -m http.server $PORT
