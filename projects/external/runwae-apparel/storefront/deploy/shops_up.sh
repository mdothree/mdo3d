#!/bin/sh
# Put the four apparel shops up on their domains: Vercel hosting + DNS on Cloudflare (GoDaddy nameservers switched).
# Static shops, every item "Not available", checkout OFF. Built in PREVIEW mode (banner, noindex) until
# tools/launch_check.mjs says READY; then deploy/live_go.sh flips each shop to live.
#
#   sh deploy/shops_up.sh                    all four
#   sh deploy/shops_up.sh glb runwae         some
#
# Reads from the environment (export them, or `set -a; . <your env file>; set +a` first). Values are never printed:
#   VERCEL_TOKEN            Vercel account/team that hosts the shops (VERCEL_SCOPE=<team> if it deploys under a team)
#   CLOUDFLARE_API_TOKEN    Zone:Edit + DNS:Edit on the zones below (and Zone create for the two GoDaddy domains)
#   CLOUDFLARE_ACCOUNT_ID   the Cloudflare account to create girlslovebutts.com / runwaeapparel.com in
#   GODADDY_API_KEY / GODADDY_API_SECRET   the GoDaddy account that owns girlslovebutts.com + runwaeapparel.com
# Needs: vercel CLI, curl, python3. Vercel builds on its own servers (nothing builds on this machine).
# Log: deploy/shops_up.log (original nameservers and records are logged before anything changes).
#
# ROLLBACK (per domain): GoDaddy → the domain → Nameservers → back to the values logged as "original NS"
# (girlslovebutts.com was ns21/ns22.domaincontrol.com, runwaeapparel.com ns47/ns48.domaincontrol.com on 2026-10-19);
# for store.* subdomains delete the `store` CNAME in Cloudflare; `vercel domains rm <domain>`.
set -u
cd "$(dirname "$0")/.."
LOG="$(pwd)/deploy/shops_up.log"
log() { echo "$(date -u +%FT%TZ) $*" | tee -a "$LOG" >&2; }  # stderr, so $(...) captures stay clean
need() { eval "v=\${$1:-}"; [ -n "$v" ] || { log "MISSING env $1 ($2)"; MISSING=1; }; }
MISSING=0
need VERCEL_TOKEN "Vercel hosting"
need CLOUDFLARE_API_TOKEN "Cloudflare DNS"
command -v vercel >/dev/null || { log "MISSING vercel CLI (npm i -g vercel)"; MISSING=1; }
[ "$MISSING" = 0 ] || exit 1
SCOPE=${VERCEL_SCOPE:+--scope "$VERCEL_SCOPE"}
CF=https://api.cloudflare.com/client/v4
cf() { curl -s -X "$1" "$CF$2" -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H 'Content-Type: application/json' ${3:+-d "$3"}; }
js() { python3 -c "import json,sys; d=json.load(sys.stdin); print($1)" 2>/dev/null; }

zone_id() { # name -> id ('' if none); creates it when $2=create
  id=$(cf GET "/zones?name=$1" | js "(d.get('result') or [{}])[0].get('id','')")
  if [ -z "$id" ] && [ "${2:-}" = create ]; then
    [ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ] || { log "$1: no Cloudflare zone and no CLOUDFLARE_ACCOUNT_ID to create one"; return 1; }
    r=$(cf POST /zones "{\"name\":\"$1\",\"account\":{\"id\":\"$CLOUDFLARE_ACCOUNT_ID\"},\"type\":\"full\",\"jump_start\":true}")
    id=$(echo "$r" | js "d['result']['id'] if d.get('success') else ''")
    [ -n "$id" ] || { log "$1: zone create failed: $(echo "$r" | js "d.get('errors')")"; return 1; }
    log "$1: Cloudflare zone created"
  fi
  echo "$id"
}

set_record() { # zone_id type name content  (replaces any A/AAAA/CNAME at that name; DNS only, not proxied)
  for t in A AAAA CNAME; do
    for rid in $(cf GET "/zones/$1/dns_records?type=$t&name=$3" | js "' '.join(x['id'] for x in d.get('result') or [])"); do
      cf DELETE "/zones/$1/dns_records/$rid" >/dev/null
    done
  done
  r=$(cf POST "/zones/$1/dns_records" "{\"type\":\"$2\",\"name\":\"$3\",\"content\":\"$4\",\"ttl\":300,\"proxied\":false}")
  echo "$r" | js "d.get('success')" | grep -q True && log "  DNS $2 $3 -> $4" || log "  DNS $2 $3 FAILED: $(echo "$r" | js "d.get('errors')")"
}

