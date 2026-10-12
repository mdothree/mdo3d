#!/usr/bin/env bash
# SURF-002 (P2): publish a monitoring-only DMARC record on the 7 MDO Cloudflare zones.
#   _dmarc.<domain>  TXT  "v=DMARC1; p=none; rua=mailto:dmarc@<domain>"
# rua=dmarc@<domain> is delivered by the Cloudflare Email Routing catch-all on each zone.
#
# STAGED. NOT EXECUTED. DNS write: needs the Principal's go.
#   Dry run (default, read-only):  bash SURF-002_dmarc.sh
#   Apply:                          bash SURF-002_dmarc.sh --apply
#   Rollback (delete only the records this script created, matched by exact content):
#                                   bash SURF-002_dmarc.sh --rollback
#
# Pre-check 2026-10-12 03:2xZ (read-only GET with this token): all 7 zones visible + active,
# 0 existing _dmarc TXT records on each; public DNS (1.1.1.1) also shows no _dmarc TXT; SPF present on all 7.
# The token is never echoed: it is read from the env file into a variable and only sent in a header.
set -euo pipefail
set +x
MODE="${1:-dry}"
ENV_FILE="$HOME/latarence/secrets/sega_credentials.env"
# shellcheck disable=SC1090
source "$ENV_FILE" >/dev/null 2>&1
: "${CLOUDFLARE_TOKEN_MDO3:?CLOUDFLARE_TOKEN_MDO3 not set in $ENV_FILE}"
API=https://api.cloudflare.com/client/v4
DOMAINS=(mdo3d.com mdothree.com rigor.design ronnascanner.com layoffleads.com promptsforbusiness.com runwae.com)

cf() { curl -s -m 20 -H "Authorization: Bearer $CLOUDFLARE_TOKEN_MDO3" -H "Content-Type: application/json" "$@"; }
jget() { python3 -c "import json,sys;d=json.load(sys.stdin);$1"; }

for d in "${DOMAINS[@]}"; do
  want="v=DMARC1; p=none; rua=mailto:dmarc@$d"
  zid=$(cf "$API/zones?name=$d" | jget 'r=d.get("result") or [];print(r[0]["id"] if r else "")')
  if [ -z "$zid" ]; then echo "SKIP $d: zone not visible to CLOUDFLARE_TOKEN_MDO3"; continue; fi
  existing=$(cf "$API/zones/$zid/dns_records?type=TXT&name=_dmarc.$d" | jget 'print("\n".join(r["id"]+"\t"+r["content"].strip("\"") for r in d.get("result") or []))')
  case "$MODE" in
    dry)
      if [ -n "$existing" ]; then echo "EXISTS $d: $(echo "$existing" | cut -f2)"; else echo "WOULD CREATE _dmarc.$d TXT \"$want\""; fi ;;
    --apply)
      if [ -n "$existing" ]; then echo "SKIP $d: _dmarc already present ($(echo "$existing" | cut -f2)); not overwriting"; continue; fi
      body=$(python3 -c 'import json,sys;print(json.dumps({"type":"TXT","name":"_dmarc."+sys.argv[1],"content":"\""+sys.argv[2]+"\"","ttl":3600,"comment":"SURF-002 c9"}))' "$d" "$want")
      ok=$(cf -X POST "$API/zones/$zid/dns_records" --data "$body" | jget 'print(d.get("success"), (d.get("errors") or [""])[0])')
      echo "CREATE $d: $ok" ;;
    --rollback)
      echo "$existing" | while IFS=$'\t' read -r rid content; do
        [ -n "$rid" ] || continue
        if [ "$content" = "$want" ]; then
          ok=$(cf -X DELETE "$API/zones/$zid/dns_records/$rid" | jget 'print(d.get("success"))'); echo "DELETE $d $rid: $ok"
        else echo "KEEP $d $rid: content differs from what this script writes"; fi
      done ;;
    *) echo "usage: $0 [--apply|--rollback]"; exit 2 ;;
  esac
done

# Verify (public DNS; allow a few minutes for propagation):
#   for d in mdo3d.com mdothree.com rigor.design ronnascanner.com layoffleads.com promptsforbusiness.com runwae.com; do echo "$d $(dig +short TXT _dmarc.$d @1.1.1.1)"; done
# check lines:
#   check "SURF-002 mdo3d.com DMARC" "dig +short TXT _dmarc.mdo3d.com @1.1.1.1" "v=DMARC1; p=none"
#   (same for mdothree.com rigor.design ronnascanner.com layoffleads.com promptsforbusiness.com runwae.com)
# Follow-up (Principal decision, later): after 2-4 weeks of clean rua reports, move p=none -> p=quarantine.
