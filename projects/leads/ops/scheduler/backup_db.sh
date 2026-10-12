#!/bin/sh
# Nightly online backup of the leads SQLite DB (sqlite3 .backup is safe while the API/ingest run).
set -eu
DB="${LEADS_DB_PATH:-/data/leads.db}"
DEST="${LEADS_BACKUP_DIR:-/backups}"
KEEP="${LEADS_BACKUP_KEEP:-14}"
mkdir -p "$DEST"
if [ ! -f "$DB" ]; then
  echo "[backup] no database at $DB yet; skipping"
  exit 0
fi
ts="$(date +%Y%m%d-%H%M%S)"
out="$DEST/leads-$ts.db"
sqlite3 "$DB" ".backup '$out'"
check="$(sqlite3 "$out" 'PRAGMA integrity_check;')"
if [ "$check" != "ok" ]; then
  echo "[backup] integrity_check failed for $out: $check" >&2
  mv "$out" "$out.corrupt"
  exit 1
fi
rows="$(sqlite3 "$out" 'SELECT COUNT(*) FROM filings;' 2>/dev/null || echo 0)"
gzip -f "$out"
# keep the newest $KEEP backups
ls -1t "$DEST"/leads-*.db.gz 2>/dev/null | tail -n +"$((KEEP + 1))" | xargs -r rm -f
date -Iseconds > "$DEST/LAST_BACKUP_OK"
echo "[backup] ok $out.gz filings=$rows"
