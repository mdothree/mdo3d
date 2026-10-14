#!/usr/bin/env bash
# 04_copy.sh — MDO GO bundle 2026-10-14, item 4 (honest copy) + P1 Ronna.
# Deploys three static surfaces from worktrees that sit on the LIVE branch tip (origin), each with one commit:
#   [A] runwae.com        wt-runwae         branch copy-honest-2026-10-14 = origin/master + 5a18ca1
#   [B] mdo3d.com hub     wt-mdo3d-landing  branch copy-honest-2026-10-14 = origin/main   + 165e5ed
#   [C] P1 Ronna tools    wt-ronna-{leads,companies,contacts,emails,prospects}  = origin/main + 1 commit each
# (ronnascanner.com /pricing -> /#waitlist is ALREADY live: frontend 13423cb, 307. Verified only, not redeployed.)
#
# NOTE: the local checkouts (projects/external/runwae/runwae master, projects/mdo3d/landing main, ronnascanner-* main)
# are BEHIND/diverged from the live branches. Do not deploy from them. This script deploys only the worktrees.
#
# Usage:
#   bash 04_copy.sh check          read-only: live strings before, worktree state, token present
#   bash 04_copy.sh go [A|B|C|all] deploy (vercel --prod, remote build), verify, push the branch (not main)
#   bash 04_copy.sh rollback A|B|C promote the production deployment recorded before the deploy
# Secrets: VERCEL_TOKEN_MDO3 from ~/latarence/secrets/sega_credentials.env (read by variable, never printed).
set -euo pipefail
MODE=${1:-}; PART=${2:-all}
HERE=$(cd "$(dirname "$0")" && pwd)
LOG=$HERE/04_copy.log
TEAM=team_DXUPiQz3KkYmyhAgmT99OQQr
BRANCH=copy-honest-2026-10-14
log(){ echo "$(date -u +%FT%TZ) $*" | tee -a "$LOG"; }
die(){ log "STOP: $*"; exit 1; }
FAIL=0
pass(){ log "  PASS $*"; }
fail(){ log "  FAIL $*"; FAIL=$((FAIL+1)); }

# name|worktree|source repo (for .vercel link)|project id|url|strings that must be ABSENT|strings that must be PRESENT
SITES_A=(
 "runwae-welcome|wt-runwae|$HOME/mdo3d/projects/external/runwae/runwae|prj_rFAMT9ypUzRXrqnQ7Nmf4LobyvQk|https://runwae.com/|We sent you an email;Your guide is on the way;Brands Using Runwae|Your guide is ready;on the list for Runwae updates"
 "runwae-faqs|-|-|-|https://runwae.com/faqs|We sent you an email;we know that Fast Influencer Marketing|built for fast influencer marketing"
 "runwae-subscribe-js|-|-|-|https://runwae.com/runwaejs/subscribe.js|college students;email.php|openGuide"
)
SITES_B=(
 "mdo3d-hub|wt-mdo3d-landing|$HOME/mdo3d/projects/mdo3d/landing|prj_72C9zAo8LYOSfoLoUbgr72oUEiZ8|https://mdo3d.com/|id=\"live-count\";Live platforms;>2024<;Founded;Smart Notes;Focus Timer;Ritual Planner;Research Lens;Lead Alchemist;Outreach Engine;Pipeline Vision;Chrome Companion;Writer Block;Insight Tag;Cipher Key;Career Compass;Next-gen commerce;Next-generation AI-powered commerce|Influencer marketing agreements"
)
SITES_C=()
for t in leads companies contacts emails prospects; do
  case $t in leads) P=prj_yAu3UoR31Lui8pBoJQ6cWfRUYMvM;; companies) P=prj_jKD2smWHBxY9VVSr7LtqxLCKGPUA;; contacts) P=prj_blwtrLTepptBmzJNQQJcr0AvGgG0;;
             emails) P=prj_LgezRpCN6piunNMp7Yf9NKFRYRST;; prospects) P=prj_BafOsN4qOog6KOBlPmFXk76ntrk6;; esac
  SITES_C+=("ronna-$t|wt-ronna-$t|$HOME/mdo3d/projects/ronnascanner/ronnascanner-$t|$P|https://$t.ronnascanner.com/|>RS</text>|data-ronna-live hidden")
done

token(){ set +u; source ~/latarence/secrets/sega_credentials.env >/dev/null 2>&1 || true; set -u
  VT="${VERCEL_TOKEN_MDO3:-}"; [ -n "$VT" ] || die "VERCEL_TOKEN_MDO3 missing"; }

verify(){ # name|wt|src|prj|url|absent|present
  IFS='|' read -r name _ _ _ url absent present <<<"$1"
  local body code; body=$(curl -s -L --max-time 20 -H 'Cache-Control: no-cache' "$url?v=$(date +%s)") || true
  code=$(curl -s -o /dev/null -L -w '%{http_code}' --max-time 20 "$url")
  [ "$code" = 200 ] && pass "$name 200" || fail "$name HTTP $code"
  IFS=';' read -ra A <<<"$absent";  for s in "${A[@]}"; do [ -z "$s" ] && continue; grep -qF -- "$s" <<<"$body" && fail "$name still has: $s" || pass "$name absent: $s"; done
  IFS=';' read -ra P <<<"$present"; for s in "${P[@]}"; do [ -z "$s" ] && continue; grep -qF -- "$s" <<<"$body" && pass "$name has: $s" || fail "$name missing: $s"; done
}

