# Runwae Apparel: ads plan for the first drop (STAGED, no spend)

*Principal, #82-b, 2026-10-12 (verbatim): "Yes we can drop this and run adas agianst it." Applies the 14:02 ad policy:
Runwae Apparel is a commerce line, so ads are allowed, **each gated by the spend check**
(`~/latarence/coordination/conversion/AD_ALLOCATION.md` §1). Nothing has been created, posted or charged.*

## Drops
Both, concurrently (the Principal's call): **Fall '21 re-release** and **The Little Things**.
- Printed tees (both lines) go on **Printful** as soon as the key exists.
- Hoodies + sweatpants go on **pre-order** (2–3 wk window) after the supplier sample run.

## Spend check: what has to pass before $1 is spent
| Gate (AD_ALLOCATION §1) | Runwae Apparel today |
|---|---|
| Checkout verified in Stripe **test mode** | ❌ No Stripe account/keys yet (setup group 4) |
| Shown price = charged price | ✅ by construction (server-side catalog price; tested), but ❌ no prices set |
| A promo code exists | ❌ Proposed: `INFLUENCE15` (15% off, first drop only), created in test mode first |
| No broken CTA in the path (`money_probe.py`) | ❌ No public URL yet (runwaeapparel.com TLS is down; the new store isn't deployed) |

**Until all four pass, the budget rolls into the reserve and isn't spent.**

## Budget (proposal, for the Conversion lane's allocation table)
One project unit = **$20/mo** (the MDO-line rate), run as **one 7-day flight per drop window** (~$3/day).
Two drops → two flights, staggered so each pre-order window gets its own week. Proposed row:
`Runwae Apparel | $20/mo | 1 flight/mo | gate: spend check (above) | owner: RUNWAE lane`. The Conversion lane owns
`AD_ALLOCATION.md`, so the row is handed to them, not edited here.

## Creative (ready now, $0)
- Gallery look (Fall '21) and Sketchbook look (TLT), 4:5, from `storefront/brands/runwae/photos/`. 1:1 and 9:16
  crops follow once the look is chosen.
- **Copy rules:** name the brand in full ("Runwae Apparel"). Pre-order ads state **"ships by [date]"**. No "free",
  no fake scarcity, no invented stats. Draft lines:
  - Fall '21: *"Everybody Influences. The Fall '21 line, back for one pre-order window. Runwae Apparel."*
  - TLT: *"In life, it's all about the little things. Hand-drawn, printed on black. Runwae Apparel."*

## Channels
Meta (IG feed + Reels) first: apparel is visual and 4:5 is native. Pinterest second (the old Runwae Apparel account,
if it's still live). Organic posting through the lab's LinkedIn/Chrome flow doesn't fit apparel, so it's skipped.
Every post and every campaign needs the Principal's per-batch OK.
