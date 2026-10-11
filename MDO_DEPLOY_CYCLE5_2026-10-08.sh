#!/bin/bash
# MDO lane — cycle 5 consolidated operator deploy (Principal GO required).
# Usage:  bash ~/mdo3d/MDO_DEPLOY_CYCLE5_2026-10-08.sh <group...>
#   groups: rigor | runwae | ronna | mdothree | div | all  (+ c8qw: cycle-8 QW3/QW4, not in all)
# Every project deploys from a clean `git archive HEAD` export (never a working tree — several hold
# unrelated uncommitted work). Uses the MDO3 Vercel token from ~/latarence/secrets/sega_credentials.env.
# ~25 deploys total (Vercel Hobby cap is 100/day). No Stripe charges; PRO_CHECKOUT_ENABLED stays false.
set -u
source ~/latarence/secrets/sega_credentials.env >/dev/null 2>&1
T="${VERCEL_TOKEN_MDO3:?MDO3 Vercel token missing}"
ROOT=~/mdo3d; W=/tmp/mdo-c5-deploy; LOG=~/mdo3d/MDO_DEPLOY_CYCLE5.log; RB=~/mdo3d/MDO_ROLLBACK_CYCLE5.sh
TEAM=team_DXUPiQz3KkYmyhAgmT99OQQr
[ -f "$RB" ] || printf "#!/bin/bash\n# Rollback: re-promotes the production deployment that was live before each cycle-5 deploy.\nsource ~/latarence/secrets/sega_credentials.env >/dev/null 2>&1\n" > "$RB"
ok=0; fail=0

deploy() {  # deploy <folder relative to ~/mdo3d>
  local d=$1 top; rm -rf "$W" && mkdir -p "$W"
  top=$(git -C "$ROOT/$d" rev-parse --show-toplevel)
  if [ "$top" = "$ROOT/$d" ]; then git -C "$ROOT/$d" archive HEAD | tar -x -C "$W"
  else git -C "$ROOT" archive "HEAD:$d" | tar -x -C "$W"; fi
  mkdir -p "$W/.vercel" && cp "$ROOT/$d/.vercel/project.json" "$W/.vercel/"
  local sha; sha=$(git -C "$ROOT/$d" log -1 --format=%h)
  local pid prev; pid=$(jq -r .projectId "$ROOT/$d/.vercel/project.json")
  prev=$(curl -s -H "Authorization: Bearer $T" "https://api.vercel.com/v6/deployments?teamId=$TEAM&projectId=$pid&target=production&state=READY&limit=1" | jq -r '.deployments[0].url // empty')
  [ -n "$prev" ] && echo "vercel promote https://$prev --yes --scope mdothrees-projects --token \"\$VERCEL_TOKEN_MDO3\"   # $d (pre-cycle5)" >> "$RB"
  for try in 1 2 3; do
    out=$(cd "$W" && vercel deploy --prod --yes --archive=tgz --token "$T" 2>&1 | grep -E "Production:|Error" | tail -1)
    [[ $out == *Production:* ]] && break; sleep 10
  done
  echo "$(date -u +%FT%TZ) $d $sha :: $out" | tee -a "$LOG"
  [[ $out == *Production:* ]] && ok=$((ok+1)) || fail=$((fail+1))
}
check() {  # check <label> <cmd> <expect-substring>
  local r; r=$(bash -c "$2" 2>/dev/null)
  if [[ "$r" == *"$3"* ]]; then echo "  PASS $1 ($r)"; else echo "  FAIL $1 (got: $r, want: $3)"; fi | tee -a "$LOG"
}

