#!/usr/bin/env bash
# Deploy the divination payment loop: set API env vars, deploy 6 APIs + 9 frontends.
#
# Prereqs:
#   1. vercel login   (or export VERCEL_TOKEN=...)
#   2. export STRIPE_SECRET_KEY=sk_live_...   (MDO3D Stripe account)
#
# After running, one manual Stripe-dashboard step remains: point each Payment
# Link's after-payment redirect at
#   https://<service>.mdo3d.com/success?session_id={CHECKOUT_SESSION_ID}
set -euo pipefail

# Honor VERCEL_TOKEN for non-interactive runs (CI / agent-driven deploys).
vercel() { command vercel ${VERCEL_TOKEN:+--token "$VERCEL_TOKEN"} "$@"; }

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -z "${STRIPE_SECRET_KEY:-}" ]; then
  echo "ERROR: export STRIPE_SECRET_KEY first (sk_live_... from the MDO3D Stripe account)"; exit 1
fi
vercel whoami >/dev/null 2>&1 || { echo "ERROR: run 'vercel login' first"; exit 1; }

# service | api dir | frontend dir | frontend prod URL
SERVICES=(
  "iching|projects/divination/iching/api|projects/divination/iching/iching|https://iching.mdo3d.com"
  "runes|projects/divination/runes/api|projects/divination/runes/runes|https://runes.mdo3d.com"
  "astrology|projects/divination/astrology/api|projects/divination/astrology/astrology|https://astrology.mdo3d.com"
  "numerology|projects/divination/numerology/api|projects/divination/numerology/numerology-app|https://numerology.mdo3d.com"
  "fengshui|projects/divination/fengshui/api|projects/divination/fengshui/feng-shui-analyzer|https://fengshui.mdo3d.com"
  "pastlives|projects/divination/pastlives/api|projects/divination/pastlives/past-life-insights|https://pastlife.mdo3d.com"
)

set_env() { # dir key value
  # remove-then-add so reruns update rather than fail
  (cd "$1" && vercel env rm "$2" production --yes >/dev/null 2>&1 || true)
  (cd "$1" && printf '%s' "$3" | vercel env add "$2" production >/dev/null)
}

for row in "${SERVICES[@]}"; do
  IFS='|' read -r name api fe feurl <<<"$row"
  echo "== $name: configuring API env"
  set_env "$api" STRIPE_SECRET_KEY "$STRIPE_SECRET_KEY"
  set_env "$api" FRONTEND_URL "$feurl"
  echo "== $name: deploying API"
  (cd "$api" && vercel deploy --prod --yes >/dev/null) && echo "   API deployed"
  echo "== $name: deploying frontend"
  (cd "$fe" && vercel deploy --prod --yes >/dev/null) && echo "   frontend deployed"
done

# Frontends without their own API config changes (tarot/oracle/dreams frontends
# also carry the module-404 fix + success.html)
for fe in projects/divination/tarot/tarot-cards projects/divination/oracle/oracle-cards projects/divination/dreams/dream-interpreter; do
  echo "== deploying $(basename "$fe")"
  (cd "$fe" && vercel deploy --prod --yes >/dev/null) && echo "   deployed"
done

echo
echo "Smoke test:"
for row in "${SERVICES[@]}"; do
  IFS='|' read -r name api fe feurl <<<"$row"
  host=$(grep -o 'https://[a-z-]*api[a-z-]*\.vercel\.app' "$fe"/public/js/app.js "$fe"/app/page.tsx 2>/dev/null | head -1)
  [ -n "$host" ] && curl -s -m 15 -X POST "$host/api/payment/create-checkout" \
    -H 'Content-Type: application/json' \
    -d '{"readingType":"single-premium","email":"smoke@test.local"}' | head -c 120 && echo "  <- $name"
done
echo "Done. Remaining manual step: Stripe dashboard Payment Link redirects (see script header)."
