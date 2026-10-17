#!/bin/bash
# GO_runwae_L3_guard_legal.sh — runwae.com ONE deploy that ships the live line + RW-SEC-01/02 interim payout guard +
# XE-6 legal seller together. Staged by the P0 REWORK lane 2026-10-17. MDO production deploy touching payments:
# needs the Principal's GO. NOT run.
#
# Why (sweep audits/P0_UNVERIFIED_SWEEP_2026-10-17.md): the three older GOs deployed trees that revert each other.
#   runwae_hotfix_GO/deploy_hotfix.sh  (hf2 77131b1)          has no guard, says "Runwae, LLC"
#   runwae_sec_GO/00_interim_guard.sh  (guard ab50b05)        says "Runwae, LLC" -> shipping after XE-6 reverts it
#   GO_runwae_legal_seller.sh          (L1 9d552ee/L2 44baa40) has no guard -> shipping after the guard reopens P0 #1
# All three are SUPERSEDED (they exit 3). This GO ships ONE commit that contains all of them:
#
#   L3 = bc0bf8feef9b (branch fix/runwae-l3-guard-legal-2026-10-17, pushed to mdothree/runwae)
#      = ab50b05 (interim guard; itself = hf2 77131b1 + guard; hf2 = hf1 7a7663e + javascript: URL fix)
#      + cherry-pick of 44baa40's legal diff (terms.html, privacy.html, css/chat-drawer.css) — byte-identical patch.
#
# Production-state detection (live util.js hash + /terms "Runwae, LLC" count + X-Runwae-Payout-Guard header, then
# EVERY served JS file and /terms + /privacy line counts must match the detected commit):
#   hf1 7a7663e | L1 9d552ee | hf2 77131b1 | L2 44baa40 | guard ab50b05 | L3 (already live -> nothing to deploy)
# For the detected state, state..L3 must touch EXACTLY the expected file set (hf2 files / guard files / legal files);
# anything else -> STOP (production moved; re-review, do not overwrite).
#
# Database rules / MIGRATE: the interim guard is site-only (api functions); it needs NO rules PUT and NO migration.
# The full fix (runwae_sec_GO/GO.sh f1dfeef, then MIGRATE.sh copy/remove/lock) is a later, separate GO; f1dfeef still
# says "Runwae, LLC", so GO.sh must be re-pinned onto L3 (+ legal) before it runs (its preflight now STOPs on that).
#
# Steps (fail-fast; STOP exit 2 on the first failure):
#   1. preflight: tools, MDO3 token (never printed), project id, Hobby cap, PIN exists, local + origin branch == PIN,
#      ancestry hf1 -> hf2 -> guard -> PIN, exact patches (guard..PIN == hf2..L2 legal patch; L2..PIN == hf2..guard
#      guard patch), tree assertions (guard markers, "Runwae, LLC" x0 in terms/privacy, hf2 helpers), preview-off.
#   2. production-state detection (above) + exact state..PIN file set.
#   3. clean `git archive` of PIN; off-box node --check + interim-guard node --test (littlemini; 8/8 required).
#   DRY stops here (nothing deployed, nothing pushed, nothing written except this log).
#   4. records the CURRENT production deployment URL (rollback target) BEFORE deploying.
#   5. ONE `vercel deploy --prod` from the archive.
#   6. live checks: guard (unauth/forged 401 + X-Runwae-Payout-Guard / X-Runwae-Connect-Guard headers, optional
#      crafted 403 payout_review), legal (/terms + /privacy "Runwae, LLC" x0, "YOU AND RUNWAE AGREE"), every served JS
#      file incl. util.js byte-identical to PIN, SW cache v11-hf2, pages 200 with PIN line counts, XFO DENY, 404s.
# ROLLBACK: never automatic. On a failed post-deploy check: STOP + MANUAL command. `rollback` re-promotes the recorded
# previous deployment (that REMOVES the payout guard again: P0 #1 reopens; the Bridge decides).
#
# Usage:
#   DRY=1 bash GO_runwae_L3_guard_legal.sh                 dry run (also the default with no arg)
#   GO_CONFIRM=GO bash GO_runwae_L3_guard_legal.sh go      production deploy (GO_CONFIRM=GO required; DRY=1 wins)
#   GO_CONFIRM=GO bash GO_runwae_L3_guard_legal.sh rollback
#   optional: RW_PROBE_ID_TOKEN=<TEST creator ID token> RW_PROBE_GIG=items/<item>/influencers/<gig>  (crafted-403)
#             OFFBOX=<ssh host> (default littlemini)
set -Eeuo pipefail

