# MDO GO bundle: 2026-10-14

Prepared by the MDO fix lane from `~/latarence/coordination/audits/mdo_2026-10-14/PLAN.md`, `CONSUMER_AUDIT.md` and `B2B_AUDIT.md`.

**Status:**
- Nothing in this bundle has been deployed or pushed.
- No Stripe write API was called, and no secret value is in any file here.
- Each script runs only after the Principal's GO, by typing `GO` or setting the script's confirm variable.

## Read this first: stale laptop checkouts

Most local checkouts under `~/mdo3d/projects` are behind or diverged from the branches that are live:
- top-level `mdo3d` is 108 behind and 20 ahead
- the app repos are 16–40 behind
- runwae is 29 behind

So every change here sits on a branch cut from the live tip (origin), mostly in git worktrees in this folder (`wt-*`). **Deploy only from what these scripts name, never from `~/mdo3d/projects/*` directly.** The exception is Rigor: its 8 repos were rebased so that local `main` = origin/main + 1 commit.

Run order:
1. Run `01`–`05` in any order, with one exception: `02 sitecopy` runs only after live fulfilment is verified. The scripts don't touch the same files.
2. Run `check` first for each script; it is read-only.
3. Deploys build remotely on Vercel or GitHub Actions. Nothing builds on the laptop or on bigmini. `02 build` runs on bigmini2.

## Checklist

