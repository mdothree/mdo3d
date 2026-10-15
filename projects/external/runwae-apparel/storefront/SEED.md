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
  inventory.mjs    the shared inventory master (inventory/inventory.csv): CSV, validation, merge into catalogs
  stock.mjs        stock ledger (inventory/ledger.csv): replay, availability, reservations, sale/receive/adjust/return
  admin.mjs        local admin page (dist/_admin/) + stock report + order email previews
  policies.mjs     Privacy, Terms, Returns and pre-orders, Shipping + policies hub from one template; per-brand
                   fields in brand.json `policies` (entity, contact, address, law, returns window...); every footer
                   gets the legal links; a live build fails while any [CONFIRM: ...] or *_status placeholder remains
  email.mjs        order emails: shop "New order" + customer confirmation, one template, Resend or outbox/
  style-rules.mjs  small-corners check (border-radius <= 4px; 50% only on true circles)
  base.css         reset, a11y, variant pickers, cart, phone menu (820px), cards, details
  client/seed.js   browser UI: phone menu, add to bag, live availability, cart page, notify me, order lookup
brands/<id>/
  brand.json       name, domain, mode (preview|live), tokens {colors, fonts, fontsHref}, copy, shipping, policies,
                   main_site? {label, url}, print_rules?, order_prefix, from_name, orders_from, orders_inbox
  catalog.json     product definitions: name, copy, images, sizes, colours, print spec (NO status/price/stock)
  drops.json       pre-order windows; ship-by = close + 49 days unless `schedule` overrides (membership: inventory drop_id)
  images.json      crop list for tools/images.mjs (sources may be anywhere; outputs land in assets/)
  assets/          web images + manifest.json (written by tools/images.mjs), favicon
  layout/index.mjs header(ctx), footer(ctx), pages {home, collection, product, story[, cart, orders, policies, thanks]}
  layout/styles.css brand CSS on top of core/base.css (tokens arrive as --c-* / --f-*)
inventory/         inventory.csv (master, every shop) + ledger.csv (append-only stock movements)
api/checkout.mjs   POST {brand, lines} -> holds stock, then Stripe Checkout (off unless CHECKOUT_ENABLED; refuses live keys)
api/stripe-webhook.mjs  checkout.session.completed -> sale + order store + both emails; .expired -> release the hold
api/availability.mjs    GET ?brand= -> live per-SKU availability for the product and cart pages
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
4. Fill `catalog.json` (3 to 8 items) and `drops.json`, then give every product an inventory row:
   `node tools/inventory.mjs set <id>/<product> status=in_development` (and SKU rows before it goes on sale).
5. Art-direct `layout/index.mjs` + `layout/styles.css`. Use `ctx.kit` components so cart, variants, notify,
   states and captions keep working. No inline `style=""` and no inline scripts (the CSP blocks them).
6. `node src/build.mjs --brand <id>` -> `dist/<id>/`, then `node --test test/*.test.mjs`.

## Item status (per product, set in inventory/inventory.csv)

| status | shows | buy control |
|---|---|---|
| `available` | Available + price (or Price TBA) | Add to bag |
| `preorder` | Pre-order + ship-by date once the drop window is set | Pre-order (add to bag) |
| `next_drop` | Opens <date> (from `opens` or the drop window) or Next drop | Notify me |
| `in_development` | Concept · not yet available | none |
| `archive` | Archive · <archive_year> (pieces that really existed only) | none |
| `sold_out` | Sold out (+ Notify me unless `restock_notify: false`) | none |

`sold_out` needs real backing: `sales_record_channel` on the inventory row (where the real sales happened; never
rendered or shipped to the browser), or real stock reaching 0 after real sales in the ledger. Without one the build
fails. No fake scarcity.

An empty `price_cents` renders **Price TBA** and keeps checkout off for that item. Checkout as a whole is off unless
`brand.mode` is `live` and `CHECKOUT_ENABLED=true` (and the server only accepts Stripe test keys unless
`ALLOW_LIVE_STRIPE=true`).

## Design rules (every brand inherits these; the build enforces them)

Principal, 2026-10-14, verbatim:
1. "if the art is large like the size of the shirt it should be on the back of the shirt" (later the same day:
   back-only is **GLB-only**; Runwae, Butts Studios and Ridgefield may carry large front art)
2. "across all designs, chest icons should be medium sized, not overly large" (every brand)
3. "i dont like the larg eborder radius on any of those sites. im generally not a fan of alrge border radius unless
   circle." -> **border-radius 4px or less** everywhere; `50%` only on a true circle (a rule that also sets equal
   width and height, or aspect-ratio 1). No pills (999px), no 8-24px cards, panels, stickers or buttons. GLB stays
   playful through colour and type. `core/style-rules.mjs` checks core/base.css and every brand's styles.css and
   layout/index.mjs at build time; any violation fails the build.
