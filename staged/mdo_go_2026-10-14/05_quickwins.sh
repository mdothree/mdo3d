#!/usr/bin/env bash
# 05_quickwins.sh — MDO GO bundle 2026-10-14, P1 quick wins. Nothing here has run; it runs only after the Principal's GO.
#
# Every change sits in a worktree under this folder, on a branch cut from the LIVE branch tip (origin), one or two commits each.
# The laptop checkouts under ~/mdo3d/projects are BEHIND/diverged from origin; never deploy from them.
#
#   part  surface                              worktree        repo branch -> production branch   deploy method
#   [P]   promptsforbusiness.com               wt-p1-pfb       mdo-go-2026-10-14 -> main          git push (Vercel git integration)
#   [L]   layoffleads.com daily data job       wt-p1-ll        mdo-go-2026-10-14 -> main          git push (+ GitHub Action enable)
#   [D]   runes / iching / astrology           wt-p1-{runes,iching,astrology}  -> master          git push
#   [D]   fengshui / pastlife (Next.js)        wt-p1-{fengshui,pastlives}      -> main            git push (remote Next build on Vercel)
#   [D]   oracle / tarot / dreams / numerology wt-p1-top (monorepo mdothree/mdo3d, branch mdo-go-2026-10-14-p1-divination)
#                                                                                                  vercel deploy --prod (CLI, per app dir)
#   [G]   guidance.mdo3d.com                   wt-p1-top projects/mdo3d/guidance                  vercel deploy --prod (project guidance-mdo3d)
#   [N]   names.mdo3d.com                      wt-p1-names     mdo-go-2026-10-14 -> main          git push (remote Next build)
#   [R]   RIGOR footer + salary contrast       ships with 01_rigor.sh `tools` (same commits); verify only here
#   RONNA → see 04_copy.sh part C.
#
# Why git push for the per-app repos (04_copy.sh deploys by CLI and pushes a side branch): these repos are Vercel
# git-integrated on their production branch, so a CLI-only deploy would be silently undone by the next push to main
# (the LayoffLeads daily job pushes every day). Pushing the fast-forward IS the deploy and keeps git == production.
# The monorepo apps deploy by CLI and push their branch only (merging the monorepo branch to main is a follow-up).
#
# Usage:
#   bash 05_quickwins.sh check              read-only: worktrees clean + fast-forwardable, links, live strings (FAILs expected pre-deploy)
#   bash 05_quickwins.sh go [P|L|D|G|N|all]  deploy, wait for READY, verify
#   bash 05_quickwins.sh rollback <name>    promote the production deployment recorded before the deploy
#                                           (Principal rule 2026-10-13: no revert/rollback without his OK; ask first)
# Secrets: VERCEL_TOKEN_MDO3 from ~/latarence/secrets/sega_credentials.env (read by variable, never printed).
# Git pushes use the credentials already configured for each remote (or `gh auth setup-git` for the mdothree account).
set -euo pipefail
MODE=${1:-}; PART=${2:-all}
HERE=$(cd "$(dirname "$0")" && pwd)
LOG=$HERE/05_quickwins.log
PREV=$HERE/05_quickwins.prev
TEAM=team_DXUPiQz3KkYmyhAgmT99OQQr
log(){ echo "$(date -u +%FT%TZ) $*" | tee -a "$LOG"; }
die(){ log "STOP: $*"; exit 1; }
FAIL=0
pass(){ log "  PASS $*"; }
fail(){ log "  FAIL $*"; FAIL=$((FAIL+1)); }

token(){ set +u; source ~/latarence/secrets/sega_credentials.env >/dev/null 2>&1 || true; set -u
  VT="${VERCEL_TOKEN_MDO3:-}"; [ -n "$VT" ] || die "VERCEL_TOKEN_MDO3 missing"; }

