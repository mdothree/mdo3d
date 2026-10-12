#!/bin/sh
# Manual runs queued by the API (POST /profiles/{id}/run -> run_requests table). Filters the stored
# filings for each queued profile and saves its leads. Email goes out only if LEADS_ENABLE_DELIVERY=1
# (outbound email needs the Principal's OK); with it off, a manual run sends nothing.
set -eu
cd /app/src
exec python runner.py --run-requests