g_rigor() {  # P0 RIGOR-PAY-BEFORE-API + RIGOR-SUCCESS-CANCEL-404, -HEADER-SIGNIN-DEAD, -EMPTY-INPUT-VALIDATION, SOFT-200-EMPTY, HEADERS-CSP
  for t in resume cover interview linkedin networking portfolio salary; do deploy projects/rigor/$t; done
  for t in resume interview networking salary; do check "$t 8k804 gone" "curl -sL https://$t.rigor.design/ | grep -c 8k804" "0"; done
  check "resume /success" "curl -s -o /dev/null -w '%{http_code}' https://resume.rigor.design/success" "200"
  check "resume unknown → 404" "curl -s -o /dev/null -w '%{http_code}' https://resume.rigor.design/zz-nope" "404"
  check "resume CSP" "curl -sI https://resume.rigor.design/ | grep -qi content-security-policy && echo yes" "yes"
}
g_runwae() {  # P0 RUNWAE-ERROR-LOG-PUBLIC, RUNWAE-PUBLIC-CONFIG-FILES + PINCH-ZOOM, SEO, UI, ASSETS, STATS, DEAD-HEADER-LINKS
  deploy projects/external/runwae/runwae
  for p in error_log database-debug.log ui-debug.log firebase.json database.rules.json vercel.json deployment/inject-config.js deployment/prune-public.js README.md STATUS.md marketerLedger.txt; do
    check "runwae /$p → 404" "curl -s -o /dev/null -w '%{http_code}' https://runwae.com/$p" "404"; done
  for pg in welcome welcome-v2 account blog; do check "runwae /$pg no zoom block" "curl -sL https://runwae.com/$pg | grep -c user-scalable" "0"; done
  check "runwae / still serves" "curl -sL -o /dev/null -w '%{http_code}' https://runwae.com/" "200"
  check "runwae sitemap" "curl -s -o /dev/null -w '%{http_code}' https://runwae.com/sitemap.xml" "200"
  check "runwae config.js parses" "curl -s https://runwae.com/js/config.js -o /tmp/rcfg.js && node --check /tmp/rcfg.js && echo ok" "ok"
  cat <<'EOF' | tee -a "$LOG"
  NEXT (operator, after the checks above pass):
   3) firebase database:set /admins/<OWNER_UID> --data true --project runwaedesign --account mdo3group@gmail.com
   4) rm -rf /tmp/runwae-rules && mkdir -p /tmp/runwae-rules && git -C ~/mdo3d/projects/external/runwae/runwae archive HEAD firebase.json database.rules.json | tar -x -C /tmp/runwae-rules \
      && (cd /tmp/runwae-rules && firebase deploy --only database --project runwaedesign --account mdo3group@gmail.com)
   5) Two-account smoke test (no live charges). Payments also need Vercel env FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY on project runwae.
  Rollback rules: redeploy {"rules":{".read":false,".write":false}} (the locked state) — never the old auth!=null rules.
