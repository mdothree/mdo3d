#!/usr/bin/env bash
# RIGOR_GO.sh — bring api.rigor.design up (RIGOR-API-525 / S5, JARVIS Q7 "fix it, not take it down"),
# verify it, THEN ship the 7 rigor tools with checkout ON (q7/paid-path).
# Rev 2026-10-13: this script WRITES NO SECRET and makes NO Stripe write. The Vercel env is set beforehand by the
# Principal (staged/rigor_fix/SECRETS_NEEDED.md); the preflight refuses to deploy while any required env NAME is
# missing from project `rigor`. On a failed verify it STOPS and reports: no rollback, no revert (fix forward).
# Runs in the lane's batched deploy window (Vercel Hobby cap). Deploys: 1 API + 7 tools = 8.
#
# Usage:
#   bash RIGOR_GO.sh check     read-only: tokens, project link/domain, env NAMES, DNS/TLS, refs, Stripe GETs
#   bash RIGOR_GO.sh go        preflight → [1] unlink landing repo → [2] domain → [3] DNS → [4] deploy API →
#                              [5] verify API → [6] deploy tools → [7] verify tools → [8] fast-forward main
#   RIGOR_GO_CONFIRM=GO bash RIGOR_GO.sh go     non-interactive (the window runner)
#
# Inputs (values are read by variable, never printed):
#   ~/latarence/secrets/sega_credentials.env   VERCEL_TOKEN_MDO3 (required), CLOUDFLARE_TOKEN_MDO3 (optional)
#   Stripe read key for the read-only GETs (payment link active, price, webhook endpoints), first found of:
#     $STRIPE_READ_KEY (restricted rk_live_ key: Payment Links/Prices/Webhook Endpoints = Read), or
#     STRIPE_SECRET_KEY in $RIGOR_ENV_FILE (default ~/latarence/secrets/rigor_api.env). Only GET requests are made.
#   API_SHA (optional) pins the rigor-api commit to deploy (default below). RIGOR_TEST_ID_TOKEN (optional) adds
#   the signed-in checks (unknown price 400, unsubscribed first call 402, confirm inactive).
set -u
MODE=${1:-}
HERE=$(cd "$(dirname "$0")" && pwd)
LOG=$HERE/RIGOR_GO.log; W=$(mktemp -d "${TMPDIR:-/tmp}/rigor-go.XXXXXX")
TEAM=team_DXUPiQz3KkYmyhAgmT99OQQr
API_PROJECT_NAME=rigor                       # Vercel project prj_6XVgXk8RuUT56AlmiMHA6oHGOHFm (projects/rigor/api/.vercel)
DOMAIN=api.rigor.design; ZONE=rigor.design
TOOLS="resume cover interview linkedin networking portfolio salary"
PAID_REF=q7/paid-path                        # rigor-api + 7 tools (contains #94 paid-first-use + go-final)
API_SHA=${API_SHA:-0d7459d}                  # rigor-api q7/paid-path tip 2026-10-13 (/health reports environment)
# 7 tools: q7/paid-path tips after the 2026-10-13 fold-forward (go-final-r4 + main merged in, so stage 8 fast-forwards main).
TOOL_PINS=${TOOL_PINS:-"resume:30d2dab cover:b667a20 interview:7e37e9f linkedin:17de643 networking:ad882d9 portfolio:805239c salary:e1d89ab"}
PLINK_ID=plink_1TEwCoCRLa19N9qBx7eNHK7D      # Rigor Pro link (buy.stripe.com/…8k804). NEVER paused or modified here.
PRO_PRICE=price_1TEwCiCRLa19N9qBTxS4Oo0K     # what the link sells; must equal STRIPE_PRO_PRICE_IDS
EXPECT_CENTS=999; EXPECT_CURRENCY=usd; EXPECT_INTERVAL=month
REQ_ENV="FIREBASE_PROJECT_ID FIREBASE_CLIENT_EMAIL FIREBASE_PRIVATE_KEY STRIPE_SECRET_KEY STRIPE_PUBLISHABLE_KEY STRIPE_WEBHOOK_SECRET STRIPE_PRO_PRICE_IDS ANTHROPIC_API_KEY"