# ---------- per-app git repos: name|worktree|production branch|vercel project id|source dir with .vercel (info) ----------
GIT_P=( "pfb|wt-p1-pfb|main|prj_TeEtN8Fe2PozD6AC40WeLWf3Yo0p" )
GIT_L=( "layoffleads|wt-p1-ll|main|prj_Y18cgYEKe4VHbvOQH18A5P9JdsEc" )
GIT_D=( "runes|wt-p1-runes|master|prj_LTVrZcxF8jS15iQM1fQK5hRBzzZe"
        "iching|wt-p1-iching|master|prj_2ssivRpn3jtfroJuLfcJyD00jW8q"
        "astrology|wt-p1-astrology|master|prj_QNApwFAgTo92TZdB2BjsyiQFlOrB"
        "fengshui|wt-p1-fengshui|main|prj_7vadJLsdbHfNvVV0YgtOwkhuYC0t"
        "pastlife|wt-p1-pastlives|main|prj_MMF3U5qvYdFKgUxdfUQtIV9MvfCE" )
GIT_N=( "names|wt-p1-names|main|prj_CDrIkBUyURvrroa9hdaDnOlTlRRx" )
BRANCH=mdo-go-2026-10-14

# ---------- monorepo apps (CLI): name|dir inside wt-p1-top|project id (or name: for vercel link) ----------
TOP=wt-p1-top; TOP_BRANCH=mdo-go-2026-10-14-p1-divination
CLI_D=( "oracle|projects/divination/oracle/oracle-cards|prj_MrNYEazf5FtQ2PgLdsR7idsfUi4S"
        "tarot|projects/divination/tarot/tarot-cards|prj_GbfPw6RYZnFSLa9NgMelZBlZIrgT"
        "dreams|projects/divination/dreams/dream-interpreter|prj_298cErEHWz3cDqMw2ZE2OKZZtuGJ"
        "numerology|projects/divination/numerology/numerology-app|prj_PrcYzvt0qPXvf49Glqzysh28uuM1" )
CLI_G=( "guidance|projects/mdo3d/guidance|name:guidance-mdo3d" )

prod_url(){ # $1 project id -> current READY production deployment host
  curl -s -H "Authorization: Bearer $VT" "https://api.vercel.com/v6/deployments?projectId=$1&teamId=$TEAM&target=production&state=READY&limit=1" \
   | jq -r '.deployments[0].url // empty'; }

wait_sha(){ # $1 project id, $2 commit sha -> wait until a production deployment of that sha is READY (max ~10 min)
  local i st
  for i in $(seq 1 60); do
    st=$(curl -s -H "Authorization: Bearer $VT" "https://api.vercel.com/v6/deployments?projectId=$1&teamId=$TEAM&target=production&limit=10" \
      | jq -r --arg s "$2" '[.deployments[] | select(.meta.githubCommitSha == $s)][0].state // "PENDING"')
    case "$st" in READY) return 0;; ERROR|CANCELED) log "  deployment of $2 is $st"; return 1;; esac
    sleep 10
  done; log "  timed out waiting for $2"; return 1; }

ff_ok(){ # $1 worktree, $2 production branch: origin/<branch> must be an ancestor of HEAD
  git -C "$HERE/$1" fetch -q origin "$2" 2>/dev/null || { sleep 3; git -C "$HERE/$1" fetch -q origin "$2"; } || return 2
  git -C "$HERE/$1" merge-base --is-ancestor "origin/$2" HEAD; }

