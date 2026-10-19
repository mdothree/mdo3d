# Ads: GLB (a Butts Studios brand)

> **You are here:** `runwae-apparel/ads/glb/`, the ads home for GLB (a Butts Studios brand) · **Up:** the org entry doc, [`../../STATUS.md`](../../STATUS.md) ·
> **Down:** one file per campaign in this folder, named `YYYY-MM_<project>_<slug>.md` and copied from the template below
> Product images: `../../design/renders_2026-10-18/INDEX.md` (local only) and `../../storefront/brands/glb/assets/` · org: Butts Studios (`~/buttsstudios/ads/`).

**Rules for every campaign here:**
- **The spend check passes first.** Checkout is verified in Stripe test mode, the shown price equals the charged
  price, a promo code exists, and there is no broken CTA in the path. Policy:
  `~/latarence/coordination/conversion/AD_ALLOCATION.md` §1.
- **Nothing goes live without the Principal's per-batch OK.** That covers ads, posts and emails.
- **Honest claims.** No invented stats, reviews or scarcity. Paid-only: never "free". No prices ending in .99.
- **Measure at three levels:** Cloudflare edge, Google Analytics and the platform's own numbers. Report the rate of
  change too, not only the totals.

## Campaign template (copy it into a new file)

```markdown
# <Campaign name> · <project> · <YYYY-MM>

## Brief
- Goal (one line, measurable):
- Offer / landing URL (+ UTM):
- Promo code (variable name only, never the value):
- Flight: start → end (7-day flights by default)

## Audience
- Who:
- Where they are / interests / exclusions:

## Channel
- Platform(s) and placement (e.g. Meta feed, Reddit, Google Search):
- Ad account (name only, no credentials):

## Budget
- Total and per day:
- Spend-check status (AD_ALLOCATION §1): pass / fail, with the date checked:

## Creative
- Assets (paths):
- Copy (headline / body / CTA):
- Claims check: every claim is true today (yes/no)

## Metrics
- Primary KPI and target:
- Secondary: CTR, CPC, conversion rate, cost per acquisition
- Results, by level: edge / GA / platform. Include the rate of change, not only totals.

## Approval
- ✍️ Principal OK (batch id, date): ______
- Launched by / date: ______ · Stopped / date: ______
```
