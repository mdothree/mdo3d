#!/bin/bash
# MDO lane — cycle 5 consolidated operator deploy (Principal GO required).
# Usage:  bash ~/mdo3d/MDO_DEPLOY_CYCLE5_2026-10-08.sh <group...>
#   groups: rigor | runwae | ronna | mdothree | div | all  (+ c8qw: cycle-8 QW3/QW4; + b26: Builder cycle-8 P2/P3 pushes+deploys; neither in all)
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
  # Ships the PUSHED tip of the checkout's branch, not local HEAD: lanes push from worktrees and the
  # primaries hold unrelated WIP, so a primary can lag origin (2026-10-12: 13 sources were behind).
  local d=$1 top br url ref pre; rm -rf "$W" && mkdir -p "$W"
  top=$(git -C "$ROOT/$d" rev-parse --show-toplevel); pre=$(git -C "$ROOT/$d" rev-parse --show-prefix)
  br=$(git -C "$top" rev-parse --abbrev-ref HEAD)
  url=$(git -C "$top" remote get-url origin | sed -E 's#//[^@/]*@#//#')
  if git -C "$top" fetch -q "$url" "$br" 2>/dev/null; then ref=$(git -C "$top" rev-parse FETCH_HEAD)
  else ref=$(git -C "$top" rev-parse HEAD); echo "  WARN $d: fetch of origin/$br failed, deploying local HEAD" | tee -a "$LOG"; fi
  git -C "$top" merge-base --is-ancestor HEAD "$ref" || echo "  WARN $d: local HEAD has commits not on origin/$br (they are NOT in this deploy)" | tee -a "$LOG"
  if [ -z "$pre" ]; then git -C "$top" archive "$ref" | tar -x -C "$W"
  else git -C "$top" archive "$ref:${pre%/}" | tar -x -C "$W"; fi
  mkdir -p "$W/.vercel" && cp "$ROOT/$d/.vercel/project.json" "$W/.vercel/"
  local sha; sha=$(git -C "$top" rev-parse --short=7 "$ref")
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
  check "portfolio #career-stage named (A11Y-002)" "curl -s https://portfolio.rigor.design/ | grep -c 'aria-label=\"Career stage\" class=\"u-rigor_portfolio-3 input\" id=\"career-stage\"'" "1"
  for t in resume cover interview linkedin networking portfolio salary; do   # cycle-8 P1 RIGOR-HEADER-SIGNIN-DEAD-REST (fixed at HEAD; live after this deploy)
    check "$t header #signin/#signup anchors" "n=\$(curl -sL https://$t.rigor.design/ | grep -oE 'href=\"#sign(in|up)\" id=\"nav-(login|signup)\"' | wc -l); [ \"\$n\" -ge 2 ] && echo yes" "yes"; done
}
g_runwae() {  # P0 RUNWAE-ERROR-LOG-PUBLIC, RUNWAE-PUBLIC-CONFIG-FILES + PINCH-ZOOM, SEO, UI, ASSETS, STATS, DEAD-HEADER-LINKS
  deploy projects/external/runwae/runwae
  for p in error_log database-debug.log ui-debug.log firebase.json database.rules.json vercel.json deployment/inject-config.js deployment/prune-public.js README.md STATUS.md marketerLedger.txt; do
    check "runwae /$p → 404" "curl -s -o /dev/null -w '%{http_code}' https://runwae.com/$p" "404"; done
  for p in package.json email.php docs/javascript-obfuscation.md .vscode/settings.json .vercel/project.json og/build.sh js/config.template.js deployment/build-dist.js; do   # cycle-8 P1 RUNWAE-OUTPUTDIR-ROOT (dist/ allowlist, e6902e9)
    check "runwae /$p → 404 (dist allowlist)" "curl -s -o /dev/null -w '%{http_code}' https://runwae.com/$p" "404"; done
  check "runwae /welcome → 200 (dist)" "curl -sL -o /dev/null -w '%{http_code}' https://runwae.com/welcome" "200"
  for pg in welcome welcome-v2 account blog; do check "runwae /$pg no zoom block" "curl -sL https://runwae.com/$pg | grep -c user-scalable" "0"; done
  check "runwae / still serves" "curl -sL -o /dev/null -w '%{http_code}' https://runwae.com/" "200"
  check "runwae sitemap" "curl -s -o /dev/null -w '%{http_code}' https://runwae.com/sitemap.xml" "200"
  check "runwae config.js parses" "curl -s https://runwae.com/js/config.js -o /tmp/rcfg.js && node --check /tmp/rcfg.js && echo ok" "ok"
  # cycle-8 QW2 (runwae bde5acb): C7-001 / C7B-RUNWAE-BLOG-ASSETS-404 / C7-015
  for post in PabloTheDon NotesWithNiya AIandAuthenticity-2026; do
    check "runwae /blog/$post 0 relative href/src" "echo n=\$(curl -sL https://runwae.com/blog/$post | grep -oE '(href|src)=\"[^\"]*\"' | grep -vcE '=\"(https?:|/|#|mailto:)')." "n=0."; done
  for a in /Bootstrap/dist/css/bootstrap.css /css/main.css /js/jquery-3.2.1.js /img/logo-colored.png /login /faqs /terms /privacy; do
    check "runwae $a → 200 (blog nav/asset)" "curl -sL -o /dev/null -w '%{http_code}' https://runwae.com$a" "200"; done
  check "runwae /blog author link not runwae.com" "echo n=\$(curl -sL https://runwae.com/blog | grep -c 'href=\"runwae.com\"')." "n=0."
  check "runwae /faqs no dup id whoshouldifollow" "echo n=\$(curl -sL https://runwae.com/faqs | grep -c 'id=\"whoshouldifollow\"')." "n=1."
  check "runwae /faqs #howdoimessage anchor fixed" "echo n=\$(curl -sL https://runwae.com/faqs | grep -c 'href=\"/howdoimessage#\"\\|href=\"howdoimessage#\"')." "n=0."
  # cycle-8 P1b (1243764): XB-001 · SEO-003 · PERF-001 · A11Y-001
  for p in welcome login privacy terms; do
    check "runwae /$p has DOCTYPE (XB-001)" "curl -sL https://runwae.com/$p | head -c 15" "<!DOCTYPE html>"; done
  check "runwae / → single 301 → /welcome (SEO-003)" "curl -s -o /dev/null -w '%{http_code} %{redirect_url}' https://runwae.com/" "301 https://runwae.com/welcome"
  check "runwae / redirect hops (SEO-003)" "echo n=\$(curl -sL -o /dev/null -w '%{num_redirects}' https://runwae.com/)." "n=1."
  check "runwae og:url absolute (SEO-003)" "curl -s https://runwae.com/welcome | grep -c 'og:url\" content=\"https://runwae.com/welcome\"'" "1"
  check "runwae welcome no fontawesome-all (PERF-001)" "curl -s https://runwae.com/welcome | grep -c 'src=\"fonts/fontawesome-all'" "0"
  check "runwae welcome deferred scripts (PERF-001; fd07868 trimmed 45 → 19)" "n=\$(curl -s https://runwae.com/welcome | grep -c '<script defer'); [ \"\$n\" -ge 15 ] && echo yes" "yes"
  check "runwae welcome email inputs labelled (A11Y-001)" "curl -s https://runwae.com/welcome | grep -o 'for=\"\(marketerGuide\|influencerGuide\|subscribe\)EmailInput\"' | wc -l | tr -d ' '" "3"
  check "runwae Bootstrap/dist served (.gitignore 'dist' also matches Bootstrap/dist)" "curl -s -o /dev/null -w '%{http_code}' https://runwae.com/Bootstrap/dist/js/bootstrap.bundle.js" "200"
  # cycle-8 P2/P3 (fd07868): PERF-001 TBT · SURF-003 · A11Y-003/004/005/007/009/012/014/015 · C7-011 · C7-014 · SEO-007 · MOBILE-GENERAL-TEXT-SIZE · IMG-RUNWAE-LOGO-ALT-LAZY
  check "runwae welcome no base-init.js / plugin bundle (PERF-001 TBT)" "echo n=\$(curl -s https://runwae.com/welcome | grep -cE 'js/(base-init|fullcalendar|Chart|moment|daterangepicker|svg-loader)\\.js')." "n=0."
  check "runwae welcome-init.js served (PERF-001 TBT)" "curl -s -o /dev/null -w '%{http_code}' https://runwae.com/js/welcome-init.js" "200"
  check "runwae welcome lottie lazy (data-src ×10, PERF-001)" "curl -s https://runwae.com/welcome | grep -c '<lottie-player data-src='" "10"
  check "runwae welcome no ionicons runtime (PERF-001)" "echo n=\$(curl -s https://runwae.com/welcome | grep -c 'unpkg.com/ionicons')." "n=0."
  check "runwae no lottie @latest (SURF-003)" "echo n=\$(curl -s https://runwae.com/welcome | grep -c 'lottie-player@latest')." "n=0."
  check "runwae CDN scripts with SRI (SURF-003)" "curl -s https://runwae.com/welcome | grep -c 'integrity=\"sha384-'" "2"
  check "runwae main.css old purple gone (A11Y-003)" "echo n=\$(curl -s https://runwae.com/css/main.css | grep -ci '#9389ff')." "n=0."
  check "runwae bootstrap.css old purple gone (A11Y-003)" "echo n=\$(curl -s https://runwae.com/Bootstrap/dist/css/bootstrap.css | grep -ci '#9389ff')." "n=0."
  for p in welcome login faqs privacy terms blog blog/PabloTheDon; do
    check "runwae /$p <main> + skip link (A11Y-004/015)" "echo n=\$(curl -sL https://runwae.com/$p | grep -cE '<main id=\"main\">|class=\"skip-link\"')." "n=2."; done
  check "runwae social links named (A11Y-007)" "curl -s https://runwae.com/welcome | grep -c 'aria-label=\"Runwae on '" "4"
  check "runwae no 'Olympus' alt (IMG-RUNWAE-LOGO-ALT-LAZY)" "echo n=\$(curl -sL https://runwae.com/welcome https://runwae.com/faqs https://runwae.com/blog | grep -c 'alt=\"Olympus\"')." "n=0."
  check "runwae 68px logo served (IMG-RUNWAE-LOGO-ALT-LAZY)" "curl -s -o /dev/null -w '%{http_code}' https://runwae.com/img/logo-colored-68.png" "200"
  check "runwae login fields autocomplete (C7-011)" "curl -sL https://runwae.com/login | grep -cE 'autocomplete=\"(name|username|email|new-password|current-password)\"'" "7"
  check "runwae main.css dead image urls gone (C7-014)" "echo n=\$(curl -s https://runwae.com/css/main.css | grep -cE 'url\\(\"?\\.\\./img/(landing-bg|bg-section1|top-header3)')." "n=0."
  check "runwae unknown path → 404 status (SEO-007)" "curl -s -o /dev/null -w '%{http_code}' https://runwae.com/zz-nope" "404"
  check "runwae unknown path → branded page (SEO-007)" "curl -s https://runwae.com/zz-nope | grep -c '<title>Page not found — Runwae</title>'" "1"
  echo "  MANUAL: xps Lighthouse runwae.com/welcome (expect perf ≥70, LCP <4s; TBT well below the 1243764 build — local interleaved median 2322→1004ms, main-thread 21.2→6.5s) + axe 0 violations on /welcome at 1280 and 375" | tee -a "$LOG"
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
  for s in companies contacts emails leads prospects; do   # cycle-8 P1 RONNA-APIFETCH-DOUBLE-JSON (callers use apiFetch's parsed body; IDs wired to markup)
    check "$s no double .json() (RONNA-APIFETCH-DOUBLE-JSON)" "curl -s https://$s.ronnascanner.com/js/app.js | grep -q 'res\\.json()' && echo FOUND || echo none" "none"; done
  check "leads imports showSkeleton" "curl -s https://leads.ronnascanner.com/js/app.js | grep -q 'import { showSkeleton }' && echo yes" "yes"
  for s in companies contacts prospects; do check "$s reads #filter-company" "curl -s https://$s.ronnascanner.com/js/app.js | grep -q 'getElementById(\"filter-company\")' && echo yes" "yes"; done
  for s in leads companies contacts emails prospects; do  # cycle-8 P1b SEO-001: canonical/og:url on own host
    check "$s canonical own host (SEO-001)" "curl -s https://$s.ronnascanner.com/ | grep -c 'rel=\"canonical\" href=\"https://$s.ronnascanner.com/\"'" "1"
    check "$s og:url own host (SEO-001)" "curl -s https://$s.ronnascanner.com/ | grep -c 'og:url\" content=\"https://$s.ronnascanner.com/\"'" "1"; done
  check "companies #filter-data labelled (A11Y-002)" "curl -s https://companies.ronnascanner.com/ | grep -c 'for=\"filter-data\"'" "1"
  check "contacts dept/seniority labelled (A11Y-002)" "curl -s https://contacts.ronnascanner.com/ | grep -o 'for=\"filter-\(dept\|seniority\)\"' | wc -l | tr -d ' '" "2"
  check "prospects depth/focus labelled (A11Y-002)" "curl -s https://prospects.ronnascanner.com/ | grep -o 'for=\"filter-\(depth\|focus\)\"' | wc -l | tr -d ' '" "2"
  for s in companies contacts emails leads prospects; do   # cycle-8 P2/P3 (see documentation/MDO_CYCLE8_P23_MDOTHREE_RONNA_2026-10-11.md)
    check "$s Sign In/Free Trial real targets (RONNA-SUB-SIGNIN-DEAD)" "curl -s https://$s.ronnascanner.com/ | grep -c 'href=\"#signin\"'" "1"
    check "$s signup minlength (C7-011)" "curl -s https://$s.ronnascanner.com/ | grep -c 'minlength=\"6\"'" "1"
    check "$s no inline script (HEADERS-CSP F3)" "curl -s https://$s.ronnascanner.com/ | grep -c '<script>'" "0"
    check "$s nav button contrast (A11Y-003)" "curl -s https://$s.ronnascanner.com/css/styles.css | grep -qi 'C2410C' && echo yes" "yes"
    check "$s <main> (A11Y-004)" "curl -s https://$s.ronnascanner.com/ | grep -c '<main id=\"main-content\"'" "1"
    check "$s (c) 2026 (CONTENT-STALE-YEAR-2025)" "curl -s https://$s.ronnascanner.com/ | grep -c '2025 ronnascanner'" "0"
    check "$s apple-touch-icon (IMG-RONNASUB-NO-ICONS)" "curl -s -o /dev/null -w '%{http_code}' https://$s.ronnascanner.com/icons/apple-touch-icon.png" "200"
    check "$s JSON-LD (SEO-008)" "curl -s https://$s.ronnascanner.com/ | grep -c 'application/ld+json'" "1"
    check "$s robots Sitemap (SEO-004)" "curl -s https://$s.ronnascanner.com/robots.txt | grep -c 'Sitemap:'" "1"
    check "$s sitemap loc (SEO-004)" "curl -s https://$s.ronnascanner.com/sitemap.xml | grep -c '<loc>'" "1"
    check "$s own og card (IMG-RONNASUB-OG-GENERIC)" "curl -s -o /dev/null -w '%{http_code}' https://$s.ronnascanner.com/og-card.png" "200"; done
  check "leads Load List await bug gone (RONNA-LOADLIST-AWAIT-BUG)" "curl -s https://leads.ronnascanner.com/js/app.js | grep -v '^ *//' | grep -c 'await (await import'" "0"
  for s in companies contacts emails prospects; do check "$s saveToFirestore defined (RONNA-LOADLIST-AWAIT-BUG class)" "curl -s https://$s.ronnascanner.com/js/app.js | grep -c 'async function saveToFirestore'" "1"; done
}
g_mdothree() {  # JSON-FIREBASE-IMPORT, JSON-CONSOLE-FIREBASE-SDK-NOT-LOADED, MDOTHREE-STRAY-FAVICON, -SIGNED-IN-BADGE, JSON-BEAUTIFY-EMPTY-SILENT, HASH-MOBILE-NAV-OVERFLOW, MDOTHREE-TRIAL-PATH-UNVERIFIED
  for t in json text pdf qr hash color password timestamp image; do deploy projects/mdothree/mdothree-$t; done
  deploy projects/mdothree/landing   # mdothree.com: C7-018 clean links (QW5 2b0033a), cleanUrls, legal   # image: cycle-8 QW1 footer (0663366)
  check "pdf stray favicon gone" "curl -s https://pdf.mdothree.com/ | grep -c '📄\" />'" "0"
  check "qr no 7-day trial" "curl -s https://qr.mdothree.com/pricing | grep -c '7-Day'" "0"
  check "color badge anon-safe" "curl -s https://color.mdothree.com/js/app.js | grep -q isAnonymous && echo yes" "yes"
  for t in color hash password timestamp; do   # cycle-8 P1 HID-001 + PROD-013 (Firebase lazy; tool works with gstatic blocked)
    check "$t firebase lazy (HID-001)" "c=\$(curl -s https://$t.mdothree.com/js/config/config.js); echo \"\$c\" | grep -q 'export function loadFirebase' && ! echo \"\$c\" | grep -q '^import .*gstatic' && echo yes" "yes"; done
  for t in json text pdf qr hash color password timestamp image; do   # cycle-8 QW1 C7-009
    check "$t footer Terms/Privacy/Contact (C7-009)" "curl -s https://$t.mdothree.com/ | grep -o 'mdothree.com/terms\|mdothree.com/privacy\|mailto:hello@mdothree.com' | sort -u | wc -l | tr -d ' '" "3"; done
  # cycle-8 QW5 (see documentation/MDO_CYCLE8_QW5_2026-10-11.md)
  for t in color hash password timestamp; do
    check "$t Pro pill contrast (C7B-PRO-BTN-INVISIBLE)" "curl -s https://$t.mdothree.com/css/styles.css | grep -q 'tool-nav a.pro-nav-link' && echo yes" "yes"
    check "$t footer styled (QW1 follow-up)" "curl -s https://$t.mdothree.com/css/styles.css | grep -q 'nav.footer-legal {' && echo yes" "yes"; done
  check "password needs >=1 charset (C7B-PW-NOSETS-EMPTY)" "curl -s https://password.mdothree.com/ | grep -c 'id=\"charsetMsg\"'" "1"
  check "color clears stale result (C7B-COLOR-STALE-RESULT)" "curl -s https://color.mdothree.com/js/pages/converter.js | grep -q 'function clearResult' && echo yes" "yes"
  check "text diff by grapheme (C7B-TEXTDIFF-SURROGATE)" "curl -s https://text.mdothree.com/js/services/textDiff.js https://text.mdothree.com/js/workers/diff-worker.js | grep -c 'Intl.Segmenter) ?'" "2"
  check "timestamp ISO week UTC (C7B-TS-WEEK)" "curl -s https://timestamp.mdothree.com/js/services/timestampConverter.js | grep -q 'ISO week (UTC)' && echo yes" "yes"
  check "text-diff row wraps (MDOTHREE-HSCROLL)" "curl -s https://text.mdothree.com/css/pages/text-diff.css | grep -q MDOTHREE-HSCROLL && echo yes" "yes"
  check "timestamp dur-grid stacks (MDOTHREE-HSCROLL)" "curl -s https://timestamp.mdothree.com/css/styles.css | grep -q MDOTHREE-HSCROLL && echo yes" "yes"
  check "qr level copy (C7B-QR-COPY)" "curl -s https://qr.mdothree.com/js/pages/generate.js | grep -c '(L or M)'" "0"
  # cycle-8 P1b A11Y-001/002 (color 3a41946 · timestamp 1807acb · pdf 6d91ed7 · image 3a1050c · qr 2073dc9 · hash e4ca6ab · password e2e8cb9 · text 838017d · json in mdo3d main)
  check "color #colorPicker named" "curl -s https://color.mdothree.com/ | grep -c 'aria-label=\"Pick a color\"'" "1"
  check "timestamp #dateInput + #tsUnit named" "curl -s https://timestamp.mdothree.com/ | grep -o 'aria-label=\"\(Date and time to convert\|Timestamp unit\)\"' | wc -l | tr -d ' '" "2"
  check "json #indent labelled" "curl -sL https://json.mdothree.com/format | grep -c 'for=\"indent\"'" "1"
  check "qr #errorLevel labelled" "curl -sL https://qr.mdothree.com/generate | grep -c 'for=\"errorLevel\"'" "1"
  check "pdf merge #fileInput named" "curl -sL https://pdf.mdothree.com/merge | grep -c 'aria-label=\"Choose PDF files\"'" "1"
  check "image compress #fileInput named" "curl -sL https://image.mdothree.com/compress | grep -c 'aria-label=\"Choose an image file\"'" "1"
  echo "  MANUAL: xps axe (rules label/select-name) on every mdothree tool page → 0 (pre-verified on HEAD: 69/69 pages)" | tee -a "$LOG"
  for t in json text image pdf qr; do
    check "$t robots no config Disallow (C7-012)" "curl -s https://$t.mdothree.com/robots.txt | grep -c 'js/config'" "0"
    check "$t home has no .html links (C7-018)" "curl -s https://$t.mdothree.com/ | grep -cE 'href=\"/?[a-z0-9-]+\\.html\"'" "0"; done
  # cycle-8 P2/P3 (see documentation/MDO_CYCLE8_P23_MDOTHREE_RONNA_2026-10-11.md)
  for t in json text pdf qr hash color password timestamp image; do
    check "$t no repo path in HTML (SURF-009)" "curl -s https://$t.mdothree.com/ | grep -c 'generated by projects/'" "0"
    check "$t sitemap no build lastmod (C7-013)" "curl -s https://$t.mdothree.com/sitemap.xml | grep -c '<lastmod>'" "0"
    check "$t footer links 44px (A11Y-013)" "curl -s https://$t.mdothree.com/css/styles.css | grep -q 'min-height: 44px' && echo yes" "yes"; done
  check "mdothree.com no repo path (SURF-009)" "curl -s https://mdothree.com/ | grep -c 'generated by projects/'" "0"
  check "mdothree.com <main> + skip link (A11Y-004/A11Y-015)" "curl -s https://mdothree.com/ | grep -c 'id=\"main\"\|class=\"skip-link\"'" "2"
  check "mdothree.com wordmark/emerald #047857 (A11Y-003)" "curl -s https://mdothree.com/css/styles.css | grep -c -- '--emerald: #047857'" "1"
  for t in color hash password timestamp; do
    check "$t emerald #047857 (A11Y-003)" "curl -s https://$t.mdothree.com/css/styles.css | grep -c -- '--emerald: #047857'" "1"
    check "$t paywall lock btn 5.5:1 (A11Y-003)" "curl -s https://$t.mdothree.com/js/services/paywallUI.js | grep -c 'background: #10B981; color: #fff'" "0"; done
  for t in json text pdf qr image; do
    check "$t light-mode emerald + logo suffix (A11Y-003)" "curl -s https://$t.mdothree.com/css/styles.css | grep -c 'nav-logo > span\[style\]'" "1"; done
  for t in pdf image qr; do
    check "$t drop zone single control (A11Y-011/A11Y-006)" "curl -s https://$t.mdothree.com/js/nav-toggle.js | grep -c \"zone.removeAttribute('role')\"" "1"; done
  check "hash crypto libs self-hosted (SURF-004)" "curl -s https://hash.mdothree.com/ | grep -c 'cdnjs.cloudflare.com'" "0"
  check "hash crypto-js served" "curl -s -o /dev/null -w '%{http_code}' https://hash.mdothree.com/js/vendor/crypto-js-4.2.0.min.js" "200"
  check "qr libs self-hosted (SURF-004)" "curl -s https://qr.mdothree.com/generate https://qr.mdothree.com/scan | grep -c 'cdn.jsdelivr.net/npm/\(qrcode\|jsqr\)'" "0"
  check "hash guest skips Firestore history (XB-005)" "curl -s https://hash.mdothree.com/js/services/hashStorage.js | grep -c 'user.isAnonymous) return _memHistory'" "1"
  check "qr no compat Firebase SDK (XB-004)" "curl -s https://qr.mdothree.com/ | grep -c 'firebase-app-compat'" "0"
  check "json landing no unused preconnects (PERF-009)" "curl -s https://json.mdothree.com/ | grep -c 'identitytoolkit\|js.stripe.com'" "0"
  # cycle-9 %24 (A11Y-010 text 6185d02 / qr 43ff447 / json cf4169b; PERF-007 cache headers + SW reload; FIREBASE-DUAL-SDK already in HEADs)
  check "text word-counter textarea named (A11Y-010)" "curl -sL https://text.mdothree.com/word-counter | grep -c 'aria-label=\"Text to count\"'" "1"
  check "text text-diff textA labelled (A11Y-010)" "curl -sL https://text.mdothree.com/text-diff | grep -c 'aria-labelledby=\"textALabel\"'" "1"
  check "qr generate emailBody label (A11Y-010)" "curl -sL https://qr.mdothree.com/generate | grep -c 'for=\"emailBody\"'" "1"
  check "json validate textarea labelled (A11Y-010)" "curl -sL https://json.mdothree.com/validate | grep -c 'aria-labelledby=\"inputJsonLabel\"'" "1"
  for t in json text pdf qr color hash password timestamp; do check "$t css Cache-Control 1d (PERF-007)" "curl -sI https://$t.mdothree.com/css/styles.css | grep -i '^cache-control' | tr -d '\r'" "max-age=86400, stale-while-revalidate=604800"; done
  for t in json text pdf qr color hash password timestamp; do check "$t sw precache reload (PERF-007)" "curl -s https://$t.mdothree.com/sw.js | grep -c \"cache: 'reload'\"" "1"; done
  for t in color hash password timestamp json text pdf qr; do check "$t no compat Firebase SDK (FIREBASE-DUAL-SDK)" "curl -sL https://$t.mdothree.com/ | grep -c firebase-app-compat" "0"; done
  # cycle-9 %24 MDOTHREE-SECHEADERS-NOT-SERVED (color 4b37d1c / hash 3df0cf1 / password 2979da8 / timestamp f58534f): headers as a route before filesystem
  for t in color hash password timestamp; do
    check "$t XFO served (MDOTHREE-SECHEADERS-NOT-SERVED)" "curl -sI https://$t.mdothree.com/ | grep -ic '^x-frame-options'" "1"
    check "$t CSP served (MDOTHREE-SECHEADERS-NOT-SERVED)" "curl -sI https://$t.mdothree.com/ | grep -ic '^content-security-policy'" "1"
  done
  echo "  MANUAL: open color/hash/password/timestamp once in a browser after deploy: 0 CSP violations in the console (Firestore/auth traffic)"
}
g_div() {  # NUMEROLOGY-NO-RECALC, PASTLIFE-INTEREST-IGNORED (fengshui + iching already live); oracle-cards: C7-020 share-script console.log removal
  deploy projects/divination/oracle/oracle-cards
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
  check "pastlife birth date/time labelled (A11Y-001)" "curl -s https://pastlife.mdo3d.com/ | grep -o 'for=\"pl-birth\(Date\|Time\)\"' | wc -l | tr -d ' '" "2"
  check "tarot health ping /api/health (C7-016)" "curl -s https://tarot.mdo3d.com/js/config/api.js | grep -c \"request('/api/health')\"" "1"
  for u in tarot-cards-api.vercel.app dream-interpreter-api-delta.vercel.app oracle-cards-api.vercel.app pastlives-api.vercel.app; do
    check "$u bad JSON -> 400 JSON (C7-002)" "curl -s -w ' %{http_code}' -X POST -H 'content-type: application/json' --data '{\"x\":' https://$u/api/payment/verify" "Malformed JSON in request body\"} 400"
    check "$u 200KB -> 413 JSON (C7-003)" "printf '{\"sessionId\":\"%204800s\"}' '' | curl -s -w ' %{http_code}' -X POST -H 'content-type: application/json' --data-binary @- https://$u/api/payment/verify" "Request body too large\"} 413"
    check "$u unknown -> 404 JSON (C7-017)" "curl -s -w ' %{http_code}' https://$u/api/zz-nope" "Not found\"} 404"
    check "$u wrong method -> 405 JSON (C7-017)" "curl -s -w ' %{http_code}' https://$u/api/payment/verify" "not allowed\"} 405"; done
}

