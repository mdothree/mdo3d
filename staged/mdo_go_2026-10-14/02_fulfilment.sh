#!/usr/bin/env bash
# 02_fulfilment.sh — LayoffLeads Pro + Prompts for Business automatic fulfilment (MDO GO bundle 2026-10-14, P0 #2).
#
# WHAT IT CHANGES
#   - Deploys projects/mdo3d/stripe-hub (Vercel) with the new in-process "fulfilment" service:
#       checkout.session.completed (payment_status=paid) on any of the 15 Payment Links (2 LayoffLeads Pro + 12 packs
#       + 1 bundle) -> customer email with signed, expiring download link(s) -> internal sale-alert email.
#     Code: stripe-hub/src/fulfilment/index.js, src/router.js (payment_link routing), src/server.js (handler +
#     GET /api/fulfil/download), routes.json ("fulfilment"), scripts/build-fulfilment.mjs, test/fulfilment.test.mjs.
#   - TEST MODE ONLY: live events are ignored and a live key is refused unless FULFIL_ALLOW_LIVE=1. Going live is a
#     separate Principal GO (phase `live` below prints the steps; it changes nothing by itself).
#   - After a verified test purchase, phase `sitecopy` merges branch fulfilment/instant-delivery in layoffleads and
#     promptsforbusiness ("within 1 business day" -> instant download link) and deploys those two static sites.
#     Do NOT run `sitecopy` before live fulfilment is on: the copy must stay true.
#
# WHERE TO RUN: bigmini2 (build host) with node >= 18, npm, the Vercel CLI and the Stripe CLI.
#   Never on the laptop (control-only) or bigmini (disk floor). The script refuses those two hosts.
#
# PHASES
#   bash 02_fulfilment.sh prep       LAPTOP: push the origin-based branches (mdo3d mdo-go-2026-10-14-fulfilment,
#                                    layoffleads/promptsforbusiness fulfilment/instant-delivery-origin) + bigmini2 clone steps
#   bash 02_fulfilment.sh check      read-only: host, tools, env NAMES present (values never printed), tests (no deps)
#   bash 02_fulfilment.sh build      npm ci + full tests + build catalog and private/ download files
#   bash 02_fulfilment.sh deploy     vercel deploy --prod of stripe-hub (needs MDO_GO_CONFIRM=GO)
#   bash 02_fulfilment.sh verify     smoke checks on the deployed hub + the manual test-purchase walk
#   bash 02_fulfilment.sh sitecopy   merge + deploy the honest instant-delivery copy (only after live is on)
#   bash 02_fulfilment.sh live       prints the live-mode GO steps (Principal); changes nothing
#   bash 02_fulfilment.sh rollback   vercel rollback of stripe-hub; Stripe endpoint disable steps
#
# ENV VARS (set on the Vercel project "mdo3d-stripe-hub" with `vercel env add <NAME> production`; NAMES only here):
#   STRIPE_WEBHOOK_SECRET_MDO3   signing secret of the TEST-mode hub endpoint .../api/stripe/webhook/mdo3
#   STRIPE_SECRET_KEY_FULFIL     TEST restricted key (rk_test_/sk_test_): Events, Checkout Sessions, Payment Links = read;
#                                Subscriptions + PaymentIntents = write (metadata marker only)
#   FULFIL_DOWNLOAD_SECRET       random 32+ bytes (openssl rand -base64 48), signs download links
#   FULFIL_PUBLIC_URL            the hub's public URL, e.g. https://mdo3d-stripe-hub.vercel.app
#   FULFIL_EMAIL_API_KEY         Resend API key; layoffleads.com + promptsforbusiness.com verified as sending domains
#   FULFIL_FROM_LAYOFFLEADS      e.g. "LayoffLeads <orders@layoffleads.com>"
#   FULFIL_FROM_PFB              e.g. "Prompts for Business <orders@promptsforbusiness.com>"
#   FULFIL_ALERT_TO              internal sale-alert inbox
#   FULFIL_LINK_MAP              JSON {"plink_<test link id>":"pfb-linkedin-week", ...} for the test-mode links
#   (later, live GO only) FULFIL_ALLOW_LIVE=1 and a live STRIPE_SECRET_KEY_FULFIL + live webhook secret
# Local token file (read by variable, never echoed): ~/latarence/secrets/sega_credentials.env -> VERCEL_TOKEN_MDO3
set -euo pipefail
MODE=${1:-}
HERE=$(cd "$(dirname "$0")" && pwd)
MDO=${MDO_ROOT:-$HOME/mdo3d}
HUB=$MDO/projects/mdo3d/stripe-hub
LL=$MDO/projects/mdo3d/layoffleads
PFB=$MDO/projects/mdo3d/promptsforbusiness
TEAM=team_DXUPiQz3KkYmyhAgmT99OQQr
LOG=$HERE/02_fulfilment.log
REQ_ENV="STRIPE_WEBHOOK_SECRET_MDO3 STRIPE_SECRET_KEY_FULFIL FULFIL_DOWNLOAD_SECRET FULFIL_PUBLIC_URL FULFIL_EMAIL_API_KEY FULFIL_FROM_LAYOFFLEADS FULFIL_FROM_PFB FULFIL_ALERT_TO"

