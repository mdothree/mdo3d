# Runwae Apparel — Playbook

*Status: model decided 2026-10-07; supplier unverified; first drop undetermined. Owner: LB.*
*Home: `~/mdo3d/projects/external/runwae-apparel/` (Runwae stays under mdo3d). Brand-wise, **Runwae Apparel is a subsidiary of Butts Studios** (Principal, 2026-10-07). Both domains, runwaeapparel.com and girlslovebutts.com, are confirmed owned. The Runwae **app** (`../runwae`) is a separate product beside it.*

## How the lab runs this
Runwae and **GLB (girlslovebutts.com)** are two apparel brands built **concurrently**: no "one first", and
learnings are shared. They run on **one storefront codebase** with two brand configs, two domains and two
catalogs. Sequencing only happens inside a drop. The lab-wide bottleneck is **reach from the CLI**, so every
drop is planned around its distribution (see Reach).

## Decided (2026-10-07)

### 1. Pre-order drops: make only what's sold
1. **Open the pre-order window** for a set of designs: **2–3 weeks**.
2. **Close the window**, then tally the orders by design × size.
3. **Order that count from the Pakistan supplier**, plus a **~10% buffer** for defects and size swaps.
4. **The supplier ships one bulk carton by air courier.**
5. **We receive it, pack and ship domestically** (see §3).

**Rules for every drop:**
- **Charge at checkout** (Stripe Checkout). A card authorization can't be held for weeks.
- **Minimum per design** = the supplier's minimum order (MOQ). If a design misses it, refund those buyers
  in full or offer a swap to a design that made it.
- **Show "ships by [date]" on every product page.** That date = window close + production (~2–4 wk once
  samples are approved) + air freight (~1 wk) + receiving and packing (days). It's typically **5–8 weeks
  after close**.
- **FTC Mail Order Rule:** we must ship by the stated date. With no date stated, the deadline is 30 days,
  which pre-orders would break. If a date will be missed, notify buyers **before** it passes and offer
  cancel-for-full-refund.
- **Returns: size exchanges only, no returns.** State it at checkout. The buffer covers the swaps.

### 2. Print-on-demand in parallel
Simple printed tees run on **Printful**, which has a free account with a full API: catalog, Mockup Generator,
shipping rates and orders. That gives both brands a live store while the supplier is being verified, and it
covers long-tail designs. Hero pieces and cut-and-sew go through the Pakistan pre-order drops.

### 3. Self-fulfillment (LB receives, packs and ships)
- **Import:** LB is the importer of record. With DHL Express the courier clears customs and bills the duty,
  so no broker is needed. Count the carton against the tally when it lands.
- **Duty:** cotton tees and hoodies run roughly **16.5%** standard US duty, plus the **temporary 10% import
  surcharge** that took effect Feb 2026 (Pakistan's earlier 19% reciprocal rate was replaced). Build both
  into the unit cost. Re-check the rates at each drop; they move.
- **Labels:** an agent pulls the paid orders from Stripe and buys discounted USPS labels through a shipping
  API (**Shippo** or **EasyPost**). It prints labels with matching packing slips, sorted by design × size,
  and sends tracking numbers back to buyers.
- **LB's time:** about 1–2 minutes per order, so a 100-order drop is a few hours.
- **Kit:** a thermal label printer (one-time, ~$100–150), poly mailers, and optional branded inserts.
- **Return address:** a **PO box or virtual mailbox**, never the home address.
- **When to hand off:** move to a 3PL when packing time costs more than the warehouse fees. The same label
  and order export then goes to the warehouse instead of the printer, so nothing else changes. Boutique
  apparel 3PLs take small brands; the large ones (e.g. ShipBob) often set volume minimums.

### 4. Storefront: custom, not Shopify
- **Why not Shopify:** Basic is $39/mo ($29/mo annual) **per store**, plus 2.9% + 30¢ per card sale. Using
  our own Stripe instead of Shopify Payments adds another **2%**. Two brands means two subscriptions.
- **Our stack:**
  - **Hosting:** Vercel or Cloudflare Pages (already run fleet-wide).
  - **Checkout:** Stripe Checkout, which has the same 2.9% + 30¢ card rate and no monthly fee.
  - **Sales tax:** Stripe Tax, a small fee per transaction.
  - **Print-on-demand:** the Printful API.
- **What we give up:** Shopify's built-in fraud screening, abandoned-cart emails and app marketplace.
- **What we gain:** full control of each brand's look (Runwae's gold-frame renaissance style; GLB's line
  art), which templates would flatten.