deploy_git(){ # entry
  IFS='|' read -r name wt pb prj <<<"$1"
  local d=$HERE/$wt
  [ -d "$d" ] || die "$d missing"
  [ "$(git -C "$d" branch --show-current)" = "$BRANCH" ] || die "$wt not on $BRANCH"
  [ -z "$(git -C "$d" status --porcelain --untracked-files=no)" ] || die "$wt has uncommitted changes"
  ff_ok "$wt" "$pb" || die "$wt: origin/$pb moved and is not an ancestor; rebase the one commit onto it, re-verify, then re-run"
  local prev sha; prev=$(prod_url "$prj"); sha=$(git -C "$d" rev-parse HEAD)
  echo "$name|$prj|$prev" >> "$PREV"; log "[$name] previous production: ${prev:-<none>} (rollback target)"
  git -C "$d" push origin "HEAD:$pb" >>"$LOG" 2>&1 || die "$name push failed"
  log "[$name] pushed $(git -C "$d" rev-parse --short HEAD) -> origin/$pb; waiting for Vercel"
  wait_sha "$prj" "$sha" && pass "$name production READY at ${sha:0:7}" || fail "$name production build not READY (see Vercel dashboard)"
}

deploy_cli(){ # entry
  IFS='|' read -r name sub prj <<<"$1"
  local d=$HERE/$TOP/$sub
  [ -d "$d" ] || die "$d missing"
  [ "$(git -C "$HERE/$TOP" branch --show-current)" = "$TOP_BRANCH" ] || die "$TOP not on $TOP_BRANCH"
  [ -z "$(git -C "$HERE/$TOP" status --porcelain --untracked-files=no)" ] || die "$TOP has uncommitted changes"
  if [ "${prj#name:}" != "$prj" ]; then
    (cd "$d" && vercel link --yes --project "${prj#name:}" --scope "$TEAM" --token "$VT" >>"$LOG" 2>&1) || die "$name link failed"
    prj=$(jq -r .projectId "$d/.vercel/project.json")
  else
    mkdir -p "$d/.vercel"; printf '{"projectId":"%s","orgId":"%s"}\n' "$prj" "$TEAM" > "$d/.vercel/project.json"
  fi
  local prev; prev=$(prod_url "$prj"); echo "$name|$prj|$prev" >> "$PREV"
  log "[$name] previous production: ${prev:-<none>} (rollback target)"
  (cd "$d" && vercel deploy --prod --yes --token "$VT" --scope "$TEAM" >>"$LOG" 2>&1) || die "$name deploy failed (rollback: bash $0 rollback $name)"
  log "[$name] deployed from $(git -C "$HERE/$TOP" rev-parse --short HEAD)"
}

push_top(){ git -C "$HERE/$TOP" push origin "$TOP_BRANCH" >>"$LOG" 2>&1 \
  && log "  pushed $TOP $TOP_BRANCH (branch only; merging the monorepo branch to main is a follow-up)" || log "  push $TOP failed (non-fatal)"; }

body(){ curl -s -L --max-time 25 -H 'Cache-Control: no-cache' "$1?v=$(date +%s)"; }
has(){ grep -qF -- "$2" <<<"$3" && pass "$1 has: $2" || fail "$1 missing: $2"; }
hasnt(){ grep -qF -- "$2" <<<"$3" && fail "$1 still has: $2" || pass "$1 absent: $2"; }

