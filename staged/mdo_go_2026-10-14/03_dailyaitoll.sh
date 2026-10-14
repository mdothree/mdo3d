#!/usr/bin/env bash
# 03_dailyaitoll.sh: Daily AI Toll data-integrity fix (MDO GO 2026-10-14, P0 #3)
#
# WHAT IT CHANGES (dailyaitoll.com, deployed by Vercel's git integration on push to main;
# /api/health reports the deployed commit):
#   - Paid CSV (web/api/_data/events.csv, the file /api/data-download streams while
#     FEATURE_USE_BLOB_DATASET is off; /api/health said blob "not_used" on 2026-10-14):
#     undisclosed counts are null, not 5,000; Oracle Sep 16 is merged into the Sep 14 round;
#     the "21,000 over 12 months" period total is flagged and left out of the sum; duplicate IDs
#     are reassigned; 13 collector-skipped duplicate rows are excluded. One row per event, plus
#     the columns jobs_counted_in_total, flags and merged_report_ids.
#   - Headline: 290,574 -> 263,974 jobs (it moves with each day's collection). Labor hours are
#     labelled "Labor hours, est. / jobs x 2,080 h/yr", derived exactly (604.3M -> ~549.1M).
#   - Collector (scripts/run_toll.py): near-duplicate rule (same company, 14 days, count within
#     15% or undisclosed); undisclosed -> null; period totals rejected; only accepted events are
#     appended; totals recomputed from events.jsonl after every run (no drift).
#   - Daily pages regenerated (undisclosed shown as "undisclosed"; re-reports removed).
#
# SOURCE: branch data-integrity-2026-10-14 (commit 984bedf) in
#   ~/mdo3d/projects/external/dailyaitoll, based on origin/main 299bfec.
#   The daily cron commits data to origin/main every night, so this script does NOT push that
#   commit as-is. It rebuilds on the current origin/main: it takes the code files from the
#   branch, re-runs the deterministic pass on today's data, then commits and pushes.
#   Local `main` there is 3 commits ahead of origin (someone else's docs). It is left alone.
#
# GATE: MDO production deploy. Run only after the Principal's GO. No Stripe calls are made.
# ROLLBACK: see the bottom of this file.
set -euo pipefail

REPO="$HOME/mdo3d/projects/external/dailyaitoll"
BRANCH="data-integrity-2026-10-14"
BASE="299bfec"
WT="$(mktemp -d /tmp/dat-go.XXXXXX)"
SITE="https://dailyaitoll.com"
CODE_FILES=(scripts/data_integrity.py scripts/run_toll.py scripts/export_events_csv.py
            scripts/generate_daily_pages.py tests/test_data_integrity.py web/index.html)

log() { printf '\n== %s\n' "$*"; }
cleanup() { git -C "$REPO" worktree remove --force "$WT" >/dev/null 2>&1 || true; }
trap cleanup EXIT

log "0. Pre-checks"
command -v python3 >/dev/null
git -C "$REPO" rev-parse --verify "$BRANCH" >/dev/null
git -C "$REPO" fetch -q origin
PREV_LIVE="$(curl -fsS "$SITE/api/health" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("commit") or "")')"
echo "live commit before: $PREV_LIVE"
echo "$PREV_LIVE" > "$HOME/mdo3d/staged/mdo_go_2026-10-14/.03_prev_live_commit"

# The dataset a buyer receives depends on FEATURE_USE_BLOB_DATASET (names only, never values).
if command -v vercel >/dev/null 2>&1; then
  (cd "$REPO/web" && vercel env ls production 2>/dev/null | awk '{print $1}' | grep -E '^FEATURE_USE_BLOB_DATASET$' \
     && echo "WARN: FEATURE_USE_BLOB_DATASET exists in production; check its value in the dashboard. If it is 'true', step 5 must upload the blob." \
     || echo "FEATURE_USE_BLOB_DATASET not set in production: buyers get web/api/_data/events.csv (this commit).")
fi
curl -fsS "$SITE/api/health" | grep -q '"blob":"not_used"' \
  && echo "health: blob not_used (bundled CSV is what buyers download)" \
  || echo "WARN: health reports blob in use; run step 5 (blob upload)."

# The code files must not have changed on origin since the branch base, or the copy below
# would overwrite someone's newer work.
if ! git -C "$REPO" diff --quiet "$BASE" origin/main -- "${CODE_FILES[@]}"; then
  echo "ABORT: origin/main changed ${CODE_FILES[*]} since $BASE. Rebase $BRANCH by hand." >&2
  exit 1
fi

log "1. Build on current origin/main"
git -C "$REPO" worktree add -q --detach "$WT" origin/main
cd "$WT"
git checkout "$BRANCH" -- "${CODE_FILES[@]}"
python3 scripts/data_integrity.py --write
python3 scripts/data_integrity.py --check
python3 scripts/export_events_csv.py
python3 scripts/generate_daily_pages.py >/dev/null

