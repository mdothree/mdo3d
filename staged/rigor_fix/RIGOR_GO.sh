#!/usr/bin/env bash
# RIGOR_GO.sh — JARVIS Q7 ("fix it, not take it down"): bring api.rigor.design up (#93), verify it,
# THEN ship the 7 rigor tools with checkout ON (q7/paid-path). If the API does not verify, the tools
# ship with the PRO_CHECKOUT_ENABLED=false gate instead, so nobody can pay before the API works.
# NOT RUN by the agent. Principal GO required (backend payments + MDO production deploy). See RIGOR_FIX.md.
#
# Usage:
#   bash RIGOR_GO.sh check                       read-only preflight (tokens, env NAMES, Stripe price/link/webhook GETs)
#   bash RIGOR_GO.sh go                          stages 1-9 (no Stripe object is created or modified)
#   bash RIGOR_GO.sh go --stripe-live-write      + stage S: LIVE STRIPE WRITE — Principal (webhook endpoint if missing,
#                                                Payment Link redirect to /success + promo codes). Opt-in only.
#   bash RIGOR_GO.sh rollback                    runs the rollback file written while 'go' ran (newest stage first)
#
# Operator inputs (values are read, never printed):
#   ~/latarence/secrets/sega_credentials.env    VERCEL_TOKEN_MDO3, CLOUDFLARE_TOKEN_MDO3
#   RIGOR_ENV_FILE (default ~/latarence/secrets/rigor_api.env), KEY=VALUE lines:
#       FIREBASE_PROJECT_ID FIREBASE_CLIENT_EMAIL FIREBASE_PRIVATE_KEY      (mdo3d-career service account)
#       STRIPE_SECRET_KEY STRIPE_PUBLISHABLE_KEY                            (MDO3 account, same mode)
#       STRIPE_WEBHOOK_SECRET                                               (the endpoint's signing secret)
#       STRIPE_PRO_PRICE_IDS                                                (the Rigor Pro $9.99/mo price)
#     optional: STRIPE_TEAM_PRICE_IDS APPCHECK_ENFORCE ANTHROPIC_API_KEY (already set on Vercel)
#   RIGOR_TEST_ID_TOKEN (optional env): Firebase ID token of a signed-in, UNSUBSCRIBED test account,
#       enables the 402 subscription_required and unknown-price 400 checks.
set -u
MODE=${1:-}; shift || true
LIVE_WRITE=0; for a in "$@"; do [ "$a" = "--stripe-live-write" ] && LIVE_WRITE=1; done
HERE=$(cd "$(dirname "$0")" && pwd)
LOG=$HERE/RIGOR_GO.log; RB=$HERE/RIGOR_ROLLBACK.steps; W=$(mktemp -d /tmp/rigor-go.XXXXXX)
TEAM=team_DXUPiQz3KkYmyhAgmT99OQQr
API_PROJECT_NAME=rigor                       # Vercel project that owns api.rigor.design (projects/rigor/api/.vercel)
DOMAIN=api.rigor.design; ZONE=rigor.design
TOOLS="resume cover interview linkedin networking portfolio salary"
PAID_REF=q7/paid-path                        # API + tools, pushed (contains #94 paid-first-use + go-final)
GATE_REFS="go-final main"                    # tools fallback: first ref that exists (PRO_CHECKOUT_ENABLED=false)
PLINK_ID=plink_1TEwCoCRLa19N9qBx7eNHK7D
EXPECT_CENTS=999; EXPECT_CURRENCY=usd; EXPECT_INTERVAL=month
REQ_ENV="FIREBASE_PROJECT_ID FIREBASE_CLIENT_EMAIL FIREBASE_PRIVATE_KEY STRIPE_SECRET_KEY STRIPE_PUBLISHABLE_KEY STRIPE_WEBHOOK_SECRET STRIPE_PRO_PRICE_IDS"
OPT_ENV="STRIPE_TEAM_PRICE_IDS APPCHECK_ENFORCE ANTHROPIC_API_KEY RIGOR_PAYMENT_LINK_IDS"

