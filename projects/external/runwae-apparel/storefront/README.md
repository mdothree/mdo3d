# Apparel storefronts: universal seed + four shops

One codebase, four shops: **Butts Studios** (store.buttsstudios.com), **Runwae Apparel** (runwaeapparel.com),
**Girls Love Butts** (girlslovebutts.com) and **Ridgefield** (store.ridgefieldtech.com). A shared core does the
guts; each brand has its own art-directed layout. How it fits together and how to add a brand: **[SEED.md](SEED.md)**.
Static site plus serverless functions; zero npm dependencies; Node >= 20. Images: `node tools/images.mjs <brand>`
(macOS `sips`).

**State (2026-10-14):** preview only. One shared inventory for all four shops (`inventory/`, `tools/inventory.mjs`,
local admin at `dist/_admin/`), order emails ready in test mode (`api/stripe-webhook.mjs`), Runwae v4 (Drawn Series). Every shop is `"mode": "preview"` (noindex, a preview banner), every item is
unpriced (Price TBA), checkout is off. Each shop has one focus item you can add to the bag (pre-order); the rest
show their state (next drop, concept, archive). **Nothing has been deployed.** Pricing, going live and any Stripe
key are the Principal's per-item calls. Physical fulfilment is on (no "digital only" rule). No Poison or Pave hoodie.

## Layout
```
core/                      shared guts (never names a brand); see SEED.md
brands/_template/          copy this to start a brand
brands/<id>/               brand.json · catalog.json · drops.json · images.json · assets/ · layout/{index.mjs,styles.css}
src/build.mjs              build CLI -> dist/<brand>/ (or --brand X --out public); src/drop.mjs re-exports core/drop.mjs
inventory/                 inventory.csv (status, price, per-SKU stock settings; every shop) + ledger.csv (stock movements)
api/checkout.mjs           POST {brand, lines} -> holds stock, then a Stripe Checkout Session URL (multi-line, per-line metadata)
api/stripe-webhook.mjs     paid session -> sale + order log + shop "New order" + customer confirmation emails
api/availability.mjs       GET ?brand= -> live per-SKU availability
tools/inventory.mjs        inventory CLI: list, set, receive, adjust, return, fulfil, export/import, check
api/notify.mjs             Notify-me stub (local JSONL log; TODO before deploy)
api/order-lookup.mjs       order lookup stub (503 until the order store exists)
tools/images.mjs           crop list -> brands/<id>/assets/*-<w>.jpg + manifest.json
tools/drop.mjs             drop CLI (below)
tools/assets.py, photos.py, digital_mocks.py   older Runwae image tools (Python + Pillow, run off-box)
test/                      node --test test/*.test.mjs  (86 tests)
```
Kept as data, no longer built: `brands/runwae/catalog-digital.json`, `digital/` and `photos/` (the 2026-10-12
digital-only direction and the gallery/sketchbook photo looks). `photos/` still feeds the Runwae holding page.

## Commands
```sh
node src/build.mjs                               # every brand -> dist/<brand>/
node src/build.mjs --brand runwae --now 2026-11-05T00:00:00Z   # preview as of a date
node --test test/*.test.mjs
node tools/images.mjs glb                        # re-crop a brand's images from its images.json
python3 tools/photos.py runwae all               # both photo looks (run off-box)
node src/build.mjs --holding --brand runwae --out holding-dist       # pre-launch holding page

node tools/drop.mjs shipby 2026-11-15            # -> ship-by 2027-01-03 (49 days, conservative)
node tools/drop.mjs window runwae fall21-rerelease
node tools/drop.mjs tally orders.json [--drop id] # Stripe sessions (expand line_items) or our rows / CSV; multi-line aware
node tools/drop.mjs po orders.json --moq 24 --out po.csv
node tools/drop.mjs landed --unit 12 --qty 60 --freight 240 --packaging 0.8 --postage 5.5 --samples 90
node tools/drop.mjs notice runwae fall21-rerelease --new-date 2027-01-20
```

## How a product goes live (each step needs the Principal's OK)
0. Clear any `rights_hold`.
1. Set the price and status in the shared inventory: `node tools/inventory.mjs set <brand>/<product> price=48 status=preorder`
   (`available` sells now; `preorder` sells inside its drop window), plus SKU rows (fulfilment, caps, stock).
2. Pre-order piece: set its drop's `window.open/close` (14 to 21 days) and `moq`. Ship-by = close + 28 production
   + 7 freight + 7 receiving + 7 safety days; override per drop in `schedule`.
3. Set `brand.json` `shipping.flat_cents` and `mode: "live"`; deploy with `CHECKOUT_ENABLED=true` and a test key first.
4. Rebuild when a window opens or closes (page state is baked at build time; checkout re-checks server-side).

## Checkout safety (`api/checkout.mjs`)
- 503 unless `CHECKOUT_ENABLED=true`; **refuses `sk_live_` keys** unless `ALLOW_LIVE_STRIPE=true` too.
- Price, name and ship-by come from the server catalog; the client sends only product, size, colour and qty (1 to 5 per line, 10 lines).
- Stripe Tax (`automatic_tax`, clothing tax code), US-only shipping address, flat shipping rate.
- Per-line metadata (`brand, product, size, color, qty, drop, ship_by, channel`) on `price_data.product_data.metadata` is what `tools/drop.mjs tally` reads at window close. Mixed carts ship when the latest item is ready (`metadata[ship_by]` = latest).
- Guest checkout only; Stripe Link comes from dynamic payment methods in the Dashboard.

## Deploy (later, gated)
One Vercel project per brand, same repo: env `BRAND=buttsstudios|runwae|glb|ridgefield`, `SITE_URL`, `STRIPE_SECRET_KEY` (test first),
`CHECKOUT_ENABLED`. `vercel.json` builds `public/` and ships the brand JSON with the function.

## Not built yet (needs accounts)
Printful catalog sync + Mockup Generator · Shippo/EasyPost label + packing-slip pipeline · Stripe webhook →
order store (then order lookup goes live) + status emails (confirmed / in production / shipped / delay) · real
Notify-me list · refunds for under-MOQ designs · GA4 → Stripe attribution.

## Notes
- Landed cost includes postage per unit, so the suggested price is conservative even before the shipping charge.
- Duty defaults (16.5% + 10% surcharge) are from the 2026-10-07 playbook. Re-check them each drop.
- The delay-notice template follows the FTC Mail Order Rule: silence = consent only for delays ≤ 30 days; past that it needs express consent.
- Policy copy (14-day exchange window, contact inboxes) and the GLB / Ridgefield headlines are provisional until LB confirms.