- **The existing Shopify store** (its custom-domain TLS cert is broken) lapses once the custom site is live.

### 5. Product imagery from the CLI
- **The designs are LB's, never generated.**
- **Product shots:** Printful's Mockup Generator API (design file in → photoreal product shot out). Free
  tier; paid plans from $24.99/mo.
- **Lifestyle and hero images:** image-generation APIs. Flux Schnell is about $0.003/image, Flux Dev about
  $0.012, Ideogram Turbo about $0.03 (best for type on garments). Production quality sits around
  $0.03–0.04/image.

## Open (the Principal's calls)
- **Supplier verification.** He hasn't been in contact in years. Reconnect and confirm:
  - MOQ per design, color and size
  - unit price at small quantities
  - lead time
  - methods: printing vs. embroidery, and custom neck labels
  - deposit terms (30–50% is typical)
  - shipping: whether he can ship by air courier

  Then **pay for a sample run of 1–2 designs** before any pre-order opens. The samples double as product photos.
- **First drop:** undetermined. Most likely a re-release of an older line.
- **Pricing:** worked back from the supplier quote, duty, packaging and postage.

## Brand source material (all pre-LLM, all real)
- **Design source:** `~/mdo3d/projects/external/runwae-apparel/design/` (108 files).
  - **Fall '21 line:** True Grit tee + hoodie, Crafting, the wordmark tee, Poison, Pave.
  - **Marks:** the dripping-R emblem, "The Runwae Company" / TRC.
  - **Illustrator sources:** `Fall 21/all_products.ai`, `finaldesigns.ai`, `TLT/RWAline.ai`.
- **Older web exports:** `~/buttsstudios/client_assets_archive/{runwae,runwaeapparel}/`, including the 2021
  magazine cover "Everybody Influences", Issue No. 1.
- **Old site template:** `~/buttsstudios/clients/runwae_template/`.
- **Brand naming:** "Runwae Apparel" is the brand (a Butts Studios subsidiary); TRC is a secondary mark.
- **GLB source:** `~/mdo3d/projects/external/runwae-apparel/design/glb/source_line_art/` (line-art figure drawings + branding inspiration). GLB is
  an apparel brand built from the line art. **No apparel mockups exist yet** for the GLB drawings, so they're
  the first concrete design task: vectorize/clean the line drawings, then run them through Printful's Mockup
  Generator on tees and hoodies. The finished artwork is LB's call; generation is for mockups only.
- **Accounts:** `GLB/GLBKeys.xlsx` lists the old Runwae/GLB accounts. It holds passwords, so **never copy it
  into a repo, a doc or a chat.** Whether those accounts are still live is open, and they matter for reach.

## Reach (the lab-wide bottleneck)
Every drop gets a reach plan run through the shared CLI distribution layer: social posting, YouTube and
attribution (GA4 → Stripe). The existing Runwae/GLB social accounts are existing audiences, if they're still
live. Nothing posts without the Principal's per-batch OK.

## Agent-doable once the accounts exist
- **Storefront:** one codebase with two brand configs, plus Stripe Checkout and Stripe Tax.
- **Printful:** catalog sync and mockup generation.
- **Each drop:** pre-order window pages with ship-by dates, tally reports at close, supplier PO sheets, the
  label/packing-slip pipeline, tracking emails and delay notices.
- **Nothing** is published, listed, charged or ordered without the Principal's OK.