log()  { echo "$(date -u +%FT%TZ) $*" | tee -a "$LOG"; }
die()  { log "STOP: $*"; exit 1; }
pass=0; failn=0
chk()  { if [ "$2" = "$3" ]; then log "  PASS $1 ($2)"; pass=$((pass+1)); else log "  FAIL $1 (got: $2, want: $3)"; failn=$((failn+1)); return 1; fi; }
rbadd(){ printf '%s\n' "$*" >> "$RB"; }   # one command per line; 'rollback' runs them newest first
manual(){ log "  MANUAL ▶ $*"; }

if [ "$MODE" = rollback ]; then
  [ -s "$RB" ] || die "no rollback steps in $RB"
  source ~/latarence/secrets/sega_credentials.env >/dev/null 2>&1; export TEAM VERCEL_TOKEN_MDO3 CLOUDFLARE_TOKEN_MDO3
  awk '{a[NR]=$0} END{for(i=NR;i>0;i--) print a[i]}' "$RB" | while IFS= read -r step; do
    echo "▶ $step"; read -r -p "  run? [y/N] " y < /dev/tty; [ "$y" = y ] && bash -c "$step"
  done
  exit 0
fi
[ "$MODE" = check ] || [ "$MODE" = go ] || { sed -n 2,26p "$0"; exit 1; }
for b in curl jq git; do command -v $b >/dev/null || die "$b missing"; done
[ "$MODE" = go ] && { command -v vercel >/dev/null || die "vercel CLI missing"; }

