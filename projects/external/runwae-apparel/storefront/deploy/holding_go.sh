#!/bin/sh
# Runwae Apparel: put runwaeapparel.com on a holding page on our own hosting (Vercel), then verify 200.
# Standing-authorized surface (landing copy + DNS). Static only: no checkout, no forms, no keys in the page.
#
#   VERCEL_TOKEN=… sh holding_go.sh               # deploy + attach domain + print GoDaddy records + verify
#   VERCEL_TOKEN=… VERCEL_SCOPE=<team> sh …       # if the token's account deploys under a team
#   GODADDY_KEY=… GODADDY_SECRET=… (optional)     # set the two DNS records through the GoDaddy API instead of by hand
#                                                 # (GoDaddy limits its API to accounts with 10+ domains or Domain Pro)
# Run it on a host with node >= 20 and the vercel CLI (not bigmini). Log: ./holding_go.log
#
# ROLLBACK: put the Shopify records back at GoDaddy (the values before this script ran, 2026-10-12):
#   A     @    23.227.38.32
#   CNAME www  runwae-apparel.myshopify.com
# (Then fix TLS in Shopify Admin → Settings → Domains → remove + reconnect.)
set -eu
cd "$(dirname "$0")/.."
LOG="$(pwd)/deploy/holding_go.log"
log() { echo "$(date -u +%FT%TZ) $*" | tee -a "$LOG"; }
: "${VERCEL_TOKEN:?export VERCEL_TOKEN for the Vercel account that will host Runwae Apparel}"
SCOPE=${VERCEL_SCOPE:+--scope "$VERCEL_SCOPE"}
PROJECT=runwae-apparel
DOMAIN=runwaeapparel.com

log "build holding page"
node src/build.mjs --brand runwae --holding --out holding-dist

log "deploy to Vercel project $PROJECT (production)"
cd holding-dist
vercel project add "$PROJECT" --token "$VERCEL_TOKEN" $SCOPE >/dev/null 2>&1 || true
vercel link --yes --project "$PROJECT" --token "$VERCEL_TOKEN" $SCOPE >/dev/null
URL=$(vercel deploy --prod --yes --token "$VERCEL_TOKEN" $SCOPE | tail -1)
log "deployed: $URL"
code=$(curl -s -o /dev/null -w '%{http_code}' "$URL")
log "deployment URL -> $code"
[ "$code" = 200 ] || { log "deployment URL not 200; stopping before DNS"; exit 1; }

log "attach $DOMAIN + www.$DOMAIN"
vercel domains add "$DOMAIN" "$PROJECT" --token "$VERCEL_TOKEN" $SCOPE 2>&1 | tail -2 | tee -a "$LOG" || true
vercel domains add "www.$DOMAIN" "$PROJECT" --token "$VERCEL_TOKEN" $SCOPE 2>&1 | tail -2 | tee -a "$LOG" || true
cd ..

if [ -n "${GODADDY_KEY:-}" ] && [ -n "${GODADDY_SECRET:-}" ]; then
  log "set DNS through the GoDaddy API"
  H="Authorization: sso-key $GODADDY_KEY:$GODADDY_SECRET"
  curl -sf -X PUT -H "$H" -H 'Content-Type: application/json' "https://api.godaddy.com/v1/domains/$DOMAIN/records/A/@" -d '[{"data":"76.76.21.21","ttl":600}]' && log "A @ -> 76.76.21.21"
  curl -sf -X PUT -H "$H" -H 'Content-Type: application/json' "https://api.godaddy.com/v1/domains/$DOMAIN/records/CNAME/www" -d '[{"data":"cname.vercel-dns.com","ttl":600}]' && log "CNAME www -> cname.vercel-dns.com"
else
  log "SET THESE AT GODADDY (DNS → runwaeapparel.com), replacing the Shopify ones:"
  log "  A     @    76.76.21.21"
  log "  CNAME www  cname.vercel-dns.com"
fi

log "verify (up to 30 min for DNS + certificate)"
i=0
while [ $i -lt 60 ]; do
  a=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "https://$DOMAIN/" || echo 000)
  w=$(curl -s -o /dev/null -w '%{http_code}' -L --max-time 10 "https://www.$DOMAIN/" || echo 000)
  if [ "$a" = 200 ] && [ "$w" = 200 ] && curl -s "https://$DOMAIN/" | grep -q '<h1>Runwae Apparel</h1>'; then
    log "LIVE: https://$DOMAIN -> 200, www -> 200, holding page served"; exit 0
  fi
  i=$((i + 1)); sleep 30
done
log "not live after 30 min (apex=$a www=$w): check the DNS records and 'vercel domains inspect $DOMAIN'"; exit 1