verify_P(){ local b
  for pk in brand-voice-guide cold-email-sequence customer-persona landing-page-copy linkedin-week meeting-notes-actions \
            meta-ad-copy newsletter-20-minutes proposal-writer repurpose-blog-post sales-call-prep seo-blog-brief; do
    b=$(body "https://promptsforbusiness.com/packs/$pk"); has "pfb/$pk" 'A real worked output' "$b"; has "pfb/$pk" 'generated with Claude (Opus 5.5) on 2026-10-14' "$b"
  done
  b=$(body https://promptsforbusiness.com/); hasnt pfb-home 'tested prompt' "$b"; hasnt pfb-home 'Tested, copy-paste' "$b"; }

verify_L(){
  local wf; wf=$(gh api repos/mdothree/layoffleads/contents/.github/workflows/daily-refresh.yml --jq .name 2>/dev/null || true)
  [ "$wf" = daily-refresh.yml ] && pass "layoffleads workflow on main" || fail "layoffleads workflow missing on main"
  # Enable write access for the workflow token (repo setting; idempotent), then run once and wait.
  gh api -X PUT repos/mdothree/layoffleads/actions/permissions/workflow -f default_workflow_permissions=write >>"$LOG" 2>&1 \
    && pass "workflow permissions = write" || fail "could not set workflow permissions (do it in GitHub > Settings > Actions > General)"
  gh workflow run daily-data-refresh -R mdothree/layoffleads >>"$LOG" 2>&1 && sleep 15 || fail "workflow_dispatch failed"
  local id; id=$(gh run list -R mdothree/layoffleads -w daily-data-refresh -L 1 --json databaseId --jq '.[0].databaseId' 2>/dev/null || true)
  if [ -n "$id" ]; then gh run watch "$id" -R mdothree/layoffleads --exit-status >>"$LOG" 2>&1 && pass "daily-data-refresh run $id succeeded" || fail "daily-data-refresh run $id failed (gh run view $id --log)"; fi
  sleep 60
  local h; h=$(body https://layoffleads.com/health.json); log "  layoffleads health.json: $(echo "$h" | head -c 300)"
  echo "$h" | grep -q "$(date -u +%F)" && pass "layoffleads health.json shows today's fetch" || fail "layoffleads health.json not refreshed today"; }

verify_D(){ local b
  for a in "oracle:single-premium" "tarot:single" "runes:single-premium" "iching:single-premium" "dreams:dream-analysis" "astrology:birth-chart" "numerology:core-numbers"; do
    local h=${a%%:*} t=${a##*:}; b=$(body "https://$h.mdo3d.com/")
    has "$h" 'id="example-reading"' "$b"; has "$h" "data-price=\"$t\">\$5</span>" "$b"; has "$h" 'generated with Claude (Opus 5.5) on 2026-10-14' "$b"
    # 2026-10-15: checkout email is for the Stripe receipt; no reading is emailed
    local aj; aj=$(curl -s --max-time 20 "https://$h.mdo3d.com/js/app.js")
    has "$h-app.js" 'for your Stripe receipt' "$aj"; hasnt "$h-app.js" 'to receive your premium' "$aj"
  done
  for h in fengshui pastlife; do
    b=$(body "https://$h.mdo3d.com/"); has "$h" 'Example reading' "$b"; has "$h" 'paid once by card' "$b"; has "$h" '$5' "$b"
    # served JS: no window.prompt anywhere, inline email field present
    local js="" c
    for c in $(grep -oE '/_next/static/chunks/[^"]+\.js' <<<"$b" | sort -u); do js+=$(curl -s --max-time 20 "https://$h.mdo3d.com$c"); done
    hasnt "$h-js" 'window.prompt' "$js"; hasnt "$h-js" 'prompt("Enter your email' "$js"; has "$h-js" 'Email for your Stripe receipt' "$js"
  done; }

verify_G(){ local b; b=$(body https://guidance.mdo3d.com/)
  for s in 'href="https://names.mdo3d.com"' 'href="https://mdo3d.com/privacy"' 'href="https://mdo3d.com/terms"' 'href="https://mdo3d.com/refund"' 'href="https://mdo3d.com/contact"' 'Most readings are $5'; do has guidance "$s" "$b"; done
  hasnt guidance 'free' "$(tr 'A-Z' 'a-z' <<<"$b" | grep -oE '\bfree\b' || true)"; }

verify_N(){ local b; b=$(body https://names.mdo3d.com/)
  has names 'class="no-shell"' "$b"; has names 'Guidance · MDO3D' "$b"; has names '$2.99 · one purchase, up to 5 names' "$b"
  has names '/_next/static/media/' "$b"; }   # next/font self-hosted Cinzel / EB Garamond

# ---------- [R] RIGOR footer + salary contrast: PLACEHOLDER (Bridge / MDO lane fills; see 01_rigor.sh for the rigor deploy) ----------
verify_R(){  # deployed by 01_rigor.sh tools (rigor-<tool> main @ footer-legal + dark-mode contrast commits)
  for t in resume cover interview linkedin networking portfolio salary; do
    n=$(curl -s "https://$t.rigor.design/" | grep -c 'footer-legal' || true); log "  [R] $t footer legal links: $n (want 1)"
    c=$(curl -s "https://$t.rigor.design/css/styles.css" | grep -c 'panel-header h2, .upload-label' || true); log "  [R] $t dark-mode heading fix: $c (want >=1)"
  done
  n=$(curl -s https://rigor.design/ | grep -c 'mdo3d.com/privacy' || true); log "  [R] rigor.design legal links: $n (want 1)"
}

run(){ case "$1" in
  P) for e in "${GIT_P[@]}"; do deploy_git "$e"; done; sleep 20; verify_P;;
  L) for e in "${GIT_L[@]}"; do deploy_git "$e"; done; verify_L;;
  D) for e in "${GIT_D[@]}"; do deploy_git "$e"; done; for e in "${CLI_D[@]}"; do deploy_cli "$e"; done; push_top; sleep 20; verify_D;;
  G) for e in "${CLI_G[@]}"; do deploy_cli "$e"; done; push_top; sleep 20; verify_G;;
  N) for e in "${GIT_N[@]}"; do deploy_git "$e"; done; sleep 20; verify_N;;
  *) die "part P|L|D|G|N|all";; esac; }

case "$MODE" in
  check)
    token; log "== check (read-only)"
    for e in "${GIT_P[@]}" "${GIT_L[@]}" "${GIT_D[@]}" "${GIT_N[@]}"; do IFS='|' read -r name wt pb prj <<<"$e"
      st=$(git -C "$HERE/$wt" status --porcelain --untracked-files=no | wc -l | tr -d ' ')
      ff_ok "$wt" "$pb" && ff=ff || ff=NOT-FF
      log "  $name: $(git -C "$HERE/$wt" log --oneline -1 | cut -c1-70) | dirty=$st | origin/$pb $ff | prod=$(prod_url "$prj")"; done
    log "  $TOP: $(git -C "$HERE/$TOP" log --oneline -1 | cut -c1-70)"
    verify_P; verify_D; verify_G; verify_N
    log "check done: FAILs are expected before the deploy (the new strings are not live yet)";;
  go)
    token
    [ "${GO_CONFIRM:-}" = GO ] || { read -r -p "Deploy P1 quick wins part(s) $PART to production? type GO: " a; [ "$a" = GO ] || die "not confirmed"; }
    if [ "$PART" = all ]; then for p in P L D G N; do run $p; done; else run "$PART"; fi
    verify_R
    [ "$FAIL" = 0 ] && log "ALL PASS" || { log "$FAIL check(s) failed. Report to the Bridge; rollback only with the Principal's OK: bash $0 rollback <name>"; exit 2; };;
  rollback)
    token; [ -f "$PREV" ] || die "no $PREV (nothing deployed by this script)"
    want=${2:-}; [ -n "$want" ] || die "rollback <name> (see $PREV)"
    [ "${ROLLBACK_OK:-}" = principal ] || die "Principal rule 2026-10-13: no rollback without his OK. Re-run with ROLLBACK_OK=principal once he says so."
    grep -E "^$want\|" "$PREV" | tail -1 | while IFS='|' read -r name prj prev; do
      [ -n "$prev" ] || { log "[$name] no previous url recorded"; continue; }
      vercel promote "https://$prev" --yes --token "$VT" --scope "$TEAM" >>"$LOG" 2>&1 && log "[$name] promoted back to $prev" \
        || log "[$name] promote failed: Vercel dashboard > Deployments > $prev > Promote"
      log "[$name] NOTE: for git-pushed repos the production branch still holds the new commit; the next push redeploys it unless reverted (needs the Principal's OK)."
    done;;
  *) sed -n 2,31p "$0"; exit 1;;
esac