# ── secrets (by variable; nothing below echoes a value) ───────────────────────────────────────────
source ~/latarence/secrets/sega_credentials.env >/dev/null 2>&1
VT="${VERCEL_TOKEN_MDO3:-}"; CFT="${CLOUDFLARE_TOKEN_MDO3:-}"
ENVF="${RIGOR_ENV_FILE:-$HOME/latarence/secrets/rigor_api.env}"
# Values live in E_<NAME> shell variables (bash 3.2 compatible); ev NAME reads one.
ev(){ local n="E_$1"; printf '%s' "${!n:-}"; }
if [ -f "$ENVF" ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    [[ "$line" =~ ^[[:space:]]*(#|$) ]] && continue
    k=${line%%=*}; k=${k#export }; k=$(echo "$k" | tr -d '[:space:]'); v=${line#*=}
    v=${v%\"}; v=${v#\"}; v=${v%\'}; v=${v#\'}
    [[ "$k" =~ ^[A-Z][A-Z0-9_]*$ ]] && printf -v "E_$k" '%s' "$v"
  done < "$ENVF"
fi
VH="Authorization: Bearer $VT"; V=https://api.vercel.com
vget(){ local p=$1 q="?"; [[ $p == *\?* ]] && q="&"; curl -s -H "$VH" "$V$p${q}teamId=$TEAM"; }
vapi(){ local m=$1 p=$2 d=${3:-}; local q="?"; [[ $p == *\?* ]] && q="&"; curl -s -X "$m" -H "$VH" -H 'Content-Type: application/json' ${d:+--data "$d"} "$V$p${q}teamId=$TEAM"; }
sget(){ curl -s -u "$(ev STRIPE_SECRET_KEY):" "https://api.stripe.com/v1/$1"; }   # read-only GETs

log "=== RIGOR_GO $MODE (live-write=$LIVE_WRITE) ==="

# ── 0. PREFLIGHT (read-only) ─────────────────────────────────────────────────────────────────────
log "[0] preflight"
[ -n "$VT" ] || die "VERCEL_TOKEN_MDO3 not set"
u=$(vget /v2/user | jq -r '.user.username // empty'); chk "Vercel token valid (user)" "${u:+ok}" ok || die "Vercel token invalid"
PID=$(vget "/v9/projects/$API_PROJECT_NAME" | jq -r '.id // empty'); [ -n "$PID" ] || die "Vercel project $API_PROJECT_NAME not found"
PJ=$(vget "/v9/projects/$PID")
LINK_REPO=$(echo "$PJ" | jq -r '.link.repo // empty'); LINK_ORG=$(echo "$PJ" | jq -r '.link.org // empty')
log "  project $API_PROJECT_NAME git link: ${LINK_REPO:-none} (must be none: a linked landing repo redeploys over the API on every push)"
HAS_DOMAIN=$(vget "/v9/projects/$PID/domains" | jq -r --arg d $DOMAIN '[.domains[]?|select(.name==$d)]|length')
log "  $DOMAIN attached to $API_PROJECT_NAME: $HAS_DOMAIN"
VENV=$(vget "/v9/projects/$PID/env" | jq -r '[.envs[]?|select(.target|index("production"))|.key]|join(" ")')
log "  Vercel production env names present: ${VENV:-none}"
[ -f "$ENVF" ] && log "  operator env file: present" || log "  operator env file: MISSING ($ENVF)"
miss=""
for k in $REQ_ENV ANTHROPIC_API_KEY; do
  f=$([ -n "$(ev $k)" ] && echo y || echo n); vv=$([[ " $VENV " == *" $k "* ]] && echo y || echo n)
  printf '  env %-24s file:%s vercel:%s\n' "$k" "$f" "$vv" | tee -a "$LOG"
  [ $f = n ] && [ $vv = n ] && miss="$miss $k"
done
for k in STRIPE_SECRET_KEY STRIPE_PUBLISHABLE_KEY STRIPE_PRO_PRICE_IDS; do   # needed locally for the price checks
  [ -n "$(ev $k)" ] || miss="$miss $k(file)"; done
# Cloudflare
CF_OK=0; ZID=""; RID=""; RPROX=""
if [ -n "$CFT" ]; then
  ZID=$(curl -s -H "Authorization: Bearer $CFT" "https://api.cloudflare.com/client/v4/zones?name=$ZONE" | jq -r '.result[0].id // empty')
  if [ -n "$ZID" ]; then
    R=$(curl -s -H "Authorization: Bearer $CFT" "https://api.cloudflare.com/client/v4/zones/$ZID/dns_records?name=$DOMAIN")
    RID=$(echo "$R" | jq -r '.result[0].id // empty'); RPROX=$(echo "$R" | jq -r '.result[0].proxied // empty')
    log "  CF record $DOMAIN: $(echo "$R" | jq -c '[.result[]?|{type,content,proxied}]')"; CF_OK=1
  fi
fi
[ $CF_OK = 1 ] || log "  CF token cannot read zone $ZONE: DNS step will be MANUAL"
# Stripe (read-only GETs with the operator's secret key)
PRICE=$(ev STRIPE_PRO_PRICE_IDS | cut -d, -f1 | tr -d ' ')
STRIPE_OK=0
if [ -n "$(ev STRIPE_SECRET_KEY)" ] && [ -n "$PRICE" ]; then
  sk=$(ev STRIPE_SECRET_KEY); pk=$(ev STRIPE_PUBLISHABLE_KEY)
  skl=$([[ $sk == sk_live_* || $sk == rk_live_* ]] && echo live || echo test); pkl=$([[ $pk == pk_live_* ]] && echo live || echo test)
  chk "Stripe key modes match" "$skl" "$pkl"
  P=$(sget "prices/$PRICE")
  chk "Pro price amount (cents)" "$(echo "$P" | jq -r '.unit_amount // empty')" "$EXPECT_CENTS"
  chk "Pro price currency" "$(echo "$P" | jq -r '.currency // empty')" "$EXPECT_CURRENCY"
  chk "Pro price interval" "$(echo "$P" | jq -r '.recurring.interval // empty')" "$EXPECT_INTERVAL"
  chk "Pro price active" "$(echo "$P" | jq -r '.active // empty')" "true"
  if [ "$skl" = live ]; then
    LP=$(sget "payment_links/$PLINK_ID/line_items" | jq -r '.data[0].price.id // empty')
    chk "Payment Link sells the same price as checkout (shown = charged)" "$LP" "$PRICE" && STRIPE_OK=1
    PL=$(sget "payment_links/$PLINK_ID")
    log "  Payment Link: active=$(echo "$PL" | jq -r .active) after_completion=$(echo "$PL" | jq -r .after_completion.type) promo=$(echo "$PL" | jq -r .allow_promotion_codes)"
  else STRIPE_OK=1; log "  test-mode key: Payment Link check skipped (the link is live-mode)"; fi
  WH=$(sget "webhook_endpoints?limit=100" | jq -r --arg d "$DOMAIN" '[.data[]?|select(.status=="enabled" and (.url|test($d+"/api/payment/webhook")) and ((.enabled_events|index("*")) or (.enabled_events|index("checkout.session.completed"))))]|length')
  HUB=$(sget "webhook_endpoints?limit=100" | jq -r '[.data[]?|select(.status=="enabled" and (.url|test("/api/stripe/webhook/")))]|length')
  log "  Stripe webhook endpoints → $DOMAIN: $WH · stripe-hub endpoints: $HUB"
else log "  Stripe checks skipped: STRIPE_SECRET_KEY / STRIPE_PRO_PRICE_IDS not in the env file"; fi
# Pushed refs
for r in api $TOOLS; do
  s=$(git ls-remote "https://github.com/mdothree/rigor-$r.git" "refs/heads/$PAID_REF" | cut -c1-7)
  chk "rigor-$r $PAID_REF pushed" "${s:+yes}" yes
done
log "  live now: $DOMAIN/health=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 https://$DOMAIN/health)"
[ "$MODE" = check ] && { log "check done: pass=$pass fail=$failn; missing for go:${miss:- none}"; exit 0; }

[ -z "$miss" ] || die "missing env values in $ENVF:$miss"
[ $STRIPE_OK = 1 ] || die "Stripe price/link check failed: shown \$9.99/mo must equal what is charged"
if [ "${WH:-0}" = 0 ] && [ "${HUB:-0}" = 0 ] && [ $LIVE_WRITE = 0 ]; then
  die "no enabled Stripe webhook reaches rigor (renewals/cancellations would never sync). Either add it in the Stripe Dashboard (URL https://$DOMAIN/api/payment/webhook, events checkout.session.completed customer.subscription.updated customer.subscription.deleted invoice.paid invoice.payment_failed; put its signing secret in STRIPE_WEBHOOK_SECRET) or re-run with --stripe-live-write"
fi
read -r -p "Principal GO for rigor API + tools production deploy? Type GO: " ok; [ "$ok" = GO ] || die "no GO"

# ── S1. LIVE STRIPE WRITE — Principal (opt-in): webhook endpoint ─────────────────────────────────
if [ "${WH:-0}" = 0 ] && [ "${HUB:-0}" = 0 ] && [ $LIVE_WRITE = 1 ]; then
  log "[S1] LIVE STRIPE WRITE — Principal: create webhook endpoint https://$DOMAIN/api/payment/webhook"
  NW=$(curl -s -u "$(ev STRIPE_SECRET_KEY):" https://api.stripe.com/v1/webhook_endpoints \
    -d url="https://$DOMAIN/api/payment/webhook" -d description="rigor-api (Q7)" \
    -d 'enabled_events[]=checkout.session.completed' -d 'enabled_events[]=customer.subscription.updated' \
    -d 'enabled_events[]=customer.subscription.deleted' -d 'enabled_events[]=invoice.paid' -d 'enabled_events[]=invoice.payment_failed')
  WID=$(echo "$NW" | jq -r '.id // empty'); [ -n "$WID" ] || die "webhook create failed: $(echo "$NW" | jq -r '.error.message')"
  printf -v E_STRIPE_WEBHOOK_SECRET '%s' "$(echo "$NW" | jq -r .secret)"   # goes to the Vercel env below, never printed
  log "  created $WID (its signing secret goes straight into Vercel env STRIPE_WEBHOOK_SECRET; store it in $ENVF too)"
  rbadd "curl -s -u \"\$STRIPE_SECRET_KEY:\" -X DELETE https://api.stripe.com/v1/webhook_endpoints/$WID   # S1 (export STRIPE_SECRET_KEY first)"
fi

# ── 1. Vercel project: stop the landing repo from redeploying over the API ───────────────────────
log "[1] project $API_PROJECT_NAME git link"
if [ -n "$LINK_REPO" ]; then
  r=$(vapi DELETE "/v9/projects/$PID/link"); [ "$(vget "/v9/projects/$PID" | jq -r '.link.repo // empty')" = "" ] || die "could not disconnect git link: $(echo "$r" | jq -c .error)"
  log "  disconnected $LINK_ORG/$LINK_REPO from $API_PROJECT_NAME (the landing keeps its own project)"
  rbadd "curl -s -X POST -H \"Authorization: Bearer \$VERCEL_TOKEN_MDO3\" -H 'Content-Type: application/json' --data '{\"type\":\"github\",\"repo\":\"$LINK_ORG/$LINK_REPO\"}' \"https://api.vercel.com/v9/projects/$PID/link?teamId=\$TEAM\"   # 1 re-link"
else log "  no git link (ok)"; fi

# ── 2. Attach the domain ─────────────────────────────────────────────────────────────────────────
log "[2] attach $DOMAIN"
if [ "$HAS_DOMAIN" = 0 ]; then
  r=$(vapi POST "/v10/projects/$PID/domains" "{\"name\":\"$DOMAIN\"}")
  if [ "$(echo "$r" | jq -r '.name // empty')" = "$DOMAIN" ]; then
    log "  attached (verified=$(echo "$r" | jq -r .verified))"
    rbadd "curl -s -X DELETE -H \"Authorization: Bearer \$VERCEL_TOKEN_MDO3\" \"https://api.vercel.com/v9/projects/$PID/domains/$DOMAIN?teamId=\$TEAM\"   # 2 detach"
  else
    log "  API attach refused: $(echo "$r" | jq -c '.error|{code,message}')"
    manual "Vercel dashboard → project $API_PROJECT_NAME → Settings → Domains → Add $DOMAIN (Production). Then press Enter."; read -r _
  fi
else log "  already attached"; fi

# ── 3. Cloudflare: DNS-only until Vercel issues the cert ─────────────────────────────────────────
log "[3] Cloudflare $DOMAIN → DNS only"
if [ $CF_OK = 1 ] && [ -n "$RID" ] && [ "$RPROX" = true ]; then
  r=$(curl -s -X PATCH -H "Authorization: Bearer $CFT" -H 'Content-Type: application/json' --data '{"proxied":false}' "https://api.cloudflare.com/client/v4/zones/$ZID/dns_records/$RID")
  if [ "$(echo "$r" | jq -r .success)" = true ]; then
    log "  proxied=false"
    rbadd "curl -s -X PATCH -H \"Authorization: Bearer \$CLOUDFLARE_TOKEN_MDO3\" -H 'Content-Type: application/json' --data '{\"proxied\":true}' https://api.cloudflare.com/client/v4/zones/$ZID/dns_records/$RID   # 3 re-proxy"
  else
    log "  CF token cannot edit DNS: $(echo "$r" | jq -c '.errors[0].message')"
    manual "Cloudflare → $ZONE → DNS → $DOMAIN (CNAME cname.vercel-dns.com) → Proxy status: DNS only (grey cloud). Then press Enter."; read -r _
  fi
elif [ "$RPROX" = false ]; then log "  already DNS only"
else manual "Cloudflare → $ZONE → DNS → $DOMAIN must be CNAME cname.vercel-dns.com, DNS only. Then press Enter."; read -r _; fi

# ── 4. Production env (values from the operator file; names only in the log) ────────────────────
log "[4] Vercel env (production)"
for k in $REQ_ENV $OPT_ENV; do
  [ -n "$(ev $k)" ] || continue
  existed=$([[ " $VENV " == *" $k "* ]] && echo 1 || echo 0)
  body=$(jq -n --arg k "$k" --arg v "$(ev $k)" '{key:$k,value:$v,type:"encrypted",target:["production"]}')
  r=$(vapi POST "/v10/projects/$PID/env?upsert=true" "$body"); unset body
  if echo "$r" | jq -e '.created // .key // empty' >/dev/null; then log "  set $k$([ $existed = 1 ] && echo ' (replaced)')"
  else log "  FAILED $k: $(echo "$r" | jq -r '.error.message // "?"')"; die "env $k"; fi
  [ $existed = 0 ] && rbadd "id=\$(curl -s -H \"Authorization: Bearer \$VERCEL_TOKEN_MDO3\" \"https://api.vercel.com/v9/projects/$PID/env?teamId=\$TEAM\" | jq -r '.envs[]|select(.key==\"$k\")|.id'); curl -s -X DELETE -H \"Authorization: Bearer \$VERCEL_TOKEN_MDO3\" \"https://api.vercel.com/v9/projects/$PID/env/\$id?teamId=\$TEAM\"   # 4 unset $k"
  [ $existed = 1 ] && log "  NOTE: $k replaced; its previous value is not recoverable by rollback"
done
for k in RIGOR_FREE_MONTHLY_LIMIT RIGOR_FREE_FEEDBACK_LIMIT; do [[ " $VENV " == *" $k "* ]] && log "  note: $k is set but ignored by #94 code (remove when convenient)"; done

# ── 5. Deploy the API from the pushed tip ────────────────────────────────────────────────────────
deploy_ref() {  # deploy_ref <repo> <ref> <projectId> -> echoes the production URL or empty
  local repo=$1 ref=$2 pid=$3 d="$W/$repo" out prev
  rm -rf "$d"; git clone -q --depth 1 -b "$ref" "https://github.com/mdothree/$repo.git" "$d" || return 1
  log "  $repo@$ref = $(git -C "$d" rev-parse --short HEAD)"; rm -rf "$d/.git"
  mkdir -p "$d/.vercel"; printf '{"projectId":"%s","orgId":"%s"}' "$pid" "$TEAM" > "$d/.vercel/project.json"
  prev=$(vget "/v6/deployments?projectId=$pid&target=production&state=READY&limit=1" | jq -r '.deployments[0].url // empty')
  [ -n "$prev" ] && rbadd "vercel promote https://$prev --yes --scope mdothrees-projects --token \"\$VERCEL_TOKEN_MDO3\"   # 5/8 $repo back to pre-Q7"
  for t in 1 2 3; do out=$(cd "$d" && vercel deploy --prod --yes --archive=tgz --token "$VT" 2>&1 | grep -E 'Production:|Error' | tail -1); [[ $out == *Production:* ]] && break; sleep 10; done
  log "  $repo :: $out"; [[ $out == *Production:* ]]
}
log "[5] deploy rigor-api@$PAID_REF"
deploy_ref rigor-api "$PAID_REF" "$PID" || die "API deploy failed (rollback: bash $0 rollback)"

# ── 6. Wait for the certificate + health ─────────────────────────────────────────────────────────
log "[6] waiting for TLS + /health (up to 15 min)"
h=000; for i in $(seq 1 90); do h=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://$DOMAIN/health); [ "$h" = 200 ] && break; sleep 10; done
log "  https://$DOMAIN/health = $h"

# ── 7. Verify the API ────────────────────────────────────────────────────────────────────────────
log "[7] verify API"
API_OK=1; O="Origin: https://resume.rigor.design"; A="https://$DOMAIN"
chk "/health 200" "$h" 200 || API_OK=0
chk "/health ok:true" "$(curl -s $A/health | jq -r .ok)" true || API_OK=0
chk "OPTIONS create-embedded-session 204" "$(curl -s -o /dev/null -w '%{http_code}' -X OPTIONS -H "$O" -H 'Access-Control-Request-Method: POST' $A/api/payment/create-embedded-session)" 204 || API_OK=0
chk "OPTIONS analyze 204" "$(curl -s -o /dev/null -w '%{http_code}' -X OPTIONS -H "$O" $A/api/analyze)" 204 || API_OK=0
chk "anonymous analyze 401" "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "$O" -H 'Content-Type: application/json' -d '{}' $A/api/analyze)" 401 || API_OK=0
chk "anonymous checkout 401" "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "$O" -H 'Content-Type: application/json' -d '{"priceId":"pro"}' $A/api/payment/create-embedded-session)" 401 || API_OK=0
chk "anonymous confirm 401" "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "$O" -H 'Content-Type: application/json' -d '{}' $A/api/payment/confirm)" 401 || API_OK=0
chk "unsigned webhook 400" "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{}' $A/api/payment/webhook)" 400 || API_OK=0
if [ -n "${RIGOR_TEST_ID_TOKEN:-}" ]; then
  TA="Authorization: Bearer $RIGOR_TEST_ID_TOKEN"
  chk "unknown price 400" "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "$O" -H "$TA" -H 'Content-Type: application/json' -d '{"priceId":"price_not_rigor"}' $A/api/payment/create-embedded-session)" 400 || API_OK=0
  chk "unsubscribed first call 402 (#94 paid from first use)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "$O" -H "$TA" -H 'Content-Type: application/json' -d '{"resume":"x","jobDescription":"y"}' $A/api/analyze)" 402 || API_OK=0
  chk "confirm (no session) 200 inactive" "$(curl -s -X POST -H "$O" -H "$TA" -H 'Content-Type: application/json' -d '{}' $A/api/payment/confirm | jq -r .active)" false || API_OK=0
else manual "set RIGOR_TEST_ID_TOKEN (unsubscribed test account) to run: unknown price 400, first call 402, confirm inactive. With #94 the FIRST unsubscribed call is 402 (the old '4th call 402' was the free tier, now gone)."; fi

# ── 8. Tools: checkout ON only if the API verified; otherwise the gate ───────────────────────────
if [ $API_OK = 1 ]; then TREF=$PAID_REF; log "[8] API verified → tools ship $PAID_REF (checkout on)"
else
  log "[8] API NOT verified → tools ship the gate (checkout off). Fix the API, then re-run 'go'."
  TREF=""
fi
for t in $TOOLS; do
  pid=$(vget "/v9/projects/rigor-$t" | jq -r '.id // empty'); [ -n "$pid" ] || { log "  no Vercel project rigor-$t"; failn=$((failn+1)); continue; }
  ref=$TREF
  if [ -z "$ref" ]; then for g in $GATE_REFS; do git ls-remote --exit-code "https://github.com/mdothree/rigor-$t.git" "refs/heads/$g" >/dev/null && { ref=$g; break; }; done; fi
  deploy_ref "rigor-$t" "$ref" "$pid" || failn=$((failn+1))
done
log "  rigor.design landing: no price or checkout on it; it keeps auto-deploying from rigor-landing to its own project (nothing to do)"

# ── 9. Verify the tools ──────────────────────────────────────────────────────────────────────────
log "[9] verify tools"
sleep 20
for t in $TOOLS; do
  U="https://$t.rigor.design"
  chk "$t no buy.stripe.com link on the page" "$(curl -sL $U/ | grep -c 'buy.stripe.com')" 0
  chk "$t /success 200" "$(curl -s -o /dev/null -w '%{http_code}' $U/success)" 200
  if [ $API_OK = 1 ]; then
    chk "$t checkout on (env.js)" "$(curl -s $U/js/config/env.js | grep -c 'VITE_PRO_CHECKOUT_ENABLED", "true"')" 1
    pc=$(curl -s $U/js/services/paymentService.js | grep -oE 'price: [0-9.]+, // must equal' | grep -oE '[0-9.]+' | head -1)
    chk "$t page price = Stripe price (\$$pc vs ${EXPECT_CENTS}c)" "$(awk -v p="$pc" 'BEGIN{printf "%d", p*100+0.5}')" "$EXPECT_CENTS"
    chk "$t /success confirms (success.js)" "$(curl -s $U/success | grep -c 'js/success.js')" 1
  else
    chk "$t checkout gated (env.js false)" "$(curl -s $U/js/config/env.js | grep -c 'VITE_PRO_CHECKOUT_ENABLED", "false"')" 1
  fi
done
[ $API_OK = 1 ] && manual "one real browser pass: sign in with the test account on resume.rigor.design → Get Rigor Pro → Stripe embedded checkout shows \$9.99/month and a promo-code field. Do NOT pay with a real card unless the Principal chooses a live test purchase (refund it after)."

# ── S2. LIVE STRIPE WRITE — Principal (opt-in): Payment Link lands on /success, promo codes on ────
if [ $LIVE_WRITE = 1 ] && [ $API_OK = 1 ]; then
  log "[S2] LIVE STRIPE WRITE — Principal: Payment Link $PLINK_ID → redirect to /success, allow_promotion_codes=true"
  r=$(curl -s -u "$(ev STRIPE_SECRET_KEY):" "https://api.stripe.com/v1/payment_links/$PLINK_ID" \
      -d 'after_completion[type]=redirect' \
      --data-urlencode 'after_completion[redirect][url]=https://resume.rigor.design/success?session_id={CHECKOUT_SESSION_ID}' \
      -d allow_promotion_codes=true)
  [ "$(echo "$r" | jq -r '.after_completion.type // empty')" = redirect ] && log "  updated" || log "  FAILED: $(echo "$r" | jq -r '.error.message')"
  rbadd "curl -s -u \"\$STRIPE_SECRET_KEY:\" https://api.stripe.com/v1/payment_links/$PLINK_ID -d 'after_completion[type]=hosted_confirmation' -d allow_promotion_codes=false   # S2"
elif [ $LIVE_WRITE = 0 ]; then
  log "  Payment Link left as is (Stripe confirmation page, promo codes off). Payers through it still get Pro via the webhook (reference / verified email) or by opening /success with their session. Re-run with --stripe-live-write for S2."
fi

# ── 10. Keep main = what is live (fast-forward only, never force) ───────────────────────────────
if [ $API_OK = 1 ]; then
  log "[10] fast-forward main ← $PAID_REF (no deploy: these repos are not git-connected)"
  gh auth switch -u mdothree >/dev/null 2>&1 || true
  for r in api $TOOLS; do
    d="$W/ff-$r"; rm -rf "$d"; git clone -q "https://github.com/mdothree/rigor-$r.git" "$d" && git -C "$d" fetch -q origin "$PAID_REF"
    if git -C "$d" merge-base --is-ancestor origin/main FETCH_HEAD; then
      git -C "$d" -c credential.helper= -c credential.helper='!gh auth git-credential' push -q "https://github.com/mdothree/rigor-$r.git" FETCH_HEAD:refs/heads/main && log "  rigor-$r main → $(git -C "$d" rev-parse --short FETCH_HEAD)" || log "  rigor-$r push failed (run: gh auth switch -u mdothree)"
    else log "  rigor-$r: main moved (not an ancestor of $PAID_REF) — merge by hand, never force"; fi
  done
  gh auth switch -u buttstech >/dev/null 2>&1 || true
fi

log "=== done: pass=$pass fail=$failn · API_OK=$API_OK · log $LOG · rollback: bash $0 rollback ==="
[ $API_OK = 1 ] && log "HQ kit: RIGOR-PAY-BEFORE-API now = 'checkout/link present only while https://$DOMAIN/health is 200'"
rm -rf "$W"