g_b26() {  # Builder %26 cycle-8 P2/P3 (batch 1 + batch 2 A11Y-004/015/005, PERF-003/004): C7-011 (rigor) · C7-019 · C7-020 · C7B-NUMEROLOGY-FUTURE-DATE · C7B-ASTRO-NO-VALIDATION · C7B-DREAMS-MAXLEN · A11Y-014(dreams) · IMG-RONNA-MANIFEST-ICONS-404 · SEO-009(ronna) · TABLET-MDO3D-NAV-HAMBURGER · C7-007(mdo3d) · A11Y-005(mdo3d) · PERF-006(mdo3d) · SEO-006(prompts)
  # 1) push nested repos (token-free URL via gh credential helper, mdothree account). For the git-connected
  #    projects (astrology, feng-shui-analyzer, past-life-insights, baby-name-oracle, mdo3d-landing, ronnascanner-landing,
  #    promptsforbusiness, if connected) THE PUSH IS THE PROD DEPLOY. Rollback = `git revert <sha> && push` in that repo.
  local r slug
  for r in projects/rigor/{resume,cover,interview,linkedin,networking,portfolio,salary} \
           projects/divination/astrology/astrology projects/divination/fengshui/feng-shui-analyzer \
           projects/divination/iching/iching projects/divination/runes/runes projects/rigor/landing \
           projects/divination/pastlives/past-life-insights projects/jarvisbee/babynames/baby-name-oracle \
           projects/mdo3d/landing projects/mdo3d/promptsforbusiness projects/ronnascanner/frontend; do
    slug=$(git -C "$ROOT/$r" remote get-url origin | sed -E 's#^https://([^@]*@)?github.com/##; s#\.git$##')
    br=$(git -C "$ROOT/$r" rev-parse --abbrev-ref HEAD)
    ( cd "$ROOT/$r" && git pull -q --rebase "https://mdothree@github.com/$slug.git" "$br" && git push -q "https://mdothree@github.com/$slug.git" "HEAD:$br" ) \
      && echo "  pushed $r ($slug@$(git -C "$ROOT/$r" log -1 --format=%h))" | tee -a "$LOG" || echo "  PUSH FAIL $r" | tee -a "$LOG"
  done
  # 2) CLI deploys for apps that live in the parent repo (rollback lines recorded by deploy())
  for d in projects/divination/{numerology/numerology-app,dreams/dream-interpreter,oracle/oracle-cards,tarot/tarot-cards}; do deploy $d; done
  sleep 60   # let git-triggered builds finish
  # 3) verify
  for h in numerology dreams oracle tarot fengshui pastlife names; do check "$h /index.html → 308" "curl -s -o /dev/null -w '%{http_code}' https://$h.mdo3d.com/index.html" "308"; done
  check "oracle no 'Save readings' claim" "curl -s https://oracle.mdo3d.com/ | grep -ci 'save readings'" "0"
  check "numerology future-date guard" "curl -s https://numerology.mdo3d.com/js/app.js | grep -c validateBirthDate" "3"
  check "astrology needs-birth-time" "curl -s https://astrology.mdo3d.com/js/app.js | grep -q 'Needs birth time' && echo yes" "yes"
  check "dreams focus-visible" "curl -s https://dreams.mdo3d.com/css/styles.css | grep -q focus-visible && echo yes" "yes"
  for t in resume cover interview linkedin networking portfolio salary; do check "$t auth autocomplete" "curl -s https://$t.rigor.design/ | grep -c 'autocomplete=\"current-password\"'" "1"; done
  check "mdo3d no twitter link" "curl -s https://mdo3d.com/ | grep -c 'twitter.com/mdo3d\"'" "0"
  check "mdo3d footer h3" "curl -s https://mdo3d.com/ | grep -c '<h4'" "0"
  check "ronna manifest.json resolves" "curl -s -o /dev/null -w '%{http_code}' -L https://ronnascanner.com/manifest.json" "200"
  check "ronna sitemap lists tools" "curl -s https://ronnascanner.com/sitemap.xml | grep -c 'ronnascanner.com/</loc>'" "6"
  check "prompts title ≤60" "curl -s https://promptsforbusiness.com/ | grep -o '<title>[^<]*' | awk '{print (length(\$0)-7<=60)?\"ok\":\"long\"}'" "ok"
  # batch 2: A11Y-004 / A11Y-015 / A11Y-005 (fengshui, pastlife) · PERF-003 (rigor lazy Firebase) · PERF-004 (dreams/tarot = 78faa2d, deploy-only)
  for t in resume cover interview linkedin networking portfolio salary; do
    check "$t one <main>" "curl -s https://$t.rigor.design/ | grep -c '<main'" "1"
    check "$t lazy Firebase" "curl -s https://$t.rigor.design/js/config/firebase.js | grep -q loadFirebase && echo yes" "yes"; done
  for u in rigor.design ronnascanner.com mdo3d.com/about astrology.mdo3d.com iching.mdo3d.com runes.mdo3d.com dreams.mdo3d.com tarot.mdo3d.com oracle.mdo3d.com numerology.mdo3d.com fengshui.mdo3d.com pastlife.mdo3d.com names.mdo3d.com; do
    check "$u skip link" "curl -sL https://$u | grep -c 'href=\"#main-content\"'" "1"; done
  for h in dreams tarot; do check "$h no firebase compat (PERF-004)" "curl -s https://$h.mdo3d.com/ | grep -c 'firebase-.*-compat'" "0"; done
  echo "  MANUAL: xps browser pass at mdo3d.com 768/834/1024 (full nav, no overflow) — pre-verified on HEAD 2026-10-11" | tee -a "$LOG"
}
[ $# -eq 0 ] && { sed -n 2,8p "$0"; exit 1; }
for g in "$@"; do
  case $g in
    all) g_rigor; g_runwae; g_ronna; g_mdothree; g_div;;   # c8qw and b26 are separate: run them explicitly
    rigor|runwae|ronna|mdothree|div|c8qw|b26) "g_$g";;
    *) echo "unknown group $g";;
  esac
done
echo "deploys ok=$ok fail=$fail — log: $LOG — rollback: bash $RB (or run single lines from it)"
