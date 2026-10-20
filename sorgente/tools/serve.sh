#!/bin/bash
# Serve the repo root (the site) on http://localhost:8765 (used by the Playwright tests)
cd "$(dirname "$0")/../.."
curl -s -o /dev/null http://localhost:8765/index.html || { (nohup python3 -m http.server 8765 -d . >/dev/null 2>&1 &); sleep 1.2; }