prod_url(){ # current production deployment url for a project id
  curl -s -H "Authorization: Bearer $VT" "https://api.vercel.com/v6/deployments?projectId=$1&teamId=$TEAM&target=production&state=READY&limit=1" \
   | jq -r '.deployments[0].url // empty'; }

deploy_one(){ # entry
  IFS='|' read -r name wt src prj url _ _ <<<"$1"
  [ "$wt" = - ] && return 0
  local d=$HERE/$wt
  [ -d "$d" ] || die "$d missing"
  [ "$(git -C "$d" branch --show-current)" = "$BRANCH" ] || die "$wt not on $BRANCH"
  [ -z "$(git -C "$d" status --porcelain --untracked-files=no)" ] || die "$wt has uncommitted changes"
  mkdir -p "$d/.vercel" && cp "$src/.vercel/project.json" "$d/.vercel/project.json"
  grep -q "$prj" "$d/.vercel/project.json" || die "$wt link is not $prj"
  local prev; prev=$(prod_url "$prj"); echo "$name|$prj|$prev" >> "$HERE/04_copy.prev"
  log "[$name] previous production: ${prev:-<none>} (rollback target)"
  (cd "$d" && vercel deploy --prod --yes --token "$VT" --scope "$TEAM" >>"$LOG" 2>&1) || die "$name deploy failed (rollback: bash $0 rollback)"
  log "[$name] deployed from $(git -C "$d" rev-parse --short HEAD)"
}

push_branch(){ local d=$HERE/$1; git -C "$d" push origin "$BRANCH" >>"$LOG" 2>&1 && log "  pushed $1 $BRANCH (branch only; merge to the production branch is a follow-up, not a deploy)" || log "  push $1 failed (non-fatal)"; }

run_part(){ # $1 = array name (bash 3.2 safe: no namerefs)
  local S=(); eval 'S=("${'"$1"'[@]}")'; local wtlist="" e wt w
  for e in "${S[@]}"; do deploy_one "$e"; IFS='|' read -r _ wt _ <<<"$e"; [ "$wt" != - ] && wtlist="$wtlist $wt"; done
  sleep 20
  for e in "${S[@]}"; do verify "$e"; done
  for w in $wtlist; do push_branch "$w"; done; }

case "$MODE" in
  check)
    token; log "== check (read-only)"
    for e in "${SITES_A[@]}" "${SITES_B[@]}" "${SITES_C[@]}"; do verify "$e"; done
    code=$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' https://ronnascanner.com/pricing); log "  ronnascanner.com/pricing -> $code (want 307 https://ronnascanner.com/#waitlist)"
    for w in wt-runwae wt-mdo3d-landing wt-ronna-{leads,companies,contacts,emails,prospects}; do log "  $w: $(git -C "$HERE/$w" log --oneline -1)"; done
    log "check done: FAIL count is expected >0 before the deploy (the strings are still live)";;
  go)
    token; : >"$HERE/04_copy.prev"
    [ "${GO_CONFIRM:-}" = GO ] || { read -r -p "Deploy honest-copy part(s) $PART to production? type GO: " a; [ "$a" = GO ] || die "not confirmed"; }
    case "$PART" in A) run_part SITES_A;; B) run_part SITES_B;; C) run_part SITES_C;; all) run_part SITES_A; run_part SITES_B; run_part SITES_C;; *) die "part A|B|C|all";; esac
    code=$(curl -s -o /dev/null -w '%{http_code}' https://ronnascanner.com/pricing); [ "$code" = 307 ] && pass "ronna /pricing 307 -> waitlist" || fail "ronna /pricing $code"
    [ "$FAIL" = 0 ] && log "ALL PASS" || { log "$FAIL check(s) failed. Rollback: bash $0 rollback <A|B|C>"; exit 2; };;
  rollback)
    token; [ -f "$HERE/04_copy.prev" ] || die "no 04_copy.prev (nothing deployed by this script)"
    want=${2:-}; [ -n "$want" ] || die "rollback A|B|C"
    case $want in A) pat='^runwae';; B) pat='^mdo3d-hub';; C) pat='^ronna-';; *) die "A|B|C";; esac
    grep -E "$pat" "$HERE/04_copy.prev" | while IFS='|' read -r name prj prev; do
      [ -n "$prev" ] || { log "[$name] no previous url recorded"; continue; }
      vercel promote "https://$prev" --yes --token "$VT" --scope "$TEAM" >>"$LOG" 2>&1 && log "[$name] promoted back to $prev" || log "[$name] promote failed: use the Vercel dashboard > Deployments > $prev > Promote"
    done;;
  *) sed -n 2,17p "$0"; exit 1;;
esac
