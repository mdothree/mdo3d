#!/usr/bin/env bash
# 01_rigor.sh — MDO GO bundle 2026-10-14, P0 #1 (rigor.design charges $9.99/mo and grants nothing).
#
# WHAT IT CHANGES
#   A. Pushes (fast-forward only) and redeploys the 7 rigor tools + the rigor.design landing from `main`.
#      main = the gated build: PRO_CHECKOUT_ENABLED default "false" → every Pro CTA reads "Pro — coming soon",
#      no buy.stripe.com href anywhere. Live salary + networking still link Payment Link …804 today (their
#      live env.js predates the gate); portfolio shows "⚡ Upgrade". This stage removes that.
#      Also ships the P1 rigor items committed 2026-10-14: privacy/terms/refunds/contact footer links on the
#      hub + 7 tools (mdo3d.com policy pages), and the dark-mode navy-on-dark contrast fix (salary, networking,
#      portfolio, linkedin).
#   B. api.rigor.design: deploys rigor-api (q7/paid-path, pinned SHA) to Vercel project `rigor` via
#      ../rigor_fix/RIGOR_GO.sh in the new `api` mode (preflight → unlink landing repo → domain → DNS → deploy
#      → verify /health 200, anon 401s, unsigned webhook 400). The tools are NOT switched to checkout-on here.
#      Stage B needs the env NAMES in ../rigor_fix/SECRETS_NEEDED.md set first (Principal) — the preflight
#      refuses otherwise. Stage A does not depend on B.
#
# NOT DONE HERE (Principal-only, Stripe dashboard): deactivating Payment Link …804 (plink_1TEwCo…). See README.
#   This script never calls a Stripe write API; RIGOR_GO.sh only GETs.
#
# USAGE (needs: git, curl, jq, vercel CLI; VERCEL_TOKEN_MDO3 in ~/latarence/secrets/sega_credentials.env)
#   bash 01_rigor.sh check        read-only: refs, live state, what would change
#   bash 01_rigor.sh tools        Stage A (push + deploy landing + 7 tools, verify)
#   bash 01_rigor.sh api          Stage B (RIGOR_GO.sh check, then RIGOR_GO.sh api)
#   bash 01_rigor.sh verify       re-run all verifications only
# Build runs on Vercel (buildCommand = node scripts/health-stamp.mjs, no deps). Nothing builds locally.
#
# ROLLBACK
#   Stage A: `vercel rollback <previous-deployment-url> --token $VERCEL_TOKEN_MDO3 --scope $TEAM` per project
#            (the previous production URL is logged below before each deploy), or `vercel promote <url>`.
#            Note: rolling back salary/networking re-exposes the …804 link — prefer fix-forward.
#   Stage B: RIGOR_GO.sh logs the before-state production deployment of project `rigor`; promote it back
#            with `vercel promote <url>`. (The previous state was the landing page serving 404 on /api/*.)
set -euo pipefail
MODE=${1:-}
HERE=$(cd "$(dirname "$0")" && pwd)
RIGOR=${RIGOR_DIR:-$HOME/mdo3d/projects/rigor}
LOG=$HERE/01_rigor.log
TEAM=team_DXUPiQz3KkYmyhAgmT99OQQr
TOOLS="resume cover interview linkedin networking portfolio salary"
log(){ echo "$(date -u +%FT%TZ) $*" | tee -a "$LOG"; }
fail=0; chk(){ if [ "$2" = "$3" ]; then log "  PASS $1 ($2)"; else log "  FAIL $1 (got ${2:-<empty>}, want $3)"; fail=$((fail+1)); fi; }
[[ "$MODE" =~ ^(check|tools|api|verify)$ ]] || { sed -n 2,35p "$0"; exit 1; }
for b in git curl jq; do command -v $b >/dev/null || { echo "$b missing"; exit 1; }; done

set +u; source ~/latarence/secrets/sega_credentials.env >/dev/null 2>&1 || true; set -u
VT="${VERCEL_TOKEN_MDO3:-}"   # never echoed

verify_tools(){
  log "[verify] no page offers a buyable upgrade; legal links present"
  for t in $TOOLS; do
    U="https://$t.rigor.design"
    chk "$t / 200" "$(curl -s -o /dev/null -w '%{http_code}' $U/)" 200
    chk "$t no buy.stripe.com in HTML" "$(curl -sL $U/ | grep -c 'buy.stripe.com' || true)" 0
    chk "$t no buy.stripe.com in JS" "$(for f in js/app.js js/config/env.js js/services/paymentService.js js/services/paywallUI.js; do curl -s $U/$f; done | grep -c 'buy.stripe.com' || true)" 0
    chk "$t gate shipped (checkout default false)" "$(curl -s $U/js/config/env.js | grep -c 'VITE_PRO_CHECKOUT_ENABLED", "false"' || true)" 1
    chk "$t footer legal links" "$(curl -s $U/ | grep -c 'footer-legal' || true)" 1
    want=$(git -C "$RIGOR/$t" rev-parse HEAD)
    chk "$t deployed commit (health.json)" "$(curl -s $U/health.json | jq -r '.commit // empty')" "$want"
  done
  chk "rigor.design / 200" "$(curl -s -o /dev/null -w '%{http_code}' https://rigor.design/)" 200
  chk "rigor.design no buy.stripe.com" "$(curl -sL https://rigor.design/ | grep -c 'buy.stripe.com' || true)" 0
  chk "rigor.design legal links" "$(curl -s https://rigor.design/ | grep -c 'mdo3d.com/privacy' || true)" 1
  for p in privacy terms refund contact; do chk "mdo3d.com/$p 200" "$(curl -s -o /dev/null -w '%{http_code}' https://mdo3d.com/$p)" 200; done
  log "  MANUAL ▶ one browser pass on salary/networking/portfolio (desktop + dark mode): Pro button says 'Pro — coming soon',"
  log "           clicking shows the inline notice (no Stripe), headings 'The Offer'/'Your Background' + wordmark readable."
}
verify_api(){
  log "[verify] api.rigor.design answers"
  A=https://api.rigor.design; O="Origin: https://resume.rigor.design"
  chk "api /health 200" "$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 $A/health)" 200
  chk "api OPTIONS 204" "$(curl -s -o /dev/null -w '%{http_code}' -X OPTIONS -H "$O" -H 'Access-Control-Request-Method: POST' $A/api/analyze)" 204
  chk "api anon analyze 401 (route exists)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "$O" -H 'Content-Type: application/json' -d '{}' $A/api/analyze)" 401
  chk "api unsigned webhook 400" "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{}' $A/api/payment/webhook)" 400
}

