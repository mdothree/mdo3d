# Universal storefront seed

One shared core, one art-directed layout per brand. The core does the guts (catalog, item states, drops and
ship-by, cart, checkout payload, order lookup, policies, SEO, images, accessibility). A brand folder holds
its data, its tokens and its page templates. **The core never names a brand** (a test enforces it), so a fix
in `core/` ships to every shop.

```
core/
  build.mjs        brands/<id>/ -> static site: <head>/SEO/OG/JSON-LD, tokens -> CSS vars, shared pages, catalog.js
  kit.mjs          components layouts call: img/srcset, figure (+ "Concept render" captions), card, buyBox,
                   sizes/swatches, notify form, details, menu button, bag link, cart/orders/policies bodies
  catalog.mjs      load + validate catalog; item status -> label / canAdd / notify / ship-by (productView)
  cart.mjs         cart maths shared by browser and Node: add/merge/qty/remove, ship notice, checkout body
  checkout.mjs     cart -> Stripe Checkout params: one line_item per line, per-line metadata
  drop.mjs         ship-by, windows, tally (multi-line orders), PO + MOQ, landed cost, purchasable()
  base.css         reset, a11y, variant pickers, cart, phone menu (820px), cards, details
  client/seed.js   browser UI: phone menu, add to bag, cart page, notify me, order lookup
brands/<id>/
  brand.json       name, domain, mode (preview|live), tokens {colors, fonts, fontsHref}, copy, shipping, policies
  catalog.json     3 to 8 items (see statuses below)
  drops.json       pre-order windows; ship-by = close + 49 days unless `schedule` overrides
  images.json      crop list for tools/images.mjs (sources may be anywhere; outputs land in assets/)
  assets/          web images + manifest.json (written by tools/images.mjs), favicon
  layout/index.mjs header(ctx), footer(ctx), pages {home, collection, product, story[, cart, orders, policies, thanks]}
  layout/styles.css brand CSS on top of core/base.css (tokens arrive as --c-* / --f-*)
api/checkout.mjs   POST {brand, lines} -> Stripe Checkout (off unless CHECKOUT_ENABLED; refuses live keys by default)
api/notify.mjs     POST {brand, product, email} -> appends to a local log. STUB (TODO: real list before deploy)
api/order-lookup.mjs POST {order, email} -> 503 until the order store exists. STUB
```

## Add a brand

1. `cp -R brands/_template brands/<id>` (folders starting with `_` are never built).
2. Edit `brand.json`: `id` (= folder name), `name`, `domain`, `tokens.colors` (`bg fg muted accent line panel`
   are required by the core; add any others your layout uses), `tokens.fonts` (`display body`, optional `mono`)
   and `tokens.fontsHref` (Google Fonts URL or null). Keep `"mode": "preview"` until launch.
3. List crops in `images.json`, run `node tools/images.mjs <id>` (macOS `sips`, no installs). Reference images
   in the catalog by their `out` key. Mark AI/mock imagery `"concept": true` and it is captioned "Concept render".
4. Fill `catalog.json` (3 to 8 items) and `drops.json`.
5. Art-direct `layout/index.mjs` + `layout/styles.css`. Use `ctx.kit` components so cart, variants, notify,
   states and captions keep working. No inline `style=""` and no inline scripts (the CSP blocks them).
6. `node src/build.mjs --brand <id>` -> `dist/<id>/`, then `node --test test/*.test.mjs`.

## Item status (per catalog item)

| status | shows | buy control |
|---|---|---|
| `available` | Available + price (or Price TBA) | Add to bag |
| `preorder` | Pre-order + ship-by date once the drop window is set | Pre-order (add to bag) |
| `next_drop` | Opens <date> (from `opens` or the drop window) or Next drop | Notify me |
| `in_development` | Concept · not yet available | none |
| `archive` | Archive · <archive_year> (pieces that really existed only) | none |
| `sold_out` | Sold out (+ Notify me unless `restock_notify: false`) | none |

`sold_out` needs real backing: an internal `"sales_record": {"channel": "...", "note": "..."}` (never rendered or
shipped to the browser) or `sold_count >= stock`. Without one the build fails. No fake scarcity.

`price_cents: null` renders **Price TBA** and keeps checkout off for that item. Checkout as a whole is off unless
`brand.mode` is `live` and `CHECKOUT_ENABLED=true` (and the server only accepts Stripe test keys unless
`ALLOW_LIVE_STRIPE=true`).

## Cart and orders

- Cart lives in `localStorage` per brand (`seed-cart:<id>`), lines `{product, size, color, qty}`, max 5 per line,
  10 lines. Guest checkout only (Stripe Checkout + Link); no accounts.
- Mixed carts: pre-order + in-stock, or several drops, ship together when the latest item is ready. The bag shows
  that date ("Everything ships together by …"), checkout repeats it, and the session's `metadata[ship_by]` is the latest.
- Each Stripe line carries `{brand, product, size, color, qty, drop, ship_by, channel}` on
  `price_data.product_data.metadata`. `node tools/drop.mjs tally orders.json [--drop id]` reads them (list sessions with
  `expand[]=data.line_items&expand[]=data.line_items.data.price.product`).
