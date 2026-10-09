#!/bin/bash
# MDO lane — cycle 5 consolidated operator deploy (Principal GO required).
# Usage:  bash ~/mdo3d/MDO_DEPLOY_CYCLE5_2026-10-08.sh <group...>
#   groups: rigor | runwae | ronna | mdothree | div | all
# Every project deploys from a clean `git archive HEAD` export (never a working tree — several hold
# unrelated uncommitted work). Uses the MDO3 Vercel token from ~/latarence/secrets/sega_credentials.env.
# ~25 deploys total (Vercel Hobby cap is 100/day). No Stripe charges; PRO_CHECKOUT_ENABLED stays false.
set -u
source ~/latarence/secrets/sega_credentials.env >/dev/null 2>&1
T="${VERCEL_TOKEN_MDO3:?MDO3 Vercel token missing}"
ROOT=~/mdo3d; W=/tmp/mdo-c5-deploy; LOG=~/mdo3d/MDO_DEPLOY_CYCLE5.log
ok=0; fail=0

deploy() {  # deploy <folder relative to ~/mdo3d>
  local d=$1 top; rm -rf "$W" && mkdir -p "$W"
  top=$(git -C "$ROOT/$d" rev-parse --show-toplevel)
  if [ "$top" = "$ROOT/$d" ]; then git -C "$ROOT/$d" archive HEAD | tar -x -C "$W"
  else git -C "$ROOT" archive "HEAD:$d" | tar -x -C "$W"; fi
  mkdir -p "$W/.vercel" && cp "$ROOT/$d/.vercel/project.json" "$W/.vercel/"
  local sha; sha=$(git -C "$ROOT/$d" log -1 --format=%h)
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
  for p in error_log database-debug.log firebase.json database.rules.json vercel.json deployment/inject-config.js README.md; do
    check "runwae /$p → 404" "curl -s -o /dev/null -w '%{http_code}' https://runwae.com/$p" "404"; done
  check "runwae no zoom block" "curl -sL https://runwae.com/welcome | grep -c user-scalable" "0"
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
g_ronna() {  # P0 RONNA-ENV-SYNTAX + SOFT-200-EMPTY (ronna), RONNA-LEADS-ICON-404
  for s in companies contacts emails leads prospects; do deploy projects/ronnascanner/ronnascanner-$s; done
  for s in companies contacts emails leads prospects; do
    check "$s env.js fixed" "curl -s https://$s.ronnascanner.com/js/config/env.js | sed -n 8p | grep -c 'typeof import'" "0"
    check "$s unknown → 404" "curl -s -o /dev/null -w '%{http_code}' https://$s.ronnascanner.com/zz-nope" "404"; done
}
g_mdothree() {  # JSON-FIREBASE-IMPORT, JSON-CONSOLE-FIREBASE-SDK-NOT-LOADED, MDOTHREE-STRAY-FAVICON, -SIGNED-IN-BADGE, JSON-BEAUTIFY-EMPTY-SILENT, HASH-MOBILE-NAV-OVERFLOW, MDOTHREE-TRIAL-PATH-UNVERIFIED
  for t in json text pdf qr hash color password timestamp; do deploy projects/mdothree/mdothree-$t; done   # image already live
  check "pdf stray favicon gone" "curl -s https://pdf.mdothree.com/ | grep -c '📄\" />'" "0"
  check "qr no 7-day trial" "curl -s https://qr.mdothree.com/pricing | grep -c '7-Day'" "0"
  check "color badge anon-safe" "curl -s https://color.mdothree.com/js/app.js | grep -q isAnonymous && echo yes" "yes"
}
g_div() {  # NUMEROLOGY-NO-RECALC, PASTLIFE-INTEREST-IGNORED (fengshui + iching already live)
  deploy projects/divination/numerology/numerology-app
  deploy projects/divination/pastlives/api
  check "numerology recalc" "curl -s https://numerology.mdo3d.com/js/app.js | grep -q NUMEROLOGY-NO-RECALC && echo yes" "yes"
  check "pastlives api health" "curl -s -o /dev/null -w '%{http_code}' https://pastlives-api.vercel.app/api/health" "200"
}

[ $# -eq 0 ] && { sed -n 2,8p "$0"; exit 1; }
for g in "$@"; do
  case $g in
    all) g_rigor; g_runwae; g_ronna; g_mdothree; g_div;;
    rigor|runwae|ronna|mdothree|div) "g_$g";;
    *) echo "unknown group $g";;
  esac
done
echo "deploys ok=$ok fail=$fail — log: $LOG"
