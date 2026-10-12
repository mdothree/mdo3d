#!/bin/bash
# layoffleads weekly WARN refresh (STAGED, not installed). Proposal: ./PROPOSAL.md
# Runs in a DEDICATED clean clone (never a working tree with WIP):
#   LL_HOME=$HOME/mdo3d-ops/layoffleads  (git clone https://github.com/mdothree/layoffleads.git there once)
# Default is a DRY RUN: it refreshes + checks + shows the diff, and commits nothing.
# `--push` commits data/ and pushes main. layoffleads is git-connected to Vercel, so a push IS the prod deploy.
# Installing it with --push needs the Principal's GO (a recurring MDO prod deploy).
set -euo pipefail
export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH
LL_HOME="${LL_HOME:-$HOME/mdo3d-ops/layoffleads}"
LOG_DIR="${LOG_DIR:-$HOME/mdo3d-ops/logs}"; mkdir -p "$LOG_DIR"
LOCK="$LOG_DIR/layoffleads-refresh.lock"
PUSH=0; [ "${1:-}" = "--push" ] && PUSH=1
MAX_DROP_PCT="${MAX_DROP_PCT:-20}"   # refuse if the event count falls by more than this (truncated source guard)

mkdir "$LOCK" 2>/dev/null || { echo "$(date -u +%FT%TZ) another refresh is running; exit"; exit 0; }
trap 'rmdir "$LOCK"' EXIT
cd "$LL_HOME"
[ -z "$(git status --porcelain)" ] || { echo "dirty clone at $LL_HOME; refusing"; exit 2; }
if ! git pull -q --ff-only origin main 2>/dev/null; then
  [ "$PUSH" = 1 ] && { echo "git pull failed (push credential missing?); refusing --push"; exit 4; }
  echo "$(date -u +%FT%TZ) WARN: git pull failed (no read credential on this host); dry run uses clone @ $(git log -1 --format=%h)"
fi

count() { node -e 'const d=require(process.argv[1]);console.log((d.events||d).length)' "$LL_HOME/data/events.json"; }
before=$(count)
[ -f package-lock.json ] && npm ci --silent   # layoffleads has no dependencies today (no lockfile)
npm run -s refresh            # ingest-warn → normalize → build → check (check.mjs exits 1 on failure)
after=$(count)
echo "$(date -u +%FT%TZ) events before=$before after=$after"

if [ "$after" -lt $(( before * (100 - MAX_DROP_PCT) / 100 )) ]; then
  echo "events dropped >${MAX_DROP_PCT}% ($before → $after); not committing"; git checkout -- data; exit 3
fi
if git diff --quiet -- data; then echo "no data change"; exit 0; fi
git --no-pager diff --stat -- data

if [ "$PUSH" = 1 ]; then
  git add data
  git commit -q -m "data: weekly WARN refresh $(date -u +%F) (events $before → $after)"
  git push -q origin HEAD:main
  echo "pushed $(git log -1 --format=%h); Vercel builds from main"
else
  echo "DRY RUN: not committed (pass --push after GO)"; git checkout -- data
fi
