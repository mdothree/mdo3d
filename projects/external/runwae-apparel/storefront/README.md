# Apparel storefront: Runwae Apparel + GLB

One codebase, two brands (`brands/runwae`, `brands/glb`), per the playbook (`../APPAREL_PLAYBOOK.md` §4).
It's a static site plus one serverless function for Stripe Checkout. Zero npm dependencies; Node ≥ 20.
Python 3 + Pillow is used only for the image step.

**State:** preview only. Every product is `draft` with no price, both brands are `"mode": "preview"`
(noindex, a banner, no buy buttons), and checkout is off unless `CHECKOUT_ENABLED=true`. **Nothing here has
been deployed.** Deploying, pricing, going live and any Stripe key are the Principal's per-item calls.

## Layout
```
brands/<id>/brand.json     name, endorsement, theme (colours/fonts/frame), shipping, policy copy, mode
brands/<id>/catalog.json   products: id, line, type, channel (printful|preorder), method, images, sizes, price_cents, status, rights_hold
brands/<id>/drops.json     pre-order drops: products, window {open, close}, schedule overrides, moq
brands/<id>/assets/        web-size images made by tools/assets.py (committed; originals stay in ../design)
src/drop.mjs               ship-by, window state, tally, PO + buffer + MOQ, landed cost, purchasable()
src/build.mjs              static build -> dist/<brand>/ (or --brand X --out public)
api/checkout.mjs           POST {product,size,qty} -> Stripe Checkout Session URL
tools/drop.mjs             drop CLI (below)
tools/assets.py            design/ originals -> brands/<id>/assets/*.jpg
tools/photos.py            styled product photos (looks: gallery | sketchbook) -> brands/<id>/photos/ (see ../AESTHETIC.md)
test/                      node --test test/*.test.mjs  (17 tests)
```

## Commands
```sh
node src/build.mjs                               # both brands -> dist/
node src/build.mjs --brand runwae --now 2026-11-05T00:00:00Z   # preview as of a date
node --test test/*.test.mjs
python3 tools/assets.py runwae                   # after changing catalog images
python3 tools/photos.py runwae all               # both photo looks (run off-box)
node src/build.mjs --brand runwae --out preview --look sketchbook   # whole shop in one look; taste.html compares both

node tools/drop.mjs shipby 2026-11-15            # -> ship-by 2027-01-03 (49 days, conservative)
node tools/drop.mjs window runwae fall21-rerelease
node tools/drop.mjs tally orders.json            # Stripe checkout.session list or {product,size,qty,status} rows / CSV
node tools/drop.mjs po orders.json --moq 24 --out po.csv
node tools/drop.mjs landed --unit 12 --qty 60 --freight 240 --packaging 0.8 --postage 5.5 --samples 90
node tools/drop.mjs notice runwae fall21-rerelease --new-date 2027-01-20
```

## How a product goes live (each step needs the Principal's OK)
0. Clear any `rights_hold` (a product with one can never be sold; none currently. The wordmark tee went front-only per #82-d).
1. **Printful tee:** set `price_cents`, `printful_variant_ids` (once the Printful key exists) and `status: "live"`.
2. **Pre-order piece:** also set its drop's `window.open/close` (14–21 days) and `moq` from the supplier quote.
   Ship-by = close + 28 production + 7 freight + 7 receiving + 7 safety days. Override per drop in `schedule`.
3. Set `brand.json` `shipping.flat_cents` and `mode: "live"`.
4. Rebuild when a window opens or closes (the page state is baked at build time; checkout re-checks server-side).

## Checkout safety (`api/checkout.mjs`)
- 503 unless `CHECKOUT_ENABLED=true`; **refuses `sk_live_` keys** unless `ALLOW_LIVE_STRIPE=true` too.
- Price, name and ship-by come from the server catalog; the client sends only product, size and qty (1–5).
- Stripe Tax (`automatic_tax`, clothing tax code), US-only shipping address, flat shipping rate.
- Metadata (`brand, product, size, qty, drop, ship_by`) is what `tools/drop.mjs tally` reads at window close.

## Deploy (later, gated)
One Vercel project per brand, same repo: env `BRAND=runwae|glb`, `SITE_URL`, `STRIPE_SECRET_KEY` (test first),
`CHECKOUT_ENABLED`. `vercel.json` builds `public/` and ships the brand JSON with the function.

## Not built yet (needs accounts)
Printful catalog sync + Mockup Generator · Shippo/EasyPost label + packing-slip pipeline · Stripe webhook →
order store + tracking emails · refunds for under-MOQ designs · GA4 → Stripe attribution.

## Notes
- Landed cost includes postage per unit, so the suggested price is conservative even before the shipping charge.
- Duty defaults (16.5% + 10% surcharge) are from the 2026-10-07 playbook. Re-check them each drop.
- The delay-notice template follows the FTC Mail Order Rule: silence = consent only for delays ≤ 30 days; past that it needs express consent.
- Policy copy (14-day exchange window, contact inboxes, GLB tagline) is placeholder until LB confirms.