godaddy_ns() { # domain ns1 ns2
  [ -n "${GODADDY_API_KEY:-}" ] && [ -n "${GODADDY_API_SECRET:-}" ] || { log "$1: no GoDaddy key in env; SET NAMESERVERS BY HAND at GoDaddy: $2 $3"; return 1; }
  H="Authorization: sso-key $GODADDY_API_KEY:$GODADDY_API_SECRET"
  log "$1: original NS $(dig +short NS "$1" | tr '\n' ' ')"
  code=$(curl -s -o /tmp/gd.$$ -w '%{http_code}' -X PATCH "https://api.godaddy.com/v1/domains/$1" -H "$H" -H 'Content-Type: application/json' -d "{\"nameServers\":[\"$2\",\"$3\"]}")
  if [ "$code" = 204 ] || [ "$code" = 200 ]; then log "$1: GoDaddy nameservers -> $2 $3"; else
    log "$1: GoDaddy API $code $(head -c 200 /tmp/gd.$$); SET NAMESERVERS BY HAND at GoDaddy (Domain → Nameservers → custom): $2 $3"; rm -f /tmp/gd.$$; return 1; fi
  rm -f /tmp/gd.$$
}

up() { # brand project zone mode(subdomain|apex)
  B=$1 P=$2 Z=$3 M=$4
  log "== $B: deploy to Vercel project $P (preview build, checkout off)"
  vercel project add "$P" --token "$VERCEL_TOKEN" $SCOPE >/dev/null 2>&1 || true
  vercel link --yes --project "$P" --token "$VERCEL_TOKEN" $SCOPE >/dev/null 2>&1 || { log "$B: vercel link failed"; return 1; }
  URL=$(vercel deploy --prod --yes --build-env BRAND="$B" --build-env BUILD_FLAGS= --env BRAND="$B" --token "$VERCEL_TOKEN" $SCOPE 2>>"$LOG" | tail -1)
  c=$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' "$URL"); log "$B: deployed $URL -> ${c%% *}"
  # Vercel Authentication (default on new projects) 302s *.vercel.app deployment URLs to vercel.com/sso-api;
  # custom domains are exempt, so that redirect still means the build is up.
  case "$c" in 200*) ;; 302\ https://vercel.com/sso-api*) log "$B: deployment URL behind Vercel Authentication (custom domains exempt): OK" ;;
    *) log "$B: deployment not 200; stopping before DNS"; return 1 ;; esac
  if [ "$M" = subdomain ]; then DOMAINS="store.$Z"; else DOMAINS="$Z www.$Z"; fi
  for d in $DOMAINS; do vercel domains add "$d" "$P" --token "$VERCEL_TOKEN" $SCOPE >>"$LOG" 2>&1; log "$B: domain $d attached to $P"; done
  if [ "$M" = subdomain ]; then
    zid=$(zone_id "$Z") || return 1; [ -n "$zid" ] || { log "$Z: zone not visible to this Cloudflare token"; return 1; }
    set_record "$zid" CNAME "store.$Z" cname.vercel-dns.com
  else
    zid=$(zone_id "$Z" create) || return 1
    set_record "$zid" A "$Z" 76.76.21.21
    set_record "$zid" CNAME "www.$Z" cname.vercel-dns.com
    ns=$(cf GET "/zones/$zid" | js "' '.join(d['result']['name_servers'])")
    godaddy_ns "$Z" $ns
  fi
}

BRANDS=${*:-"buttsstudios ridgefield glb runwae"}
for b in $BRANDS; do
  case $b in
    buttsstudios) up buttsstudios shop-buttsstudios buttsstudios.com subdomain ;;
    ridgefield)   up ridgefield shop-ridgefield ridgefieldtech.com subdomain ;;
    glb)          up glb shop-glb girlslovebutts.com apex ;;
    runwae)       up runwae runwae-apparel runwaeapparel.com apex ;;
    *) log "unknown brand $b" ;;
  esac
done

log "verify (DNS + certificates can take up to an hour after a nameserver change)"
for d in store.buttsstudios.com store.ridgefieldtech.com girlslovebutts.com runwaeapparel.com; do
  log "  https://$d -> $(curl -s -o /dev/null -w '%{http_code}' -L --max-time 10 "https://$d/" || echo 000)  NS: $(dig +short NS "${d#store.}" | tr '\n' ' ')"
done
log "done. Not 200 yet after a nameserver change usually means DNS is still propagating; re-run the script (it is idempotent)."