PIN=bc0bf8feef9b0a21b5d4dfa58751e8f5da7c8324      # L3 = guard + legal (reviewed; refuses anything else)
GUARD=ab50b054fec928080dbc6bfa8a7534999f03333e    # sec/guard-on-hf2 interim guard (parent of PIN)
HF2=77131b1e1107f781c571bf02fcfb7276b7424a45      # hotfix/feed-escaping hf2
HF1=7a7663ee715f8b134ed8b1d3750249e0e8febbc4      # hf1, live since 2026-10-15 01:37Z
L1=9d552eee04758c6e1fbd1069f52bb003b9d40251       # hf1 + legal (superseded GO)
L2=44baa40e9570a98a9239befa68901df31bc492f6       # hf2 + legal (superseded GO; source of the legal patch)
BRANCH=fix/runwae-l3-guard-legal-2026-10-17
SRC=$HOME/mdo3d/projects/external/runwae/runwae
R=https://runwae.com
TEAM=team_DXUPiQz3KkYmyhAgmT99OQQr
OFFBOX=${OFFBOX:-littlemini}
HERE=$(cd "$(dirname "$0")" && pwd)
LOG=$HERE/GO_runwae_L3_guard_legal.log
PREV_FILE=$HERE/GO_runwae_L3_guard_legal.prev
WK=$(mktemp -d "${TMPDIR:-/tmp}/rwl3.XXXXXX")
MODE=${1:-dry}; [ "${DRY:-0}" = 1 ] && MODE=dry
PREV=""
CB="cb=$(date +%s)"
HF2F="runwaejs/accountHQ.js runwaejs/display.js runwaejs/gigHQ.js runwaejs/util.js serviceworker.js unobfrunwaejs/accountHQ.js unobfrunwaejs/display.js unobfrunwaejs/gigHQ.js unobfrunwaejs/util.js"
GUARDF="api/payment/connect-oauth.js api/payment/pay-influencer.js tests/security/_mocks.js tests/security/interim-guard.test.js"
LEGALF="css/chat-drawer.css privacy.html terms.html"
SERVED="runwaejs/util.js runwaejs/display.js runwaejs/accountHQ.js runwaejs/gigHQ.js runwaejs/transactions.js serviceworker.js"

say(){ echo "$(date -u +%FT%TZ) $*" | tee -a "$LOG"; }
rollback_hint(){
  [ -n "$PREV" ] || PREV=$(cat "$PREV_FILE" 2>/dev/null || true)
  echo
  echo "=================== MANUAL ROLLBACK (NOT RUN — the Bridge decides) ==================="
  if [ -n "$PREV" ]; then
    echo "  GO_CONFIRM=GO bash $0 rollback      # removes the payout guard again (P0 #1 reopens)"
    echo "  # or: source ~/latarence/secrets/sega_credentials.env >/dev/null 2>&1"
    echo "  #     vercel promote https://$PREV --scope $TEAM --token \"\$VERCEL_TOKEN_MDO3\" --yes"
  else
    echo "  (no previous production URL was recorded; nothing was deployed by this run)"
  fi
  echo "======================================================================================="
}
stop(){ say "STOP: $*"; rollback_hint | tee -a "$LOG"; rm -rf "$WK"; exit 2; }
trap 'stop "unexpected error at line $LINENO"' ERR
check(){ local r; r=$(bash -c "$2" 2>/dev/null) || true
  if [[ "$r" == *"$3"* ]]; then say "  PASS $1 ($(echo "$r" | head -c 110 | tr '\n' ' '))"; else stop "FAIL $1 (got: $(echo "$r" | head -c 200 | tr '\n' ' '); want: $3)"; fi; }
confirm(){ [ "${GO_CONFIRM:-}" = GO ] || stop "GO_CONFIRM=GO not set ($1)"; }
token(){ set +u; source ~/latarence/secrets/sega_credentials.env >/dev/null 2>&1; set -u
  T="${VERCEL_TOKEN_MDO3:-}"; [ -n "$T" ] || stop "MDO3 Vercel token missing (VERCEL_TOKEN_MDO3)"; }
