#!/bin/sh
# Ingest-only run: fetch + store filings; no enrichment, no email.
set -eu
cd /app/src
exec python runner.py --ingest --states "${LEADS_INGEST_STATES:-FL,CO,CT}" --lookback "${LEADS_INGEST_LOOKBACK:-3}"
