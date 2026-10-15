#!/usr/bin/env bash
# 07 legal: mdo3d.com shared legal set (privacy/terms), branch legal-2026-10-15 in wt-mdo3d-landing's repo.
# STAGED 2026-10-15. Nothing deployed. Builds remotely on Vercel (static).
#
#   d8c57d4  privacy: AI-processing disclosure + checkout-email truth      (no fill-ins, deployable now)
#   4cf5c8e  terms:   Delaware clause removed -> [CONFIRM] fill-in         (BLOCKED until the Principal answers)
# Both sit on copy-honest-2026-10-14 (04 B hub copy), so deploying either also ships 04 B.
#
#   bash 07_legal.sh check       read-only: guard status of each commit, live strings
#   bash 07_legal.sh go ai       deploy d8c57d4 (privacy only)                     [GO-gated]
#   bash 07_legal.sh go full     deploy branch tip; REFUSES while any [CONFIRM remains in *.html [GO-gated]
#   bash 07_legal.sh verify
# Filling the governing law: edit terms.html on legal-2026-10-15 (replace the <p class="fill-in"> line), commit, rerun check.
# Rollback: fix forward; a promote back needs ROLLBACK_OK=principal (2026-10-13 rule).
# Secrets: VERCEL_TOKEN_MDO3 from ~/latarence/secrets/sega_credentials.env (read by variable, never printed).
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$HERE/wt-mdo3d-landing
SRC=$HOME/mdo3d/projects/mdo3d/landing
PRJ=prj_72C9zAo8LYOSfoLoUbgr72oUEiZ8
TEAM=team_DXUPiQz3KkYmyhAgmT99OQQr
BRANCH=legal-2026-10-15
AI_COMMIT=d8c57d4
LOG=$HERE/07_legal.log
log(){ echo "$(date -u +%FT%TZ) $*" | tee -a "$LOG"; }
die(){ log "STOP: $*"; exit 1; }

guard(){ # $1 = commit; non-zero while a fill-in remains
  local hits; hits=$(git -C "$REPO" grep -n "\[CONFIRM" "$1" -- '*.html' || true)
  if [ -n "$hits" ]; then echo "$hits" | sed 's/^/  fill-in: /' | cut -c1-160; return 1; fi; return 0; }

check(){
  git -C "$REPO" rev-parse -q --verify "$BRANCH" >/dev/null || die "branch $BRANCH missing"
  guard "$AI_COMMIT" && log "ai   ($AI_COMMIT): guard PASS" || log "ai   ($AI_COMMIT): guard FAIL"
  guard "$BRANCH" && log "full ($BRANCH): guard PASS" || log "full ($BRANCH): guard FAIL (Principal decision pending)"
  curl -s https://mdo3d.com/terms | grep -q "State of Delaware" && log "live terms still say Delaware" || log "live terms: no Delaware"
  curl -s https://mdo3d.com/privacy | grep -q 'id="ai"' && log "live privacy has AI section" || log "live privacy: no AI section yet"
}

deploy(){ # $1 = ref
  guard "$1" || die "fill-ins remain in $1; not deploying"
  [ "${CONFIRM:-}" = GO ] || { read -r -p "Type GO to deploy mdo3d.com legal pages from $1: " a; [ "$a" = GO ] || die aborted; }
  set +u; source ~/latarence/secrets/sega_credentials.env >/dev/null 2>&1 || true; set -u
  local VT="${VERCEL_TOKEN_MDO3:-}"; [ -n "$VT" ] || die "VERCEL_TOKEN_MDO3 missing"
  local d; d=$(mktemp -d "$HERE/.07_legal_XXXX")
  git -C "$REPO" worktree add -q --detach "$d" "$1"
  mkdir -p "$d/.vercel" && cp "$SRC/.vercel/project.json" "$d/.vercel/project.json"
  grep -q "$PRJ" "$d/.vercel/project.json" || die "link is not $PRJ"
  local prev; prev=$(curl -s -H "Authorization: Bearer $VT" "https://api.vercel.com/v6/deployments?projectId=$PRJ&teamId=$TEAM&target=production&state=READY&limit=1" | jq -r '.deployments[0].url // empty')
  echo "mdo3d-hub|$PRJ|$prev" >> "$HERE/07_legal.prev"; log "previous production: ${prev:-<none>}"
  (cd "$d" && vercel deploy --prod --yes --token "$VT" --scope "$TEAM" >>"$LOG" 2>&1) || die "deploy failed"
  log "deployed $(git -C "$d" rev-parse --short HEAD)"
  git -C "$REPO" worktree remove --force "$d"
  git -C "$REPO" push origin "$BRANCH" >>"$LOG" 2>&1 && log "pushed $BRANCH (branch only)" || log "push failed (non-fatal)"
  verify
}

verify(){
  local p t; p=$(curl -s -L "https://mdo3d.com/privacy?v=$(date +%s)"); t=$(curl -s -L "https://mdo3d.com/terms?v=$(date +%s)")
  grep -q 'id="ai"' <<<"$p" && log "PASS privacy AI section" || log "FAIL privacy AI section missing"
  grep -q "We do not email the reading itself" <<<"$p" && log "PASS checkout-email line" || log "FAIL checkout-email line"
  grep -q "\[CONFIRM" <<<"$p$t" && log "FAIL a fill-in is live" || log "PASS no fill-in live"
}

case "${1:-check}" in
  check) check;;
  go) case "${2:-}" in ai) deploy "$AI_COMMIT";; full) deploy "$BRANCH";; *) die "go ai|full";; esac;;
  verify) verify;;
  *) echo "usage: $0 check | go ai|full | verify"; exit 2;;
esac