| # | Script | What it changes | Verification (automatic in the script) | Rollback | Needs before GO |
|---|---|---|---|---|---|
| 01 | `01_rigor.sh` (`check`, `tools`, `api`, `verify`) | **A `tools`:** fast-forward pushes and redeploys the rigor.design landing and the 7 tools from `main`, which is the gated build:<br>• `PRO_CHECKOUT_ENABLED` = false, so the CTA reads "Pro — coming soon"<br>• **no `buy.stripe.com` link**; live salary and networking still link Payment Link …804 today<br>• P1: privacy, terms, refunds and contact footer links (mdo3d.com pages)<br>• P1: dark-mode heading contrast fix on salary, networking, portfolio and linkedin<br>**B `api`:** deploys rigor-api (`q7/paid-path` @ `0d7459d`) to project `rigor` / api.rigor.design through `../rigor_fix/RIGOR_GO.sh api`, a new mode that touches the API only and leaves the tools gated. | **A:** each tool returns 200, has no `buy.stripe.com` in its HTML or JS, ships the gate default `false` and the footer links, and its `health.json` commit equals local `main`. The hub returns 200 with the legal links and no link; the mdo3d.com policy pages return 200.<br>**B:** `/health` 200 with `environment: production`; OPTIONS 204; anonymous `/api/analyze` 401 (the route exists); unsigned webhook 400. | **A:** `vercel promote <previous prod URL>`; the script logs it per tool. Rolling back salary or networking would re-expose …804, so prefer fixing forward.<br>**B:** promote the previous production deployment of `rigor`, which RIGOR_GO logs. | **A:** nothing; `VERCEL_TOKEN_MDO3` is present.<br>**B:** 7 env names missing on Vercel project `rigor`: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_IDS`. See `../rigor_fix/SECRETS_NEEDED.md`. B also needs a Stripe read key for its post-deploy "link active" GET. |
| 02 | `02_fulfilment.sh` (`check`, `prep`, `build`, `deploy`, `verify`, `sitecopy`, `live`, `rollback`) | First deploy of **stripe-hub** (Vercel project `mdo3d-stripe-hub`) with an in-process `fulfilment` service:<br>• trigger: `checkout.session.completed` with `payment_status=paid` on any of the 15 Payment Links (2 LayoffLeads Pro, 12 packs, 1 bundle)<br>• the customer gets an email with signed download links that expire after 7 days (full-history CSV or pack Markdown), and an internal sale alert goes out (Resend)<br>• signature verified, event re-fetched, idempotent three ways, **test mode only** unless `FULFIL_ALLOW_LIVE=1`<br>`sitecopy`, run only after live is verified, ships the honest "within a few minutes" delivery copy on both sites. | `check`: 10/10 node tests pass, and the env names are present.<br>`verify`: hub health 200, fulfilment listed, unsigned webhook 400, tampered token 403, then a manual test-mode purchase walk (4242 card → both emails arrive; a replay sends no second email). | `vercel rollback` on the hub, then disable the test webhook endpoint. Manual fulfilment stays the fallback. Revert the `sitecopy` commit with `git revert`. | `[mdo-fulfil-env]`: Resend key plus layoffleads.com and promptsforbusiness.com verified as sending domains, an MDO3 **test** restricted key, the test webhook secret, the alert inbox. Names: `STRIPE_WEBHOOK_SECRET_MDO3`, `STRIPE_SECRET_KEY_FULFIL`, `FULFIL_DOWNLOAD_SECRET`, `FULFIL_PUBLIC_URL`, `FULFIL_EMAIL_API_KEY`, `FULFIL_FROM_LAYOFFLEADS`, `FULFIL_FROM_PFB`, `FULFIL_ALERT_TO`, `FULFIL_LINK_MAP`. These are added to SETUP_TODO, operator_setup.json, the setup CSV/xlsx (row 101) and the dashboard. |
| 03 | `03_dailyaitoll.sh` | Daily AI Toll data integrity, on branch `data-integrity-2026-10-14` (`984bedf`):<br>• undisclosed counts become null instead of 5,000<br>• Oracle Sep 16 is merged into the Sep 14 round<br>• the "21,000 over 12 months" period total is flagged and excluded<br>• duplicate IDs are reassigned, including a third, `evt_20261006_002`<br>• 13 duplicate rows the collector skipped are excluded<br>• the collector root cause is fixed and a dedupe rule added<br>• the labor-hours figure is labelled "est. (jobs × 2,080 h/yr)"<br>The paid CSV is rebuilt. **Buyers get the bundled `web/api/_data/events.csv`**: live `/api/health` reports blob `not_used`. Headline: 290,574 → 263,974 jobs; 604.3M → ~549.1M hours. | Before push: unique IDs, headline = the CSV's counted sum, hours = jobs × 2,080, label present.<br>After the git deploy: `/api/health` shows the new commit, the live label and headline match, `/api/data-download` returns 400 without a session, the CSV isn't public. | `vercel rollback` to the commit saved in `.03_prev_live_commit`, or `git revert`. | Nothing beyond the GO. |
| 04 | `04_copy.sh` (`check`, `go A\|B\|C\|all`, `rollback`) | **A runwae.com:**<br>• the guide forms open the PDF ("Your guide is ready"), and subscribe says "You're on the list"; no "we sent you an email"<br>• the "college students" text and the `email.php` call are removed<br>• the empty "Brands Using Runwae" block and the broken FAQ sentence are fixed<br>**B mdo3d.com hub:**<br>• "31 live platforms", "2024 Founded" and 12 unbuilt rows are removed (the 11 named plus Career Compass)<br>• Rigor shows "Beta" and Ronna "Waitlist"; the Runwae description is fixed<br>**C Ronna (P1):** the account UI gets the `hidden` attribute while the tools are closed, and the stray `RS ">` favicon leak is fixed. `/pricing` → `/#waitlist` is already live (307). | Each page returns 200, the removed strings are absent, the new strings are present, and `/pricing` returns 307. | `rollback A\|B\|C` runs `vercel promote` to the URL recorded in `04_copy.prev`. | Nothing beyond the GO. **Follow-up:** 04 deploys by CLI and pushes only the branch. Merge `copy-honest-2026-10-14` into each production branch soon, or the next git deploy there undoes it. |
| 05 | `05_quickwins.sh` (`check`, `go P\|L\|D\|G\|N\|all`, `rollback`) | **P Prompts for Business:** "tested" is removed, and each of the 12 packs gets a real worked output, labelled as generated with Claude on 2026-10-14.<br>**L LayoffLeads:** a daily rebuild job (GitHub Action at 11:17 UTC, plus a bigmini2 cron fallback; use one). Florida is stale **upstream**: the Big Local News feed stops at Aug 13.<br>**D Divination:**<br>• a labelled example reading plus the price on oracle, tarot, dreams, numerology, runes, iching and astrology<br>• fengshui and pastlife: an inline email field replaces `window.prompt`, and the price shows before submit<br>**N** names.mdo3d.com in the guidance look (4px corners).<br>**G** guidance footer links Contact, Privacy, Terms and Refunds, and adds a Baby Names doorway.<br>**R** Rigor footer and contrast: verify only, since they ship with 01. | Curls each site for the example-reading markers, the price, no `window.prompt` in the served JS, the names styling, the guidance links, and no "tested prompt". For LL it checks the workflow is on `main` and `health.json` shows today. | `rollback <name>` promotes the previous deployment. It refuses without `ROLLBACK_OK=principal`, per the Principal's 2026-10-13 no-revert rule. | gh auth for the mdothree account, to push and set the LL workflow permission. fengshui, pastlife and names (Next.js) were **not compiled** on the laptop, so the Vercel remote build is the first compile. |

