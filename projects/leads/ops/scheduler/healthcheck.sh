#!/bin/sh
# Healthy when: the DB opens and answers, and (once an ingest has run) the last ingest is < 30h old.
set -eu
DB="${LEADS_DB_PATH:-/data/leads.db}"
STATUS="${LEADS_DATA_DIR:-/data/raw}/ingest_status.json"
if [ -f "$DB" ]; then
  sqlite3 "$DB" 'SELECT 1;' >/dev/null || { echo "db unreadable"; exit 1; }
fi
if [ -f "$STATUS" ]; then
  age=$(( $(date +%s) - $(stat -c %Y "$STATUS") ))
  if [ "$age" -gt 108000 ]; then
    echo "last ingest ${age}s ago (> 30h)"
    exit 1
  fi
fi
exit 0
