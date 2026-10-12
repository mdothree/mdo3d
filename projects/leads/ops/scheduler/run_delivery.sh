#!/bin/sh
# Profile delivery (filter + email CSV per active paid profile). Disabled by default:
# outbound email needs the Principal's per-batch OK. Set LEADS_ENABLE_DELIVERY=1 to enable.
set -eu
if [ "${LEADS_ENABLE_DELIVERY:-0}" != "1" ]; then
  echo "[delivery] disabled (LEADS_ENABLE_DELIVERY!=1); nothing sent"
  exit 0
fi
cd /app/src
exec python runner.py --no-email-lookup