log()  { echo "$(date -u +%FT%TZ) $*" | tee -a "$LOG"; }
die()  { log "STOP: $*"; rm -rf "$W"; exit 1; }
pass=0; failn=0; FAILS=""
chk()  { if [ "$2" = "$3" ]; then log "  PASS $1 ($2)"; pass=$((pass+1)); else log "  FAIL $1 (got: ${2:-<empty>}, want: $3)"; failn=$((failn+1)); FAILS="$FAILS
    - $1 (got: ${2:-<empty>}, want: $3)"; return 1; fi; }
manual(){ log "  MANUAL ▶ $*"; }
stop_report(){  # failed verify: report and stop. No rollback, no revert (Principal rule: fix forward).
  log "STOP at $1: verify failed — NO rollback performed. Failed checks:$FAILS"
  log "  report to the Bridge with this log ($LOG). Nothing else was deployed after this point."
  rm -rf "$W"; exit 2; }

[ "$MODE" = check ] || [ "$MODE" = go ] || { sed -n 2,22p "$0"; exit 1; }
for b in curl jq git; do command -v $b >/dev/null || die "$b missing"; done
[ "$MODE" = go ] && { command -v vercel >/dev/null || die "vercel CLI missing"; }

# ── tokens (by variable; nothing below echoes a value) ─────────────────────────────────────────────
source ~/latarence/secrets/sega_credentials.env >/dev/null 2>&1
VT="${VERCEL_TOKEN_MDO3:-}"; CFT="${CLOUDFLARE_TOKEN_MDO3:-}"
SRK="${STRIPE_READ_KEY:-}"
ENVF="${RIGOR_ENV_FILE:-$HOME/latarence/secrets/rigor_api.env}"
if [ -z "$SRK" ] && [ -f "$ENVF" ]; then
  SRK=$(sed -nE 's/^[[:space:]]*(export[[:space:]]+)?STRIPE_SECRET_KEY=["'\'']?([^"'\'']*)["'\'']?[[:space:]]*$/\2/p' "$ENVF" | head -1)
fi
VH="Authorization: Bearer $VT"; V=https://api.vercel.com
vget(){ local p=$1 q="?"; [[ $p == *\?* ]] && q="&"; curl -s -H "$VH" "$V$p${q}teamId=$TEAM"; }
vapi(){ local m=$1 p=$2 d=${3:-}; local q="?"; [[ $p == *\?* ]] && q="&"; curl -s -X "$m" -H "$VH" -H 'Content-Type: application/json' ${d:+--data "$d"} "$V$p${q}teamId=$TEAM"; }
sget(){ curl -s -G -u "$SRK:" "https://api.stripe.com/v1/$1"; }   # GET only. This script never POSTs to Stripe.
link_active(){ [ -n "$SRK" ] && sget "payment_links/$PLINK_ID" | jq -r '.active // empty'; }

log "=== RIGOR_GO $MODE (no secret writes, no Stripe writes) ==="

# ── 0. PREFLIGHT (read-only) ─────────────────────────────────────────────────────────────────────
log "[0] preflight"
[ -n "$VT" ] || die "VERCEL_TOKEN_MDO3 not set"
u=$(vget /v2/user | jq -r '.user.username // empty'); chk "Vercel token valid" "${u:+ok}" ok || die "Vercel token invalid"
PID=$(vget "/v9/projects/$API_PROJECT_NAME" | jq -r '.id // empty'); [ -n "$PID" ] || die "Vercel project $API_PROJECT_NAME not found"
PJ=$(vget "/v9/projects/$PID")
LINK_REPO=$(echo "$PJ" | jq -r '.link.repo // empty'); LINK_ORG=$(echo "$PJ" | jq -r '.link.org // empty')
log "  project $API_PROJECT_NAME ($PID) git link: ${LINK_REPO:+$LINK_ORG/$LINK_REPO}${LINK_REPO:-none} (must be none: the linked landing repo redeploys over the API on every push — the cause of the 404)"
DJ=$(vget "/v9/projects/$PID/domains" | jq -c --arg d $DOMAIN '[.domains[]?|select(.name==$d)|{name,verified}]')
HAS_DOMAIN=$(echo "$DJ" | jq length); log "  $DOMAIN on $API_PROJECT_NAME: $DJ"
PROD=$(vget "/v6/deployments?projectId=$PID&target=production&state=READY&limit=1" | jq -r '.deployments[0] | "\(.url) \(.meta.githubCommitRepo // "cli") \(.meta.githubCommitSha // "" | .[0:7])"')
log "  current production deployment (before state): $PROD"

# Env NAMES (never values). Refuse to deploy while any required name is missing for production.
VENV=$(vget "/v9/projects/$PID/env" | jq -r '[.envs[]?|select((.target // [])|index("production"))|.key]|join(" ")')
MISSING=""
for k in $REQ_ENV; do
  if [[ " $VENV " == *" $k "* ]]; then log "  env $k: present (production)"; else log "  env $k: MISSING"; MISSING="$MISSING $k"; fi
done
[[ " $VENV " == *" RIGOR_PAYMENT_LINK_IDS "* ]] || log "  env RIGOR_PAYMENT_LINK_IDS: not set (optional; code defaults to $PLINK_ID)"

# DNS / TLS (public)
CN=$(dig +short "$DOMAIN" | head -1); log "  DNS $DOMAIN → ${CN:-none} (want cname.vercel-dns.com, DNS only)"
CERT=$(echo | openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" 2>/dev/null | openssl x509 -noout -subject 2>/dev/null)
log "  TLS: ${CERT:-no certificate}"
CF_OK=0; ZID=""; RID=""; RPROX=""
if [ -n "$CFT" ]; then
  ZID=$(curl -s -H "Authorization: Bearer $CFT" "https://api.cloudflare.com/client/v4/zones?name=$ZONE" | jq -r '.result[0].id // empty')
  if [ -n "$ZID" ]; then
    R=$(curl -s -H "Authorization: Bearer $CFT" "https://api.cloudflare.com/client/v4/zones/$ZID/dns_records?name=$DOMAIN")
    RID=$(echo "$R" | jq -r '.result[0].id // empty'); RPROX=$(echo "$R" | jq -r '.result[0].proxied // empty')
    log "  CF record: $(echo "$R" | jq -c '[.result[]?|{type,content,proxied}]')"; CF_OK=1
  fi
fi
[ $CF_OK = 1 ] || log "  CF API not readable with this token: DNS judged from public DNS only"

# Stripe (GET only)
if [ -n "$SRK" ]; then
  LA=$(link_active); chk "Payment Link $PLINK_ID active (read-only)" "$LA" true
  LP=$(sget "payment_links/$PLINK_ID/line_items" | jq -r '.data[0].price.id // empty'); chk "link sells the Pro price" "$LP" "$PRO_PRICE"
  P=$(sget "prices/$PRO_PRICE")
  chk "Pro price cents" "$(echo "$P" | jq -r '.unit_amount // empty')" "$EXPECT_CENTS"
  chk "Pro price currency" "$(echo "$P" | jq -r '.currency // empty')" "$EXPECT_CURRENCY"
  chk "Pro price interval" "$(echo "$P" | jq -r '.recurring.interval // empty')" "$EXPECT_INTERVAL"
  WHJ=$(sget "webhook_endpoints?limit=100")
  WH=$(echo "$WHJ" | jq -r --arg d "$DOMAIN" '[.data[]?|select(.status=="enabled" and (.url|test($d+"/api/payment/webhook")))]|length')
  HUB=$(echo "$WHJ" | jq -r '[.data[]?|select(.status=="enabled" and (.url|test("/api/stripe/webhook/")))]|length')
  log "  Stripe webhook endpoints → $DOMAIN: ${WH:-?} · stripe-hub endpoints: ${HUB:-?}"
  [ "${WH:-0}" = 0 ] && [ "${HUB:-0}" = 0 ] && MISSING="$MISSING (Stripe-webhook-endpoint)"
else
  log "  no Stripe read key: link/price/webhook GETs skipped (go refuses: the post-deploy 'link active' verify needs it)"
  [ "$MODE" = go ] && MISSING="$MISSING (STRIPE_READ_KEY-or-env-file)"
fi

# Refs: API pinned SHA + tool tips
AS=$(git ls-remote "https://github.com/mdothree/rigor-api.git" "refs/heads/$PAID_REF" | cut -c1-7)
chk "rigor-api $PAID_REF = $API_SHA" "$AS" "$API_SHA"
declare_tool_sha(){ printf -v "TS_$1" '%s' "$2"; }; tool_sha(){ local n="TS_$1"; printf '%s' "${!n:-}"; }
for t in $TOOLS; do
  s=$(git ls-remote "https://github.com/mdothree/rigor-$t.git" "refs/heads/$PAID_REF" | cut -c1-7)
  pin=$(printf '%s\n' $TOOL_PINS | sed -n "s/^$t://p")
  declare_tool_sha "$t" "$s"; chk "rigor-$t $PAID_REF = ${pin:-<unpinned>}" "$s" "$pin" && log "    rigor-$t @ $s"
done
log "  live now: $DOMAIN/health=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 https://$DOMAIN/health)"

if [ "$MODE" = check ]; then
  log "check done: pass=$pass fail=$failn; blocking go:${MISSING:- none}"; rm -rf "$W"; exit 0
fi
[ -z "$MISSING" ] || die "refusing to deploy — required and missing:$MISSING
  Set them per staged/rigor_fix/SECRETS_NEEDED.md (Principal), then re-run 'check'."
[ "$failn" = 0 ] || die "preflight checks failed ($failn):$FAILS"
ok=${RIGOR_GO_CONFIRM:-}; [ -n "$ok" ] || read -r -p "Deploy rigor API + 7 tools to production now? Type GO: " ok
[ "$ok" = GO ] || die "no GO"

# ── 1. Vercel project: stop the landing repo from redeploying over the API (config, no secret) ─────
log "[1] project $API_PROJECT_NAME git link"
if [ -n "$LINK_REPO" ]; then
  r=$(vapi DELETE "/v9/projects/$PID/link")
  [ "$(vget "/v9/projects/$PID" | jq -r '.link.repo // empty')" = "" ] || die "could not disconnect git link: $(echo "$r" | jq -c .error)"
  log "  disconnected $LINK_ORG/$LINK_REPO (before state). The landing keeps its own project rigor-landing."
else log "  no git link (ok)"; fi

# ── 2. Domain (already attached 2026-10-12; idempotent) ──────────────────────────────────────────
log "[2] $DOMAIN on $API_PROJECT_NAME"
if [ "$HAS_DOMAIN" = 0 ]; then
  r=$(vapi POST "/v10/projects/$PID/domains" "{\"name\":\"$DOMAIN\"}")
  [ "$(echo "$r" | jq -r '.name // empty')" = "$DOMAIN" ] && log "  attached (verified=$(echo "$r" | jq -r .verified))" \
    || die "attach refused: $(echo "$r" | jq -c '.error|{code,message}') — Vercel → project $API_PROJECT_NAME → Domains → add $DOMAIN, then re-run"
else log "  attached (ok)"; fi

# ── 3. DNS: CNAME cname.vercel-dns.com, DNS only (already so on 2026-10-13; idempotent) ─────────────
log "[3] Cloudflare $DOMAIN"
if [ "$RPROX" = true ] && [ $CF_OK = 1 ]; then
  r=$(curl -s -X PATCH -H "Authorization: Bearer $CFT" -H 'Content-Type: application/json' --data '{"proxied":false}' "https://api.cloudflare.com/client/v4/zones/$ZID/dns_records/$RID")
  [ "$(echo "$r" | jq -r .success)" = true ] && log "  proxied true → false" || die "CF token cannot edit DNS: Cloudflare → $ZONE → DNS → $DOMAIN → DNS only, then re-run"
elif [ -n "$CERT" ]; then log "  ok (Vercel cert present: $CERT)"
else die "no TLS cert on $DOMAIN yet — check DNS (CNAME cname.vercel-dns.com, DNS only) and the Vercel domain, then re-run"; fi

# ── 4. Deploy the API at the pinned SHA ──────────────────────────────────────────────────────────
deploy_ref() {  # deploy_ref <repo> <ref> <projectId> <expected short sha> → 0 on a Production URL
  local repo=$1 ref=$2 pid=$3 want=$4 d="$W/$repo" out got
  rm -rf "$d"; git clone -q --depth 1 -b "$ref" "https://github.com/mdothree/$repo.git" "$d" || return 1
  got=$(git -C "$d" rev-parse --short=7 HEAD); log "  $repo@$ref = $got"
  [ -z "$want" ] || [ "$got" = "$want" ] || { log "  $repo moved since preflight ($want → $got): not deploying"; return 1; }
  rm -rf "$d/.git"; mkdir -p "$d/.vercel"; printf '{"projectId":"%s","orgId":"%s"}' "$pid" "$TEAM" > "$d/.vercel/project.json"
  for t in 1 2 3; do out=$(cd "$d" && vercel deploy --prod --yes --archive=tgz --token "$VT" 2>&1 | grep -E 'Production:|Error' | tail -1); [[ $out == *Production:* ]] && break; sleep 10; done
  log "  $repo :: $out"; [[ $out == *Production:* ]]
}
log "[4] deploy rigor-api@$PAID_REF ($API_SHA) → $API_PROJECT_NAME"
deploy_ref rigor-api "$PAID_REF" "$PID" "$API_SHA" || { FAILS="$FAILS
    - rigor-api deploy"; stop_report "[4] API deploy"; }

# ── 5. Verify the API ────────────────────────────────────────────────────────────────────────────
log "[5] verify API (waits up to 5 min for /health 200)"
A="https://$DOMAIN"; O="Origin: https://resume.rigor.design"
h=000; for i in $(seq 1 30); do h=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$A/health"); [ "$h" = 200 ] && break; sleep 10; done
HB=$(curl -s --max-time 10 "$A/health")
chk "/health 200" "$h" 200
chk "/health ok:true" "$(echo "$HB" | jq -r .ok 2>/dev/null)" true
chk "/health environment" "$(echo "$HB" | jq -r .environment 2>/dev/null)" production
[ "$h" = 200 ] || log "  /health checks (booleans only): $(echo "$HB" | jq -c .checks 2>/dev/null)"
chk "unsigned webhook POST 400" "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{}' $A/api/payment/webhook)" 400
chk "OPTIONS create-embedded-session 204" "$(curl -s -o /dev/null -w '%{http_code}' -X OPTIONS -H "$O" -H 'Access-Control-Request-Method: POST' $A/api/payment/create-embedded-session)" 204
chk "anonymous analyze 401" "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "$O" -H 'Content-Type: application/json' -d '{}' $A/api/analyze)" 401
chk "anonymous checkout 401" "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "$O" -H 'Content-Type: application/json' -d '{"priceId":"pro"}' $A/api/payment/create-embedded-session)" 401
chk "anonymous confirm 401" "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "$O" -H 'Content-Type: application/json' -d '{}' $A/api/payment/confirm)" 401
chk "Payment Link still active (read-only GET)" "$(link_active)" true
if [ -n "${RIGOR_TEST_ID_TOKEN:-}" ]; then
  TA="Authorization: Bearer $RIGOR_TEST_ID_TOKEN"
  chk "unknown price 400" "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "$O" -H "$TA" -H 'Content-Type: application/json' -d '{"priceId":"price_not_rigor"}' $A/api/payment/create-embedded-session)" 400
  chk "unsubscribed first call 402" "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "$O" -H "$TA" -H 'Content-Type: application/json' -d '{"resume":"x","jobDescription":"y"}' $A/api/analyze)" 402
  chk "confirm (no session) inactive" "$(curl -s -X POST -H "$O" -H "$TA" -H 'Content-Type: application/json' -d '{}' $A/api/payment/confirm | jq -r .active)" false
else manual "no RIGOR_TEST_ID_TOKEN: signed-in checks (unknown price 400, first call 402, confirm inactive) not run"; fi
[ "$failn" = 0 ] || stop_report "[5] API verify (tools NOT deployed; they keep the gated build)"

# ── 6. Tools: checkout ON (API verified) ─────────────────────────────────────────────────────────
log "[6] deploy 7 tools @$PAID_REF (checkout on)"
for t in $TOOLS; do
  pid=$(vget "/v9/projects/rigor-$t" | jq -r '.id // empty')
  if [ -z "$pid" ]; then chk "Vercel project rigor-$t" none exists; continue; fi
  deploy_ref "rigor-$t" "$PAID_REF" "$pid" "$(tool_sha $t)" || chk "rigor-$t deploy" failed ok
done
[ "$failn" = 0 ] || stop_report "[6] tool deploys"

# ── 7. Verify the tools ──────────────────────────────────────────────────────────────────────────
log "[7] verify tools"
sleep 20
for t in $TOOLS; do
  U="https://$t.rigor.design"
  chk "$t / 200" "$(curl -s -o /dev/null -w '%{http_code}' $U/)" 200
  chk "$t /success 200" "$(curl -s -o /dev/null -w '%{http_code}' $U/success)" 200
  chk "$t /cancel 200" "$(curl -s -o /dev/null -w '%{http_code}' $U/cancel)" 200
  chk "$t /success confirms via API (success.js)" "$(curl -s $U/success | grep -c 'js/success.js')" 1
  chk "$t no buy.stripe.com href" "$(curl -sL $U/ | grep -c 'buy.stripe.com')" 0
  chk "$t checkout on (env.js)" "$(curl -s $U/js/config/env.js | grep -c 'VITE_PRO_CHECKOUT_ENABLED", "true"')" 1
  pc=$(curl -s $U/js/services/paymentService.js | grep -oE 'price: [0-9.]+, // must equal' | grep -oE '[0-9.]+' | head -1)
  chk "$t page price = Stripe price (\$${pc:-?})" "$(awk -v p="${pc:-0}" 'BEGIN{printf "%d", p*100+0.5}')" "$EXPECT_CENTS"
done
chk "Payment Link still active after tools (read-only GET)" "$(link_active)" true
[ "$failn" = 0 ] || stop_report "[7] tools verify"
manual "one real browser pass: sign in on resume.rigor.design → Get Rigor Pro → embedded checkout shows \$9.99/month. No real card unless the Principal chooses a live test purchase."

# ── 8. Keep main = what is live (fast-forward only, never force) ───────────────────────────────
log "[8] fast-forward main ← $PAID_REF (these Vercel projects are CLI-deployed, so this does not deploy)"
GT=$(gh auth token -u mdothree 2>/dev/null)
for r in api $TOOLS; do
  d="$W/ff-$r"; rm -rf "$d"; git clone -q "https://github.com/mdothree/rigor-$r.git" "$d" && git -C "$d" fetch -q origin "$PAID_REF"
  if git -C "$d" merge-base --is-ancestor origin/main FETCH_HEAD; then
    GH_TOKEN=$GT git -C "$d" -c credential.helper= -c credential.helper='!gh auth git-credential' push -q "https://github.com/mdothree/rigor-$r.git" FETCH_HEAD:refs/heads/main \
      && log "  rigor-$r main → $(git -C "$d" rev-parse --short FETCH_HEAD)" || log "  rigor-$r push failed (main untouched)"
  else log "  rigor-$r: main moved (not an ancestor of $PAID_REF) — merge by hand, never force"; fi
done
unset GT

log "=== done: pass=$pass fail=$failn · log $LOG ==="
log "HQ kit: RIGOR-API-525 → /health 200 production; RIGOR-PAY-BEFORE-API = 'checkout present only while https://$DOMAIN/health is 200'"
rm -rf "$W"
