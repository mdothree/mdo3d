#!/usr/bin/env bash
# Nightly collect on bigmini2 (staged; only runs if the cron line in bigmini2-cron.staged is installed).
# collect -> validate -> push a review branch -> open a PR. Never merges, never deploys.
set -euo pipefail
cd "$(dirname "$0")/.."
set +u; source "$HOME/.config/frontier-ledger.env" 2>/dev/null || true; set -u
[ -n "${ANTHROPIC_API_KEY:-}" ] || { echo "ANTHROPIC_API_KEY not set; skipping"; exit 0; }
PY=$(command -v python3.12 || command -v python3)
git fetch -q origin && git checkout -q main && git pull -q --ff-only
"$PY" scripts/collect.py --sector quantum --verify-fetch
"$PY" scripts/validate.py --sector quantum
f=$(jq -r '.candidate_file // empty' collection_status.json)
[ -n "$f" ] || { echo "$(date -u +%F) no candidates"; exit 0; }
b="fl/collect-$(date -u +%F)"
git checkout -q -b "$b" && git add data/quantum/candidates collection_status.json
git commit -qm "Frontier Ledger candidates $(date -u +%F) (review before --promote)"
git push -q origin "$b"
command -v gh >/dev/null && gh pr create --title "Frontier Ledger candidates $(date -u +%F)" --body "Review each row against its source, then: python3 scripts/collect.py --promote $f" || echo "pushed $b; open the PR by hand"
git checkout -q main
