# Runwae Apparel — Playbook (working notes)

*Status: idea capture / scoping. Nothing committed. Owner: LB.*
*Location: `mdo3d/projects/external/runwae-apparel/` — sibling to the `runwae` project.*

---

## Objective

Stand up a Runwae apparel line **without owning manufacturing, inventory, or shipping.** LB
holds the brand, the designs, and the storefront; everything physical is outsourced. The line
should be able to launch, take orders, and fulfill with near-zero operational overhead so it
does not compete for attention with the simulation/platform work.

## Hard constraints (from LB)

1. **No handling of manufacturing.** A manufacturer in Pakistan is already available for
   production runs.
2. **No handling of shipping/fulfillment.** Fulfillment must be handled by a third party.
3. Keep it lightweight — a Shopify page or a standalone site, not a warehouse operation.

## The core tension to resolve first

There are two fundamentally different operating models, and the Pakistan manufacturer only fits one of them cleanly:

- **Model A — Print-on-demand (POD).** No upfront inventory. A POD service prints + ships each
  item when it's ordered. Zero inventory risk. **But** this largely bypasses the Pakistan
  manufacturer — POD services use their own blanks and printers.
- **Model B — Bulk produce (Pakistan) → third-party fulfillment (3PL).** Manufacturer does a
  production run, ships bulk to a fulfillment warehouse, the 3PL pick-packs-ships each order.
  Uses the Pakistan relationship, better unit economics and quality control, **but** requires
  upfront cash for the run and carries inventory risk.

> **Decision needed:** Is the Pakistan manufacturer central to this (→ Model B), or is it just
> one option and speed-to-launch / zero-risk matters more (→ Model A)? A common answer is
> **hybrid**: launch a small hero capsule with the Pakistan run through a 3PL (Model B) for the
> pieces where quality/margin matter, and use POD for long-tail designs and pre-launch demand
> testing (Model A).

## Fulfillment options to evaluate (3PL — for Model B / hybrid)

These warehouse your bulk inventory and ship orders, integrating directly with Shopify:

- **ShipBob** — startup-friendly, strong Shopify integration, distributed US warehouses.
- **ShipMonk** — good for growing DTC brands, apparel-experienced.
- **Shippo / Easyship** — lighter-weight, more shipping-label aggregation than full 3PL;
  useful if fulfilling from a small setup.
- **Amazon MCF (Multi-Channel Fulfillment)** — use Amazon's warehouse network to fulfill
  your *own* store's orders; cheap, but Amazon branding on packaging unless configured.

Key questions to ask any 3PL: minimum monthly volume, receiving fees for the Pakistan
inbound shipment, per-pick + storage pricing, customs/import handling (the Pakistan run
lands as an international inbound), and Shopify sync latency.

## Fulfillment options to evaluate (POD — for Model A / long-tail)

- **Printful** — best-in-class Shopify integration, good quality, higher unit cost.
- **Printify** — cheaper, broader supplier network, more variable quality.
- **Gooten / SPOD** — alternatives worth a price/quality check.

## Storefront options

- **Shopify** (recommended default) — fastest path, native integrations with every 3PL and POD
  service above, handles payments/tax/checkout. ~$29–39/mo + txn fees. Least engineering.
- **Custom site** (Runwae already has a template — see `../runwae`, `buttsstudios/website/clients/runwae*`)
  — more brand control, but then payments (Stripe), inventory sync, and fulfillment API wiring
  become our problem. Only worth it if the existing Runwae site assets get us most of the way.
- **Recommendation:** Start on **Shopify** to validate demand and get fulfillment plumbing for
  free; port to / embed in a custom Runwae site later if the brand warrants it. The existing
  Runwae template can become the marketing/landing front with a "Shop" button into Shopify.

## Import / customs note (Model B specifics)

The Pakistan → US bulk shipment is an international import: duties, HTS classification for
apparel, and a customs broker or DDP (delivered-duty-paid) terms with the manufacturer. Confirm
whether the manufacturer ships DDP (they handle it) or the 3PL's receiving can act as importer
of record. This is the single most-overlooked cost/logistics item in Model B.

## Economics sketch (to fill in with real quotes)

| Line | POD (Model A) | Bulk + 3PL (Model B) |
|---|---|---|
| Upfront cash | ~$0 | production run + inbound freight + customs |
| Unit cost (blank + print) | high | low (best at volume) |
| Inventory risk | none | yes |
| Quality control | vendor's blanks | our manufacturer, our spec |
| Fulfillment cost/order | bundled | per-pick + storage |
| Speed to launch | days | weeks (run + ship + receive) |

## Positioning / brand (open)

- How does Runwae Apparel relate to the Runwae software project and to MDO3D? Same brand,
  sub-brand, or independent? (Affects storefront domain + visual identity.)
- Runwae brand assets already exist under `buttsstudios/` — reuse rather than redesign.
- Apparel is a **top-of-funnel / community** play, not a core revenue engine (see the broader
  engagement thesis: subscriptions pay the bills; merch builds affinity). Scope it accordingly —
  a capsule, not a catalog.

## Proposed next steps (nothing committed)

1. **Decide Model A vs B vs hybrid** (the tension above). Everything downstream depends on it.
2. Get a real production quote + DDP terms from the Pakistan manufacturer for one hero SKU.
3. Get pricing from 1 POD (Printful) and 1 3PL (ShipBob) to compare unit economics side by side.
4. Reserve the Shopify store + decide the domain/brand relationship to Runwae/MDO3D.
5. Design a small hero capsule (3–5 SKUs) rather than a full line.
6. Wire the existing Runwae template as the marketing front; "Shop" → Shopify.

---

*These are scoping notes, not decisions. Update as quotes come in.*
