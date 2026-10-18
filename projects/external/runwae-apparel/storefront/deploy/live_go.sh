#!/bin/sh
# Put one apparel shop live as a static shop on Vercel: every item "Not available", checkout OFF, then verify 200.
# Standing-authorized surface (web pages + DNS). No Stripe, no forms beyond the stubbed notify/order lookup.
#
#   VERCEL_TOKEN=… sh deploy/live_go.sh <brand>          brand: buttsstudios | glb | ridgefield | runwae
#   VERCEL_TOKEN=… VERCEL_SCOPE=<team> sh deploy/live_go.sh glb
#
# Refuses to run until `node tools/launch_check.mjs <brand>` says READY (mailing address, governing-law state and a
# working contact inbox are confirmed in brands/<brand>/brand.json). Run on a host with node >= 20 and the vercel CLI
# (not bigmini, not the laptop). Log: deploy/live_go.log
#
# ROLLBACK: `vercel rollback --token … <previous deployment>` for the project, or remove the domain from the project
# (`vercel domains rm <domain>`) and restore the DNS records noted in the log before this run.
set -eu
cd "$(dirname "$0")/.."
B=${1:?usage: sh deploy/live_go.sh <buttsstudios|glb|ridgefield|runwae>}
LOG="$(pwd)/deploy/live_go.log"
log() { echo "$(date -u +%FT%TZ) [$B] $*" | tee -a "$LOG"; }
: "${VERCEL_TOKEN:?export VERCEL_TOKEN for the Vercel account that hosts the shops}"
SCOPE=${VERCEL_SCOPE:+--scope "$VERCEL_SCOPE"}
case "$B" in
  buttsstudios) PROJECT=shop-buttsstudios; DOMAINS="store.buttsstudios.com" ;;
  ridgefield)   PROJECT=shop-ridgefield;   DOMAINS="store.ridgefieldtech.com" ;;
  glb)          PROJECT=shop-glb;          DOMAINS="girlslovebutts.com www.girlslovebutts.com" ;;
  runwae)       PROJECT=runwae-apparel;    DOMAINS="runwaeapparel.com www.runwaeapparel.com" ;;
  *) echo "unknown brand $B"; exit 2 ;;
esac

log "launch check"
node tools/launch_check.mjs "$B" | tee -a "$LOG"
log "test suite"
node --test test/*.test.mjs >/dev/null 2>&1 || { log "tests failed; stopping"; exit 1; }
log "local live build (checkout stays off: CHECKOUT_ENABLED is never set by this script)"
node src/build.mjs --brand "$B" --live --out "dist/live-$B" >/dev/null
grep -q 'seed-preview' "dist/live-$B/index.html" && { log "preview banner still present; stopping"; exit 1; }

log "deploy to Vercel project $PROJECT (production)"
vercel project add "$PROJECT" --token "$VERCEL_TOKEN" $SCOPE >/dev/null 2>&1 || true
vercel link --yes --project "$PROJECT" --token "$VERCEL_TOKEN" $SCOPE >/dev/null
URL=$(vercel deploy --prod --yes --build-env BRAND="$B" --build-env BUILD_FLAGS=--live --env BRAND="$B" --token "$VERCEL_TOKEN" $SCOPE | tail -1)
log "deployed: $URL"
[ "$(curl -s -o /dev/null -w '%{http_code}' "$URL")" = 200 ] || { log "deployment URL not 200; stopping before DNS"; exit 1; }

for d in $DOMAINS; do
  log "attach $d (current DNS: $(dig +short "$d" | tr '\n' ' '))"
  vercel domains add "$d" "$PROJECT" --token "$VERCEL_TOKEN" $SCOPE 2>&1 | tail -2 | tee -a "$LOG" || true
done
log "DNS to set (by whoever holds each zone): apex A @ 76.76.21.21; subdomains and www CNAME cname.vercel-dns.com"

log "verify (up to 30 min for DNS + certificate)"
first=${DOMAINS%% *}; i=0
while [ $i -lt 60 ]; do
  c=$(curl -s -o /dev/null -w '%{http_code}' -L --max-time 10 "https://$first/" || echo 000)
  if [ "$c" = 200 ] && ! curl -s -L "https://$first/" | grep -q 'seed-preview'; then
    log "LIVE: https://$first -> 200"; exit 0
  fi
  i=$((i + 1)); sleep 30
done
log "not live after 30 min ($first=$c): check DNS and 'vercel domains inspect $first'"; exit 1