4. "i think it shold only be footer link to get betweeen main site and shop for now" -> brand.json
   `main_site: {label, url}` renders in the footer only, by the core (`.seed-mainsite`). Butts Studios ->
   buttsstudios.com, Ridgefield -> ridgefieldtech.com. Runwae Apparel and GLB are their own main sites (no
   main_site). No header, nav or page body links to a main site (a test checks every page).

Every listed item carries `print`: one `{placement, size}` or a list (`[]` = unbranded).
- Placements: `back`, `front_chest`, `sleeve`, `neck`, `cuff`, `pocket`, `front_panel`, `hood`, `leg`.
- Sizes: `full_back` (shirt-sized art, back only), `full_front` (large front art, front_panel only), `back_medium`,
  `chest_medium` (**the only chest size**), `patch_medium`, `panel_medium`, `half_front` (front_panel only), `label`.
- brand.json `print_rules: {"large_art": "back_only"}` (GLB) makes any `full_*` size off the back fail. A chest
  mark that isn't `chest_medium` fails for every brand. Archive pieces are historical and exempt. Product pages show the spec as a Print line ("Back print · full size · Chest mark · medium").
- When a render shows art in the wrong place, lead with a placement mockup (`tools/placement_mockup.mjs`) and caption it.
  Never redraw the owner's art: mockups use the real lines only (`tools/runwae_line_mockups.sh`).
- Colourways of one design are one product with `colors` and per-colour `images[].color`; the product page gets a
  colour switcher (`kit.colorGalleries`, `kit.colorSwitch`).

## Cart and orders

- Cart lives in `localStorage` per brand (`seed-cart:<id>`), lines `{product, size, color, qty}`, max 5 per line,
  10 lines. Guest checkout only (Stripe Checkout + Link); no accounts.
- Mixed carts: pre-order + in-stock, or several drops, ship together when the latest item is ready. The bag shows
  that date ("Everything ships together by …"), checkout repeats it, and the session's `metadata[ship_by]` is the latest.
- Each Stripe line carries `{brand, product, size, color, qty, drop, ship_by, channel}` on
  `price_data.product_data.metadata`. `node tools/drop.mjs tally orders.json [--drop id]` reads them (list sessions with
  `expand[]=data.line_items&expand[]=data.line_items.data.price.product`).

## Inventory

Principal, 2026-10-14, verbatim: "ensure the inventory management is unfiorm and even shared really. because
realistically i will manage it all" and "and the inventory maangament must be proper also".

**One inventory for all four shops**, the same fields and rules for every brand (no per-brand logic):

- `inventory/inventory.csv` is the editable master. Two kinds of row:
  - **product row** (`variant` = `-`): `status` (available | preorder | next_drop | in_development | archive |
    sold_out), `price_cents` (empty = Price TBA), `drop_id`, `sales_record_channel`, `notes`.
  - **SKU row** (`variant` = `<colour>/<size>`, colour `-` when a product has no colours). SKU =
    brand/product/colour/size. `fulfilment`: `stock` (physical units; `stock` = on hand, `low_stock` = alert
    threshold), `preorder` (made after the drop closes; optional `preorder_cap`) or `pod` (Printful print-on-demand,
    no count). `status` is empty (inherits) or `sold_out`. A product that can be bought needs a SKU row for every
    colour x size.
- `inventory/ledger.csv` is append-only: every movement is a row `id, ts, sku, kind, qty, fulfilment, ref, order,
  reason, expires_at`, kind = `receive` (ref = PO), `sale`, `reserve`, `release`, `adjust` (reason required),
  `return` (order required) or `fulfil` (pre-orders shipped from received stock). **Current stock is the replay of
  the ledger.** The `stock` column mirrors it; every writer updates both under one lock, and `check` fails if they
  drift (someone edited stock by hand).