case $MODE in
check)
  log "=== 01_rigor check (read-only) ==="
  for t in landing $TOOLS; do
    git -C "$RIGOR/$t" fetch -q origin
    ab=$(git -C "$RIGOR/$t" rev-list --left-right --count origin/main...main | tr '\t' ' ')
    log "  rigor-$t local main $(git -C "$RIGOR/$t" rev-parse --short main) vs origin/main: behind/ahead=$ab (want '0 1': fast-forward)"
    [ -z "$(git -C "$RIGOR/$t" status --porcelain)" ] || log "  WARN rigor-$t working tree dirty (only committed HEAD is deployed)"
  done
  for t in $TOOLS; do log "  live $t: buy.stripe=$(curl -s https://$t.rigor.design/ | grep -c buy.stripe || true) gate-in-env.js=$(curl -s https://$t.rigor.design/js/config/env.js | grep -c PRO_CHECKOUT_ENABLED || true)"; done
  log "  live api.rigor.design/health = $(curl -s -o /dev/null -w '%{http_code}' https://api.rigor.design/health)"
  [ -n "$VT" ] && log "  VERCEL_TOKEN_MDO3 present" || log "  VERCEL_TOKEN_MDO3 MISSING"
  log "  Stage B preflight: bash $HOME/mdo3d/staged/rigor_fix/RIGOR_GO.sh check" ;;
tools)
  [ -n "$VT" ] || { log "VERCEL_TOKEN_MDO3 missing"; exit 1; }
  command -v vercel >/dev/null || { log "vercel CLI missing"; exit 1; }
  ok=${GO_CONFIRM:-}; [ -n "$ok" ] || read -r -p "Push + deploy rigor landing + 7 tools (gated build) to production? Type GO: " ok
  [ "$ok" = GO ] || { log "no GO"; exit 1; }
  log "=== 01_rigor tools ==="
  W=$(mktemp -d "${TMPDIR:-/tmp}/rigor01.XXXXXX")
  for t in landing $TOOLS; do
    d="$RIGOR/$t"
    git -C "$d" fetch -q origin
    git -C "$d" merge-base --is-ancestor origin/main main || { log "rigor-$t: origin/main moved past local main — rebase by hand, never force"; exit 1; }
    git -C "$d" push -q origin main:main && log "  pushed rigor-$t main → $(git -C "$d" rev-parse --short main)"
  done
  # landing: project rigor-landing is git-connected (deploymentEnabled main) → the push above deploys it.
  log "  rigor-landing deploys from the push (git-connected); polling rigor.design for the legal links"
  for i in $(seq 1 30); do curl -s https://rigor.design/ | grep -q 'mdo3d.com/privacy' && break; sleep 10; done
  for t in $TOOLS; do
    d="$W/$t"; mkdir -p "$d"
    git -C "$RIGOR/$t" archive --format=tar main | tar -x -C "$d"   # committed tree only; export-subst fills source-commit.txt
    mkdir -p "$d/.vercel"; cp "$RIGOR/$t/.vercel/project.json" "$d/.vercel/project.json"
    pid=$(jq -r .projectId "$d/.vercel/project.json")
    prev=$(curl -s -H "Authorization: Bearer $VT" "https://api.vercel.com/v6/deployments?projectId=$pid&target=production&state=READY&limit=1&teamId=$TEAM" | jq -r '.deployments[0].url // "none"')
    log "  rigor-$t previous production (rollback target): $prev"
    out=""; for n in 1 2 3; do out=$(cd "$d" && vercel deploy --prod --yes --token "$VT" 2>&1 | grep -E 'Production:|Error' | tail -1) && [[ $out == *Production:* ]] && break; sleep 10; done
    log "  rigor-$t :: $out"
  done
  rm -rf "$W"; sleep 20
  verify_tools
  log "=== tools done: fail=$fail ==="; [ $fail = 0 ] ;;
api)
  bash "$HOME/mdo3d/staged/rigor_fix/RIGOR_GO.sh" check
  RIGOR_GO_CONFIRM=${GO_CONFIRM:-} bash "$HOME/mdo3d/staged/rigor_fix/RIGOR_GO.sh" api
  verify_api; log "=== api done: fail=$fail ==="; [ $fail = 0 ] ;;
verify)
  verify_tools; verify_api; log "=== verify: fail=$fail ==="; [ $fail = 0 ] ;;
esac
