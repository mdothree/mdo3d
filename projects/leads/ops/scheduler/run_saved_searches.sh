#!/bin/sh
# Saved-search weekly email (GET/POST /v1/saved-searches). Disabled by default: outbound email needs
# the Principal's per-batch OK. With LEADS_ENABLE_DELIVERY=1, each saved search that last ran 7+ days
# ago is emailed the filings first seen since then (states re-checked against the user's plan).
set -eu
if [ "${LEADS_ENABLE_DELIVERY:-0}" != "1" ]; then
  echo "[saved] disabled (LEADS_ENABLE_DELIVERY!=1); nothing sent"
  exit 0
fi
cd /app/src
exec python runner.py --saved-searches