log "2. Local verification"
python3 - <<'PY'
import csv, json, collections
r = list(csv.DictReader(open("web/api/_data/events.csv")))
ids = collections.Counter(x["id"] for x in r)
assert not [k for k, v in ids.items() if v > 1], "duplicate ids in paid CSV"
counted = sum(int(x["jobs"]) for x in r if x["jobs_counted_in_total"] == "yes")
roll = json.load(open("web/data/daily_rollup.json"))
assert counted == roll["totals"]["jobs"], (counted, roll["totals"]["jobs"])
assert roll["totals"]["labor_hours"] == roll["totals"]["jobs"] * 2080
assert not any("21,000 employees over 12 months" in x["headline"] and x["jobs_counted_in_total"] == "yes" for x in r)
assert not any("undisclosed" in x["headline"].lower() and x["jobs"] not in ("",) for x in r)
print(f"OK: {len(r)} rows, unique ids, headline {counted:,} = CSV counted sum")
PY
grep -q 'Labor hours, est.' web/index.html
# Same tests the daily workflow runs (pytest on CI). Run here only where pytest is available.
if python3 -c 'import pytest' 2>/dev/null; then python3 -m pytest -q tests/test_data_integrity.py tests/test_dedup.py tests/test_parse_response.py; fi
NEW_JOBS="$(python3 -c 'import json; print(json.load(open("web/data/daily_rollup.json"))["totals"]["jobs"])')"

log "3. Commit and push to main (this deploys via Vercel)"
git add -A scripts tests data web
git commit -q -m "data-integrity: null undisclosed counts, merge Oracle re-reports, period totals out of the sum, unique ids

Rebuilt on origin/main from $BRANCH (984bedf). Headline jobs now ${NEW_JOBS}.
Labor hours labelled as an estimate (jobs x 2,080 h/yr).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
NEW_SHA="$(git rev-parse HEAD)"
git push origin HEAD:main
echo "pushed $NEW_SHA"

log "4. Wait for the deploy, then verify live"
for i in $(seq 1 40); do
  LIVE="$(curl -fsS "$SITE/api/health" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("commit") or "")' || true)"
  [ "${LIVE:0:7}" = "${NEW_SHA:0:7}" ] && break
  # The generate-daily-pages workflow may add a follow-up commit on top; accept a descendant.
  if [ -n "$LIVE" ] && git -C "$REPO" fetch -q origin && git -C "$REPO" merge-base --is-ancestor "$NEW_SHA" "$LIVE" 2>/dev/null; then break; fi
  sleep 15
done
echo "live commit: $LIVE"
curl -fsS "$SITE/" | grep -q 'Labor hours, est.' && echo "OK label 'Labor hours, est.' live" || { echo "FAIL label missing"; exit 1; }
LIVE_JOBS="$(curl -fsS "$SITE/data/daily_rollup.json" | python3 -c 'import sys,json; print(json.load(sys.stdin)["totals"]["jobs"])')"
echo "live headline jobs: $LIVE_JOBS (expected $NEW_JOBS)"
[ "$LIVE_JOBS" = "$NEW_JOBS" ] || { echo "FAIL headline mismatch"; exit 1; }
CODE="$(curl -s -o /dev/null -w '%{http_code}' "$SITE/api/data-download")"
[ "$CODE" = "400" ] && echo "OK /api/data-download without session -> 400" || { echo "FAIL data-download -> $CODE"; exit 1; }
CODE="$(curl -s -o /dev/null -w '%{http_code}' -L "$SITE/data/events.csv")"
[ "$CODE" = "400" ] && echo "OK /data/events.csv is not public (-> 400)" || echo "WARN /data/events.csv -> $CODE"
curl -fsS "$SITE/api/health" | grep -q '"ok":true' && echo "OK health"

log "5. (Only if FEATURE_USE_BLOB_DATASET=true in production) upload the corrected blob"
echo "Not needed while health says blob not_used. Otherwise, from $WT/web with BLOB_READ_WRITE_TOKEN in env:"
echo "  (cd $WT/web && npm ci) && node $WT/scripts/upload_dataset_blob.js"

log "DONE. A paid test download (Stripe test mode) is the final check: buy the Journalist tier in test mode and confirm the CSV has the jobs_counted_in_total column."

# ROLLBACK
#   Fastest: Vercel instant rollback to the previous production deployment:
#     (cd ~/mdo3d/projects/external/dailyaitoll/web && vercel rollback)    # or the dashboard's "Promote" button
#     previous live commit is saved in staged/mdo_go_2026-10-14/.03_prev_live_commit
#   Durable: git revert <NEW_SHA> && git push origin HEAD:main  (do it from a fresh worktree on origin/main).
#     Note: a revert restores the incorrect data and the unlabelled 604.3M figure.