api(){ curl -s -m 30 -H "Authorization: Bearer $T" "https://api.vercel.com$1"; }
h(){ shasum | cut -c1-40; }
g(){ git -C "$SRC" "$@"; }
sorted(){ { echo $* | tr ' ' '\n' | grep -v '^$' || true; } | sort -u | tr '\n' ' ' | sed 's/ $//'; }
llc_rev(){ { g show "$1:$2" | grep -o 'Runwae, LLC' || true; } | wc -l | tr -d ' '; }
llc_live(){ { curl -sL -m 30 "$R/$1?$CB" | grep -o 'Runwae, LLC' || true; } | wc -l | tr -d ' '; }
guard_live(){ { curl -s -o /dev/null -D - -m 30 -X POST -H 'Content-Type: application/json' -d '{}' "$R/api/payment/pay-influencer" || true; } | tr -d '\r' | { grep -ci '^x-runwae-payout-guard:' || true; }; }

case "$MODE" in dry|go|rollback) ;; *) sed -n 2,48p "$0"; exit 1;; esac
for t in git jq curl vercel shasum tar ssh; do command -v "$t" >/dev/null || stop "missing tool: $t"; done
token
PID=$(jq -r .projectId "$SRC/.vercel/project.json"); [[ "$PID" == prj_* ]] || stop "runwae project id not found"

if [ "$MODE" = rollback ]; then
  PREV=$(cat "$PREV_FILE" 2>/dev/null || true); [ -n "$PREV" ] || stop "no $PREV_FILE (this GO never deployed)"
  confirm "rollback to https://$PREV (removes the payout guard)"
  vercel promote "https://$PREV" --yes --scope "$TEAM" --token "$T" >>"$LOG" 2>&1 || stop "promote failed: Vercel dashboard > runwae > Deployments > $PREV > Promote"
  say "ROLLBACK: promoted back to $PREV"; sleep 20
  check "rollback: pay-influencer guard header state" "curl -s -o /dev/null -D - -m 30 -X POST -H 'Content-Type: application/json' -d '{}' $R/api/payment/pay-influencer | tr -d '\r' | grep -ci '^x-runwae-payout-guard:' | sed s/^/guard=/" "guard="
  trap - ERR; rm -rf "$WK"; exit 0
fi

# ---------------- 1. preflight ----------------
say "=== GO_runwae_L3_guard_legal start (pin ${PIN:0:7}, mode=$MODE) ==="
say "  before (HQ repro): terms 'Runwae, LLC' x$(llc_live terms), privacy x$(llc_live privacy), payout-guard header x$(guard_live)"
since=$(( ($(date +%s) - 86400) * 1000 ))
n=$(api "/v6/deployments?teamId=$TEAM&since=$since&limit=100" | jq '.deployments | length')
if [ "${n:-100}" -gt 90 ]; then [ "$MODE" = dry ] && say "  WARN (dry): Hobby cap $n/100 in 24h; a real run would STOP" || stop "Hobby cap: $n deployments in 24h (need <= 90)"; fi
say "  preflight: $n deployments in 24h (cap 100)"