log() { echo "$(date -u +%FT%TZ) $*" | tee -a "$LOG"; }
die() { log "STOP: $*"; exit 1; }
usage() { sed -n 2,40p "$0"; exit 1; }

host_guard() {
  case "$(hostname -s 2>/dev/null || hostname)" in
    *MacBook*|*macbook*) die "laptop is control-only; run this on bigmini2" ;;
    bigmini|bigmini.*)   die "never build on bigmini (disk floor); run this on bigmini2" ;;
  esac
}
load_tokens() {
  # shellcheck disable=SC1090
  source "$HOME/latarence/secrets/sega_credentials.env" >/dev/null 2>&1 || true
  VT="${VERCEL_TOKEN_MDO3:-}"
}
vc() { vercel --token "$VT" --scope "$TEAM" "$@"; }

check() {
  host_guard
  for b in node npm git curl; do command -v $b >/dev/null || die "$b missing"; done
  node -e 'process.exit(+process.versions.node.split(".")[0] < 18)' || die "node >= 18 required"
  log "[check] dependency-free tests (fulfilment + router)"
  (cd "$HUB" && node --test test/*.test.mjs) | tee -a "$LOG"
  load_tokens
  if [ -n "$VT" ] && command -v vercel >/dev/null && [ -d "$HUB/.vercel" ]; then
    log "[check] env NAMES on the Vercel project (values are not printed)"
    names=$(cd "$HUB" && vc env ls production 2>/dev/null | awk '{print $1}')
    miss=""; for n in $REQ_ENV; do echo "$names" | grep -qx "$n" || miss="$miss $n"; done
    [ -z "$miss" ] && log "  PASS all required env names present" || log "  MISSING:$miss (Principal/setup row [mdo-fulfil-env])"
  else
    log "  SKIP env check (no VERCEL_TOKEN_MDO3, no vercel CLI, or hub not linked yet: vercel link --project mdo3d-stripe-hub)"
  fi
  log "[check] ok"
}

build() {
  host_guard
  log "[build] npm ci + tests + catalog/private files"
  (cd "$HUB" && npm ci --no-audit --no-fund 2>/dev/null || npm install --no-audit --no-fund) | tail -2
  (cd "$HUB" && npm test) | tee -a "$LOG"
  (cd "$HUB" && node scripts/build-fulfilment.mjs) | tee -a "$LOG"
  (cd "$HUB" && git -C "$MDO" diff --quiet -- projects/mdo3d/stripe-hub/src/fulfilment/catalog.json) \
    || die "catalog.json changed vs commit: a Payment Link changed in site.config.json; review + commit first"
  ls -la "$HUB/private/layoffleads" "$HUB/private/pfb" | tee -a "$LOG"
}

deploy() {
  host_guard
  [ "${MDO_GO_CONFIRM:-}" = GO ] || die "set MDO_GO_CONFIRM=GO (Principal's GO for payments/email deploy)"
  load_tokens; [ -n "$VT" ] || die "VERCEL_TOKEN_MDO3 missing"
  [ -f "$HUB/private/layoffleads/layoffleads-full-history.csv" ] || die "run 'build' first"
  check
  [ -d "$HUB/.vercel" ] || (cd "$HUB" && vc link --yes --project mdo3d-stripe-hub)   # creates/links the project once
  log "[deploy] stripe-hub -> production"
  prev=$(cd "$HUB" && vc ls --prod 2>/dev/null | awk '/https:/{print $2; exit}' || true)
  echo "$prev" > "$HERE/02_fulfilment.prev_deploy"
  log "  previous prod deployment recorded in 02_fulfilment.prev_deploy"
  url=$(cd "$HUB" && vc deploy --prod --yes)
  log "  deployed: $url"
}

verify() {
  load_tokens
  base="${FULFIL_PUBLIC_URL:-}"; [ -n "$base" ] || die "export FULFIL_PUBLIC_URL=<hub url> (not secret) for verify"
  fails=0
  t() { if [ "$2" = "$3" ]; then log "  PASS $1"; else log "  FAIL $1 (got $2, want $3)"; fails=$((fails+1)); fi; }
  log "[verify] automated smoke"
  t "health 200"             "$(curl -s -o /dev/null -w '%{http_code}' "$base/api/health")" 200
  t "health lists fulfilment" "$(curl -s "$base/api/health" | grep -c '"fulfilment"')" 1
  t "unsigned webhook 400"   "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{}' "$base/api/stripe/webhook/mdo3")" 400
  t "bad download token 403" "$(curl -s -o /dev/null -w '%{http_code}' "$base/api/fulfil/download?t=bad.token")" 403
  cat <<EOF | tee -a "$LOG"

[verify] MANUAL test-purchase walk (Stripe TEST mode only; never live):
  1. Stripe dashboard (MDO3 account) -> switch to Test mode -> Developers -> Webhooks -> Add endpoint
       $base/api/stripe/webhook/mdo3
     events: checkout.session.completed, checkout.session.async_payment_succeeded
     copy its signing secret into STRIPE_WEBHOOK_SECRET_MDO3 on the Vercel project (redeploy).
  2. In Test mode create two Payment Links (or: stripe payment_links create with a TEST key):
       one recurring \$49/mo "LayoffLeads Pro (test)", one \$14 "Pack (test)".
     Put their plink ids in FULFIL_LINK_MAP, e.g.
       {"plink_TEST1":"layoffleads-pro-monthly","plink_TEST2":"pfb-linkedin-week"}  (redeploy)
  3. Open each test link, pay with 4242 4242 4242 4242, any future date, any CVC, a mailbox you can read.
  4. Expect within a minute: (a) customer email with a download link that downloads the CSV / .md;
     (b) "[sale TEST] ..." alert at FULFIL_ALERT_TO; (c) hub log line msg=fulfil_done delivered=true.
       vercel logs <deployment> --token ... | grep -E 'fulfil_|stripe_hub_event'
  5. Idempotent replay: Stripe dashboard -> the event -> "Resend" (or: stripe events resend <evt_id>
     --webhook-endpoint <we_id>). Expect 200, log {duplicate:true}, NO second email.
  6. Link expiry/tamper: edit one character of the token -> 403 page.
  7. A live-mode event must log fulfil_live_blocked (nothing sent) while FULFIL_ALLOW_LIVE is unset.
EOF
  [ "$fails" = 0 ] || { log "[verify] automated smoke FAILED ($fails) — see rollback"; exit 2; }
  log "[verify] automated smoke passed; complete the manual walk above"
}

sitecopy() {
  [ "${MDO_GO_CONFIRM:-}" = GO ] || die "set MDO_GO_CONFIRM=GO"
  [ "${FULFIL_LIVE_VERIFIED:-}" = 1 ] || die "only after LIVE fulfilment is on and verified (set FULFIL_LIVE_VERIFIED=1)"
  # Both sites are git-deployed (Vercel deploymentEnabled: main). Fast-forward main to the origin-based branch;
  # the push deploys. Runs from any host with the branches pushed (see `prep`); no local build.
  for r in layoffleads promptsforbusiness; do
    w=$(mktemp -d); git clone -q "https://github.com/mdothree/$r.git" "$w/$r"
    git -C "$w/$r" fetch -q origin fulfilment/instant-delivery-origin
    # The branch is one commit on top of an older main (the LL daily data job and 05_quickwins push to main):
    # replay that one commit onto the current main; stop on any conflict (never force).
    git -C "$w/$r" checkout -q -B sitecopy origin/main
    git -C "$w/$r" -c user.name=MDO3 -c user.email=mdo3group@gmail.com cherry-pick FETCH_HEAD >/dev/null \
      || die "$r: the copy commit no longer applies to main; resolve by hand (never force)"
    log "[sitecopy] $r main <- copy commit ($(git -C "$w/$r" rev-parse --short HEAD)); previous main $(git -C "$w/$r" rev-parse --short origin/main) = rollback target (git revert)"
    git -C "$w/$r" push -q origin HEAD:refs/heads/main; rm -rf "$w"
  done
  sleep 120
  for u in https://layoffleads.com/pricing https://promptsforbusiness.com/thanks; do
    curl -s "$u" | grep -qi "business day" && log "  WARN $u still mentions 'business day'" || log "  PASS $u copy updated"
  done
}

prep() {
  # LAPTOP (control step, no build): push the three origin-based branches this bundle prepared. Branch pushes only.
  local S=$HOME/mdo3d/staged/mdo_go_2026-10-14
  git -C "$S/wt-fulfil-top" push -q origin mdo-go-2026-10-14-fulfilment
  git -C "$S/wt-fulfil-layoffleads" push -q origin fulfilment/instant-delivery-origin
  git -C "$S/wt-fulfil-promptsforbusiness" push -q origin fulfilment/instant-delivery-origin
  log "[prep] pushed. On bigmini2:"
  cat <<'EOF'
    rm -rf ~/mdo-go-fulfil && git clone -q -b mdo-go-2026-10-14-fulfilment https://github.com/mdothree/mdo3d.git ~/mdo-go-fulfil
    git clone -q https://github.com/mdothree/layoffleads.git ~/mdo-go-fulfil/projects/mdo3d/layoffleads
    git clone -q https://github.com/mdothree/promptsforbusiness.git ~/mdo-go-fulfil/projects/mdo3d/promptsforbusiness
    scp laptop:~/mdo3d/staged/mdo_go_2026-10-14/02_fulfilment.sh ~/mdo-go-fulfil/   # or copy the bundle
    MDO_ROOT=~/mdo-go-fulfil bash ~/mdo-go-fulfil/02_fulfilment.sh check   # then build / deploy / verify
EOF
}

live() {
  cat <<'EOF'
LIVE GO (Principal only; nothing here runs automatically):
  1. Stripe (MDO3, LIVE): Developers -> Webhooks -> add endpoint <hub>/api/stripe/webhook/mdo3 with
     checkout.session.completed + checkout.session.async_payment_succeeded; put its secret in
     STRIPE_WEBHOOK_SECRET_MDO3 (production env), replacing the test one.
  2. Create a LIVE restricted key (same permissions as the test key) -> STRIPE_SECRET_KEY_FULFIL.
  3. vercel env add FULFIL_ALLOW_LIVE production   (value 1); remove FULFIL_LINK_MAP. Redeploy.
  4. First live sale: confirm the alert + customer email, then run `sitecopy` with FULFIL_LIVE_VERIFIED=1.
  Also: Stripe public business name (setup row [mdo-stripe-brand]) so checkout no longer shows a personal name.
EOF
}

rollback() {
  load_tokens; [ -n "$VT" ] || die "VERCEL_TOKEN_MDO3 missing"
  prev=$(cat "$HERE/02_fulfilment.prev_deploy" 2>/dev/null || true)
  if [ -n "$prev" ]; then (cd "$HUB" && vc rollback "$prev" --yes); log "[rollback] hub rolled back to $prev"
  else log "[rollback] no previous prod deployment (first deploy): run 'vercel remove' on the new deployment or disable the endpoint"; fi
  cat <<'EOF'
  Also: Stripe dashboard -> Webhooks -> the hub endpoint -> Disable (stops all forwarding immediately).
  Fulfilment falls back to the manual path (layoffleads/README "Turning on Pro" step 6, promptsforbusiness/README
  "Paid delivery"). If `sitecopy` ran: git -C <repo> revert -m 1 <merge commit> && redeploy each site.
EOF
}

case "$MODE" in
  check) check ;; build) build ;; deploy) deploy ;; verify) verify ;;
  sitecopy) sitecopy ;; prep) prep ;; live) live ;; rollback) rollback ;; *) usage ;;
esac
