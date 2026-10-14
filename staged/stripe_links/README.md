# Stripe Payment Link settings: LayoffLeads + Prompts for Business (R-mdo3d-4)

**STAGED, not run.** It writes to the LIVE MDO3 Stripe account, so it needs the Principal's GO. Nothing here has called Stripe.

## The GO, in order
1. **Dashboard step (Principal):** Stripe (MDO3 account `acct_1KQiak…`), Settings → Public details, set a
   **Terms of Service URL**. Suggested: `https://mdo3d.com/terms` (live, 200). Stripe needs this before any link can
   require ToS consent, and no API field exposes it.
2. Dry run (read-only: GETs only, saves the read-back, prints the diff):
   `LINKS_TOS_URL=<the URL from step 1> bash ~/mdo3d/staged/stripe_links/LINKS_GO.sh dry`
3. Apply (Principal OK):
   `LINKS_TOS_URL=<url> LINKS_GO_CONFIRM=GO bash ~/mdo3d/staged/stripe_links/LINKS_GO.sh apply`

The key comes from `~/latarence/secrets/sega_credentials.env` at run time. The script uses `$LINKS_STRIPE_KEY_VAR`,
else the first one set of `STRIPE_SECRET_KEY_MDO3`, `STRIPE_SECRET_KEY_MDO`, `MDO3_STRIPE_SECRET_KEY`,
`STRIPE_SECRET_KEY_LIVE`, `STRIPE_SECRET_KEY`. The key must be live, and `GET /v1/account` must return `acct_1KQiak*`.
Otherwise the script refuses. The key value is never printed, logged or put in argv: curl gets it through `-K -` on stdin.

## Links (15, from the repos' `site.config.json`, remote `main` 2026-10-13)
The script resolves each `buy.stripe.com` URL to its `plink_` id at run time with a read-only, paginated
`GET /v1/payment_links`. The repo configs hold only the URLs.

| Site | Links | After-payment redirect |
|---|---|---|
| LayoffLeads | Pro $49/mo `…aFa00icJqail9Osbg78k80M`, $490/yr `…cNi3cu6l2bmp8Kobg78k80N` | `https://layoffleads.com/thanks` |
| Prompts for Business | bundle `…bJe14mgZG7692m0gAr8k80L` + 12 packs | `https://promptsforbusiness.com/thanks?pack=<slug>` (bundle: `?pack=all-access`) |

The redirect choice follows the repos. LayoffLeads `build.mjs` (C7-021) says to set each Pro link's after-payment
redirect to `/thanks`, and PFB's `site.config.json` `checkout._comment` gives `/thanks?pack=<slug>`. Live check on
2026-10-13: `/thanks` and `/success` both return 200 with real thank-you pages on both sites. `/terms` and
`/privacy` are also 200 on both.

## Target per link
- `consent_collection.terms_of_service = required`
- `after_completion = {type: redirect, redirect.url: <above>}`
- `custom_text.submit.message`: the site's name and billing email, so the per-site business name shows on Checkout.
- `custom_text.terms_of_service_acceptance.message`: the consent line links to **that site's own** `/terms` and
  `/privacy`, not the single account-level URL.
- Any existing `custom_text.shipping_address` / `after_submit` text is sent back unchanged.

**Business name:** a Payment Link has no business-name field. The name at the top of Checkout is the account's
public business name (`business_profile.name`), one value shared by every MDO3 product. The script **reads and
reports it and never changes it**. Changing it would rename Checkout for every MDO3 product, which is a Principal
decision and a dashboard step. The per-site name is delivered through the submit text.

## Safety
- It never sends `active`, so it never pauses or deactivates a link. An inactive link is flagged and left inactive.
- It never touches prices, products or account settings.
- It skips a link that's already at the target, so a re-run is a no-op.
- **There is no automatic rollback.** On a write error or a verify mismatch it STOPs (exit 2). It lists what was
  written before the stop and points to `out/readback_<ts>.json`, the before-state for each link (`active`,
  `consent_collection`, `after_completion`, `custom_text` + the account name). That file is **information only** for
  a human-decided restore.
- Stripe itself is the final ToS gate. If the dashboard URL isn't set, the first write is rejected and the run stops
  before anything else changes.
- Log: `LINKS_GO.log` (no secrets).

## Tests
`bash test/run_tests.sh` runs the script against `test/stub_curl.py`, a fake curl with no network, using a fake env
file and a fake key. It covered dry, the confirm gate, the ToS gate, apply, re-run as a no-op, a wrong account, a test key,
a Stripe write error mid-run (stop, no rollback), a verify mismatch, a missing link, pagination, an inactive link,
custom_text being kept, and no key leaking to argv, the log or the output. **27/27 pass on bigmini2** (bash 3.2,
/usr/bin/python3, 2026-10-13).