for c in $PIN $GUARD $HF2 $HF1 $L1 $L2; do g cat-file -e "${c}^{commit}" 2>/dev/null || stop "commit ${c:0:7} not found in $SRC"; done
[ "$(g rev-parse "refs/heads/$BRANCH" 2>/dev/null || true)" = "$PIN" ] || stop "local $BRANCH != PIN ${PIN:0:7} (moved? re-review)"
o=$(git -C "$SRC" ls-remote origin "refs/heads/$BRANCH" 2>/dev/null | cut -f1 || true)
if [ "$o" != "$PIN" ]; then [ "$MODE" = dry ] && say "  WARN (dry): origin $BRANCH = '${o:-unreachable}' (a real run would STOP)" || stop "origin $BRANCH = '${o:-unreachable}', want ${PIN:0:7}"; else say "  preflight: local + origin $BRANCH == ${PIN:0:7}"; fi
[ "$(g rev-parse "$PIN^")" = "$GUARD" ] || stop "PIN's parent is not the guard ${GUARD:0:7}"
g merge-base --is-ancestor "$HF2" "$GUARD" && g merge-base --is-ancestor "$HF1" "$HF2" || stop "ancestry hf1 -> hf2 -> guard broken"
[ "$(g diff "$GUARD" "$PIN" | h)" = "$(g diff "$HF2" "$L2" | h)" ] || stop "guard..PIN is not exactly the reviewed legal patch (hf2..L2)"
[ "$(g diff "$L2" "$PIN" | h)" = "$(g diff "$HF2" "$GUARD" | h)" ] || stop "L2..PIN is not exactly the reviewed guard patch (hf2..guard)"
[ "$(sorted $(g diff --name-only "$GUARD" "$PIN"))" = "$(sorted $LEGALF)" ] || stop "guard..PIN file set != $LEGALF"
say "  preflight: PIN = guard ${GUARD:0:7} + legal patch (byte-identical to ${L2:0:7}'s); ancestry hf1 -> hf2 -> guard -> PIN"
[ "$(llc_rev "$PIN" terms.html)" = 0 ] && [ "$(llc_rev "$PIN" privacy.html)" = 0 ] || stop "PIN still has 'Runwae, LLC'"
g show "$PIN:api/payment/pay-influencer.js" | grep -c 'X-Runwae-Payout-Guard' >/dev/null && g show "$PIN:api/payment/pay-influencer.js" | grep -c payout_review >/dev/null || stop "PIN lacks the payout guard"
g show "$PIN:api/payment/connect-oauth.js" | grep -c 'X-Runwae-Connect-Guard' >/dev/null && g show "$PIN:api/payment/connect-oauth.js" | grep -c account_exists >/dev/null || stop "PIN lacks the connect guard"
g show "$PIN:runwaejs/util.js" | grep -c rwExternalUrl >/dev/null && g show "$PIN:serviceworker.js" | grep -c "runwae-cache-v11-hf2'" >/dev/null || stop "PIN lacks hf2"
g show "$PIN:vercel.json" | jq -e '.git.deploymentEnabled["**"] == false' >/dev/null || stop "preview-off guard missing"
say "  preflight: tree has guard markers, 'Runwae, LLC' x0 in terms/privacy, hf2 helpers, preview-off guard"

# ---------------- 2. production-state detection ----------------
live_util=$(curl -s -m 30 "$R/runwaejs/util.js?$CB" | h)
live_llc=$(llc_live terms); live_guard=$(guard_live)
u1=$(g show "$HF1:runwaejs/util.js" | h); u2=$(g show "$HF2:runwaejs/util.js" | h)
if   [ "$live_util" = "$u1" ] && [ "$live_llc" != 0 ] && [ "$live_guard" = 0 ]; then S=hf1;   SC=$HF1; EXP="$HF2F $GUARDF $LEGALF"
elif [ "$live_util" = "$u1" ] && [ "$live_llc" = 0 ]  && [ "$live_guard" = 0 ]; then S=L1;    SC=$L1;  EXP="$HF2F $GUARDF"
elif [ "$live_util" = "$u2" ] && [ "$live_llc" != 0 ] && [ "$live_guard" = 0 ]; then S=hf2;   SC=$HF2; EXP="$GUARDF $LEGALF"
elif [ "$live_util" = "$u2" ] && [ "$live_llc" = 0 ]  && [ "$live_guard" = 0 ]; then S=L2;    SC=$L2;  EXP="$GUARDF"
elif [ "$live_util" = "$u2" ] && [ "$live_llc" != 0 ] && [ "$live_guard" != 0 ]; then S=guard; SC=$GUARD; EXP="$LEGALF"
elif [ "$live_util" = "$u2" ] && [ "$live_llc" = 0 ]  && [ "$live_guard" != 0 ]; then S=L3;    SC=$PIN; EXP=""
else stop "production is none of hf1/L1/hf2/L2/guard/L3 (util.js $live_util, terms LLC x$live_llc, guard x$live_guard): production moved, re-review"; fi
say "  production state = $S (${SC:0:7}): util.js match, terms 'Runwae, LLC' x$live_llc, guard header x$live_guard"
for f in $SERVED; do
  [ "$(curl -s -m 30 "$R/$f?$CB" | h)" = "$(g show "$SC:$f" | h)" ] || stop "production /$f != ${SC:0:7} (state $S): production moved, re-review"
done
for p in terms privacy; do
  want=$(g show "$SC:$p.html" | wc -l | tr -d ' '); got=$(curl -s -m 30 "$R/$p?$CB" | wc -l | tr -d ' ')
  [ "$got" = "$want" ] || stop "production /$p is $got lines, ${SC:0:7} has $want (state $S): production moved"