## Principal-only steps (tokens and admin UI)

1. **Stripe Payment Link …804 (Rigor Pro, `plink_1TEwCo…`): deactivate it in the Stripe dashboard** (Payment Links → the link → Deactivate) if you want it shut.
   - After `01 tools`, no page links to it, but the URL still takes money from anyone who has it, and nothing grants Pro.
   - This conflicts with your earlier Q7 answer ("fix it, not take it down"). The full Q7 paid path (`RIGOR_GO.sh go`, checkout on) still needs the 7 env names above.
   - So the choice is: deactivate now and re-enable when Q7 ships, or leave it live.
2. **Stripe public business name and statement descriptor** `[mdo-stripe-brand]`: the 15 LayoffLeads and Prompts for Business checkouts show "Latarence Butts". Change it in Stripe → Settings → Public details on the MDO3 account.
3. **jarvisbee.com:** it is a GoDaddy parked ad page. Log in to the registrar and turn off parking, then 301 the domain to names.mdo3d.com (or retire it). It is registered to 2027-01-19.
4. **leads.mdo3d.com** `[mdo-leads-deploy]`: GO for `~/mdo3d/projects/leads/ops/DEPLOY_FLEET.sh` (xps), plus:
   - O1: host env files (Stripe, Firebase and Sunbiz credentials)
   - O2: Cloudflare tunnel `mdo3d-leads-xps` and DNS (delete the two old CNAMEs)
   - O3: the live Stripe webhook `https://leadsapi.mdo3d.com/stripe-webhook`
   - O4: the Firebase authorized domain
5. **Keys for 01B and 02:** the rigor env names (`../rigor_fix/SECRETS_NEEDED.md`) and `[mdo-fulfil-env]`.
6. **02 live mode** is a separate GO. `bash 02_fulfilment.sh live` prints the steps: live webhook endpoint, live restricted key, `FULFIL_ALLOW_LIVE=1`.

## Open items found (not fixed here; taste or out of scope)

- **Runwae FAQ:** it still says "no fee to sign up" and "no platform fee to gigs", which reads as free. This waits on the revenue-model decision. The Runwae app's `sendEmail` (`notifications.js`, `gigHQ.js`) also posts to the undeployed `email.php`.
- **Daily AI Toll:**
  - British American Tobacco is scored 5,500 against a stated 9,000.
  - "Microsoft offers buyouts" (8,750) is counted as displaced jobs.
  - "contributing" rows count in full.
  - 4 excluded rows (WPP 1,000, Wonder 150, DNB 400, Freshworks 500) may be real and need a human look.
  - The collector has run on the OpenAI fallback since Sep 3.
- **Rigor:** since #94, a signed-in user with no plan gets 402 on the first call. With checkout closed, the tools can't be used even after 01B. That is the paid-model decision.
  - The `q7/paid-path` tool branches don't have the 2026-10-14 footer and contrast commit. Rebase them onto `main` before any `RIGOR_GO.sh go`.
- **The bundle promises "every pack we add later"**, and LayoffLeads promises weekly alerts. Neither is automated; the sale alert flags both for manual follow-up.
- **BlackLabb naming:** not touched, as instructed (pending Principal question). Upstream `9cc9758` had already changed the numerology footer and the dreams share text to MDO3D.
- **Redundant local commits to drop:** `3952e29` (promptsforbusiness local main) and `d42a087` (layoffleads local main) were made on stale mains. The `wt-p1-*` branches supersede them.