- Product definitions (name, copy, images, print) stay in each brand's catalog.json. The core merges at build time
  and the build **fails** on a mismatch (an inventory row with no product, a product with no row, status/price left in
  a catalog, drop membership in drops.json) or any rule (sold_out without a sales channel, a preorder with no drop,
  an unknown drop, a priced archive piece, a SKU that isn't a real colour/size, per-SKU prices, stock on a pod SKU...).

**No overselling.** `api/checkout.mjs` re-checks every line against live stock and **holds** it for the Stripe
session's 30 minutes (`reserve`, all-or-nothing, under the file lock). The webhook turns the hold into a `sale` and
decrements stock (idempotent per order); an expired or cancelled session releases it (`checkout.session.expired`,
or lazily once `expires_at` passes; `release-expired` records those). Pre-order caps work the same way. The product
page and the bag show live availability (`/api/availability`, build-time snapshot as fallback): In stock, **Only N
left** (only when true: at or under the SKU's `low_stock`), Pre-order, Made to order, Pre-order full, Sold out (only
from real stock reaching 0 after real sales, or a sales record), Not in stock yet (never received). Sold-out sizes
are disabled per colour.

### Managing inventory (all shops)

```sh
node tools/inventory.mjs list [--brand glb] [--status preorder] [--alerts]
node tools/inventory.mjs set glb/icon-tee status=preorder price=48 drop=first-drop   # price in dollars; price=TBA clears
node tools/inventory.mjs set glb/icon-tee:white/M fulfilment=stock low=3            # SKU settings (cap=, low=)
node tools/inventory.mjs receive glb/icon-tee/white/M qty=24 po=PO-0012             # supplier delivery
node tools/inventory.mjs fulfil-drop glb/first-drop                                 # ship owed pre-orders from stock
node tools/inventory.mjs adjust glb/icon-tee/white/M qty=-1 reason="damaged"
node tools/inventory.mjs return glb/icon-tee/white/M qty=1 order=GLB-AB12CD34
node tools/inventory.mjs export sheet.csv      # spreadsheet round-trip (adds a read-only name column)
node tools/inventory.mjs import sheet.csv reason="cycle count"   # validated whole; stock edits become adjust rows
node tools/inventory.mjs export-stock stock.csv | export-ledger ledger.csv
node tools/inventory.mjs check                 # rules + catalog match + ledger reconcile; exit 1 on problems
```

Drop PO flow: at window close `node tools/drop.mjs po orders.json` writes the supplier PO; when it arrives,
`receive` each SKU against that PO number, then `fulfil-drop` ships the owed pre-orders.

**Admin page:** `node src/build.mjs` (all brands) writes `dist/_admin/index.html`: every SKU of all four shops in one
table (filter by shop, status, alerts, search), per-shop counts and totals (on hand, reserved, owed, low, out), pre-orders
vs cap, recent ledger movements, low/out rows highlighted, CSV exports (`stock.csv`, `ledger.csv`) and the order email
previews. Read-only. **Never deployed:** the deploy build is `--brand $BRAND --out public` (vercel.json), which never
writes `_admin`; `buildBrand` refuses any `_` id; `.vercelignore` drops `dist/`. Do not copy `dist/_admin` into any
public output. Open it locally: `open dist/_admin/index.html`.

**Files now, a database later.** Storage is CSV files on one host with a lock directory (`inventory/.lock`). That
holds for a single server (or local runs) only: serverless platforms have no shared, persistent disk. When the shop
goes live on more than one instance, move `inventory.csv` + `ledger.csv` to a database (Postgres, or SQLite on the
one host): the ledger becomes an insert-only table with a unique index on (order, sku, kind) for sale idempotency,
`reserve` becomes one transaction (`SELECT ... FOR UPDATE` on the SKU row, or a conditional insert) instead of the
lock, holds expire by query, and `stock` becomes a view over the ledger. `core/stock.mjs` keeps its function
signatures, so checkout, the webhook, the CLI and the admin page don't change.

## Orders and emails

Principal, 2026-10-14, verbatim: "then make sure we also get an email to the respective website and we also send them
a checkout email". Shared core, the same for every shop:

- **Trigger:** Stripe `checkout.session.completed` -> `api/stripe-webhook.mjs`: verifies `Stripe-Signature` with
  `STRIPE_WEBHOOK_SECRET` (5 min tolerance), skips event ids already seen (`orders/events.jsonl`), commits the stock
  hold as a sale (idempotent per order), appends the order with its per-line metadata to `orders/orders.jsonl` (the
  start of the order log; gitignored, holds addresses), then sends:
  - **(a) shop notification** "New order" to brand.json `orders_inbox` (default `orders@<domain>`): order number,
    items/variants/qty, totals, shipping address, pre-order drop + ship-by, low-stock alerts when the order took a SKU
    to or below its threshold, and the admin link (`ADMIN_URL`).
  - **(b) customer confirmation** from `orders_from` (orders@<shop domain>) as `from_name`: order number, items,
    totals, the ship-by line (mixed orders: "Everything ships together by <latest date>"), the order lookup link and
    the contact + shipping/exchanges/refunds links. HTML + text, branded from the brand tokens, small corners.
- **Sender:** Resend (`RESEND_API_KEY`; key request `[apparel-email]` is in the command center). Without the key the
  rendered emails go to `outbox/` (.html + .txt) and the log says "not sent (no RESEND_API_KEY)". A send failure never
  fails the order.
- **Test mode only:** customer emails reach a real customer ONLY when `EMAIL_LIVE=true` (the Principal's GO for live
  checkout). Until then they go to `EMAIL_TEST_TO` if set, else outbox/. Stripe live-mode events never email a
  customer without `EMAIL_LIVE`. Verify each sending domain in Resend and confirm the inboxes exist first.
- **Order numbers:** `<order_prefix>-<last 8 of the session id>` (BS, RW, GLB, RF).
- **Preview:** `node src/build.mjs` renders a clearly-marked sample of both emails for each brand into
  `dist/_admin/emails/`, linked from the admin page.
- Env: `STRIPE_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY` (test key, to fetch line items), `RESEND_API_KEY`, `EMAIL_TEST_TO`,
  `EMAIL_LIVE`, `ADMIN_URL`, `SITE_URL`, `INVENTORY_ROOT` / `ORDERS_ROOT`. Deploying the webhook is payments code:
  gated on the Principal's OK, like checkout.