EOF
}
g_ronna() {  # P0 RONNA-ENV-SYNTAX + P0 RONNA-MOCK-FALLBACK + SOFT-200-EMPTY (ronna), RONNA-LEADS-ICON-404 — ships env.js + mock removal together (HEAD)
  for s in companies contacts emails leads prospects; do deploy projects/ronnascanner/ronnascanner-$s; done
  for s in companies contacts emails leads prospects; do
    check "$s env.js fixed" "curl -s https://$s.ronnascanner.com/js/config/env.js | sed -n 8p | grep -c 'typeof import'" "0"
    check "$s unknown → 404" "curl -s -o /dev/null -w '%{http_code}' https://$s.ronnascanner.com/zz-nope" "404"
    check "$s no mock data (RONNA-MOCK-FALLBACK)" "curl -s https://$s.ronnascanner.com/js/app.js | grep -ciE 'generateMock|mockCompanyData|mockContacts|mockEmailResults|mockProfile'" "0"
    check "$s no fake provider claims" "curl -s https://$s.ronnascanner.com/ https://$s.ronnascanner.com/js/app.js | grep -ciE 'Apollo|Clearbit|Hunter\\.io'" "0"; done
}
g_mdothree() {  # JSON-FIREBASE-IMPORT, JSON-CONSOLE-FIREBASE-SDK-NOT-LOADED, MDOTHREE-STRAY-FAVICON, -SIGNED-IN-BADGE, JSON-BEAUTIFY-EMPTY-SILENT, HASH-MOBILE-NAV-OVERFLOW, MDOTHREE-TRIAL-PATH-UNVERIFIED
  for t in json text pdf qr hash color password timestamp image; do deploy projects/mdothree/mdothree-$t; done   # image: cycle-8 QW1 footer (0663366)
  check "pdf stray favicon gone" "curl -s https://pdf.mdothree.com/ | grep -c '📄\" />'" "0"
  check "qr no 7-day trial" "curl -s https://qr.mdothree.com/pricing | grep -c '7-Day'" "0"
  check "color badge anon-safe" "curl -s https://color.mdothree.com/js/app.js | grep -q isAnonymous && echo yes" "yes"
  for t in json text pdf qr hash color password timestamp image; do   # cycle-8 QW1 C7-009
    check "$t footer Terms/Privacy/Contact (C7-009)" "curl -s https://$t.mdothree.com/ | grep -o 'mdothree.com/terms\|mdothree.com/privacy\|mailto:hello@mdothree.com' | sort -u | wc -l | tr -d ' '" "3"; done
}
g_div() {  # NUMEROLOGY-NO-RECALC, PASTLIFE-INTEREST-IGNORED (fengshui + iching already live)
  deploy projects/divination/numerology/numerology-app
  deploy projects/divination/pastlives/api
  check "numerology recalc" "curl -s https://numerology.mdo3d.com/js/app.js | grep -q NUMEROLOGY-NO-RECALC && echo yes" "yes"
  check "pastlives api health" "curl -s -o /dev/null -w '%{http_code}' https://pastlives-api.vercel.app/api/health" "200"
}
g_c8qw() {  # cycle-8 QW3 C7-010 entertainment disclaimer + QW4 C7-002/003/016/017 API JSON errors (QW1 ships in g_mdothree)
  for d in divination/tarot/tarot-cards divination/numerology/numerology-app divination/dreams/dream-interpreter divination/astrology/astrology divination/iching/iching divination/runes/runes divination/fengshui/feng-shui-analyzer divination/pastlives/past-life-insights jarvisbee/babynames/baby-name-oracle; do deploy projects/$d; done
  for a in astrology dreams fengshui iching numerology oracle pastlives runes tarot; do deploy projects/divination/$a/api; done
  for h in tarot numerology astrology iching runes fengshui pastlife names; do
    check "$h disclaimer (C7-010)" "curl -s https://$h.mdo3d.com/ | grep -c 'For entertainment and reflection purposes'" "1"; done
  check "tarot health ping /api/health (C7-016)" "curl -s https://tarot.mdo3d.com/js/config/api.js | grep -c \"request('/api/health')\"" "1"
  for u in tarot-cards-api.vercel.app dream-interpreter-api-delta.vercel.app oracle-cards-api.vercel.app pastlives-api.vercel.app; do
    check "$u bad JSON -> 400 JSON (C7-002)" "curl -s -w ' %{http_code}' -X POST -H 'content-type: application/json' --data '{\"x\":' https://$u/api/payment/verify" "Malformed JSON in request body\"} 400"
    check "$u 200KB -> 413 JSON (C7-003)" "printf '{\"sessionId\":\"%204800s\"}' '' | curl -s -w ' %{http_code}' -X POST -H 'content-type: application/json' --data-binary @- https://$u/api/payment/verify" "Request body too large\"} 413"
    check "$u unknown -> 404 JSON (C7-017)" "curl -s -w ' %{http_code}' https://$u/api/zz-nope" "Not found\"} 404"
    check "$u wrong method -> 405 JSON (C7-017)" "curl -s -w ' %{http_code}' https://$u/api/payment/verify" "not allowed\"} 405"; done
}

[ $# -eq 0 ] && { sed -n 2,8p "$0"; exit 1; }
for g in "$@"; do
  case $g in
    all) g_rigor; g_runwae; g_ronna; g_mdothree; g_div;;   # c8qw is separate: run it explicitly
    rigor|runwae|ronna|mdothree|div|c8qw) "g_$g";;
    *) echo "unknown group $g";;
  esac
done
echo "deploys ok=$ok fail=$fail — log: $LOG — rollback: bash $RB (or run single lines from it)"