done
say "  production: every served JS file + /terms + /privacy line counts match $S"
got=$(sorted $(g diff --name-only "$SC" "$PIN")); want=$(sorted $EXP)
[ "$got" = "$want" ] || stop "$S..PIN touches '$got', want exactly '$want'"
say "  $S..PIN = exactly: ${got:-<nothing>}"
if [ "$S" = L3 ]; then say "=== L3 ${PIN:0:7} is ALREADY LIVE: nothing to deploy ==="; trap - ERR; rm -rf "$WK"; exit 0; fi

# ---------------- 3. clean archive + off-box tests ----------------
OUT=$WK/out; mkdir -p "$OUT/.vercel"
g archive "$PIN" | tar -x -C "$OUT"
printf '{"projectId":"%s","orgId":"%s"}' "$PID" "$TEAM" > "$OUT/.vercel/project.json"
grep -q payout_review "$OUT/api/payment/pay-influencer.js" && grep -q account_exists "$OUT/api/payment/connect-oauth.js" || stop "archive lacks the guard"
[ "$(cat "$OUT/terms.html" "$OUT/privacy.html" | grep -c 'Runwae, LLC' || true)" = 0 ] || stop "archive terms/privacy still say 'Runwae, LLC'"
say "  archive: $(find "$OUT" -type f | wc -l | tr -d ' ') files from ${PIN:0:7}"
offbox=$(g archive "$PIN" api tests | ssh -o ConnectTimeout=10 -o BatchMode=yes "$OFFBOX" 'D=$(mktemp -d /tmp/rwl3go.XXXXXX); tar -x -C $D; cd $D; N=/opt/homebrew/bin/node; [ -x $N ] || N=node;
  ok=1; for f in api/payment/pay-influencer.js api/payment/connect-oauth.js; do $N --check $f || ok=0; done
  $N --test tests/security/interim-guard.test.js >out.txt 2>&1 || ok=0; grep -E "^ℹ (pass|fail) " out.txt | tr "\n" " "; echo "ok=$ok"; cd /; rm -rf $D' 2>/dev/null || echo "unreachable")
if [[ "$offbox" == *"pass 8 ℹ fail 0 ok=1"* ]]; then say "  off-box ($OFFBOX): node --check OK, interim-guard node --test 8/8 ($offbox)"
else [ "$MODE" = dry ] && say "  WARN (dry): off-box tests not 8/8 on $OFFBOX: $offbox (a real run would STOP)" || stop "off-box tests on $OFFBOX: $offbox"; fi

if [ "$MODE" = dry ]; then say "DRY PASS: state $S -> would deploy ${PIN:0:7}; nothing deployed or pushed (run: GO_CONFIRM=GO bash $0 go)"; trap - ERR; rm -rf "$WK"; exit 0; fi

confirm "deploy L3 ${PIN:0:7} (guard + legal) over $S to PRODUCTION runwae.com; pauses ALL automatic payouts"

# ---------------- 4. rollback target BEFORE deploying ----------------
PREV=$(api "/v6/deployments?teamId=$TEAM&projectId=$PID&target=production&state=READY&limit=1" | jq -r '.deployments[0].url // empty')
[ -n "$PREV" ] || stop "could not read the current production deployment (rollback target); not deploying"
echo "$PREV" > "$PREV_FILE"
echo "vercel promote https://$PREV --yes --scope $TEAM --token \"\$VERCEL_TOKEN_MDO3\"   # runwae pre L3 guard+legal (${PIN:0:7}, over $S) $(date -u +%FT%TZ)" >> "$HERE/ROLLBACK_COMMANDS.txt"
say "  rollback target recorded: https://$PREV (-> $PREV_FILE, ROLLBACK_COMMANDS.txt)"

# ---------------- 5. ONE production deploy ----------------
out=""
for try in 1 2 3; do
  out=$(cd "$OUT" && vercel deploy --prod --yes --archive=tgz --token "$T" --scope "$TEAM" 2>&1 | grep -E "Production:|Error" | tail -1) || true
  [[ $out == *Production:* ]] && break; sleep 15
done
[[ $out == *Production:* ]] || stop "vercel deploy failed: $out"
say "  DEPLOYED ${PIN:0:7}: $out"; sleep 25

# ---------------- 6. live checks ----------------
P="-s -m 30 -X POST -H Content-Type:application/json"
check "guard: pay-influencer no auth -> 401" "curl $P -o /dev/null -w '%{http_code}' -d '{\"gigPath\":\"items/a/influencers/b\"}' $R/api/payment/pay-influencer" "401"
check "guard: X-Runwae-Payout-Guard header live" "curl $P -o /dev/null -D - -d '{}' $R/api/payment/pay-influencer | tr -d '\r' | grep -i '^x-runwae-payout-guard:'" "1"
check "guard: pay-influencer forged token -> 401" "curl $P -o /dev/null -w '%{http_code}' -H 'Authorization: Bearer forged.token.value' -d '{\"gigPath\":\"items/a/influencers/b\"}' $R/api/payment/pay-influencer" "401"
check "guard: connect-oauth no auth -> 401" "curl $P -o /dev/null -w '%{http_code}' -d '{\"code\":\"ac_x\"}' $R/api/payment/connect-oauth" "401"
check "guard: X-Runwae-Connect-Guard header live" "curl $P -o /dev/null -D - -d '{}' $R/api/payment/connect-oauth | tr -d '\r' | grep -i '^x-runwae-connect-guard:'" "1"
if [ -n "${RW_PROBE_ID_TOKEN:-}" ] && [ -n "${RW_PROBE_GIG:-}" ]; then
  check "guard: crafted payout (TEST creator) -> 403 payout_review" "curl $P -H \"Authorization: Bearer \$RW_PROBE_ID_TOKEN\" -d '{\"gigPath\":\"$RW_PROBE_GIG\"}' $R/api/payment/pay-influencer" "payout_review"
else say "  MANUAL: crafted-403 check skipped (set RW_PROBE_ID_TOKEN + RW_PROBE_GIG of a TEST creator account)"; fi
check "legal (HQ repro): /terms 'Runwae, LLC' = 0" "curl -sL -m 30 '$R/terms?$CB' | grep -o 'Runwae, LLC' | wc -l | tr -d ' ' | sed s/^/n=/" "n=0"
check "legal (HQ repro): /privacy 'Runwae, LLC' = 0" "curl -sL -m 30 '$R/privacy?$CB' | grep -o 'Runwae, LLC' | wc -l | tr -d ' ' | sed s/^/n=/" "n=0"
check "legal: /terms names Runwae as party" "curl -sL -m 30 '$R/terms?$CB' | grep -c 'YOU AND RUNWAE AGREE'" "1"
for f in $SERVED; do
  check "/$f == PIN (util.js = PIN)" "curl -s -m 30 '$R/$f?$CB' | shasum | cut -c1-40" "$(g show "$PIN:$f" | h)"
done
check "SW cache v11-hf2" "curl -s -m 30 '$R/serviceworker.js?$CB' | grep -c \"runwae-cache-v11-hf2'\"" "1"
src_of(){ case "$1" in /) echo welcome.html;; *) echo "${1#/}.html";; esac; }
for p in / /welcome /explore /profile /gig /messages /notifications /account /terms /privacy; do
  check "$p 200" "curl -s -o /dev/null -m 30 -w '%{http_code}' $R$p" "200"
  f=$(src_of "$p"); want=$(g show "$PIN:$f" | wc -l | tr -d ' ')
  check "$p is the PIN source ($f, $want lines)" "curl -s -m 30 $R$p | wc -l | tr -d ' ' | sed s/^/lines=/" "lines=$want"
done
for p in /refund /cancellation; do check "$p 200" "curl -sL -o /dev/null -m 30 -w '%{http_code}' $R$p" "200"; done
check "XFO DENY still set" "curl -sI -m 30 $R/ | tr -d '\r' | grep -i '^x-frame-options:'" "DENY"
for p in /vercel.json /package.json /firebase.json /error_log /js/config.js /tests/security/_mocks.js; do
  check "$p 404" "curl -s -o /dev/null -m 30 -w '%{http_code}' $R$p" "404"; done

say "=== GO_runwae_L3_guard_legal: ALL CHECKS PASS (${PIN:0:7} live: hf2 + payout guard + legal seller; automatic payouts paused) ==="
say "  NEXT: runwae_sec_GO/exposure_count.sh (read-only); full fix GO.sh must be re-pinned onto L3 + legal first"
say "  MANUAL: signed-in smoke on runwae.com/explore with a hard reload (cards render, no '<article' text)"
trap - ERR
rollback_hint | tee -a "$LOG"
rm -rf "$WK"
