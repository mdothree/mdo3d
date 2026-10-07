# Payment gates on small, no-account web apps / micro-SaaS (cross-cutting, 2025–2026)

Context: solo operator, ~28 small sites. Divination readings $2.99–$9.99 one-time; utilities $4–4.99/mo; AI career tools $9.99/mo. Stripe Checkout / Payment Links, often no user accounts, Claude API cost per paid request. Research date: 2026-10-06.

## 1. Paywall placement and pricing mechanics

### Takeaway
The best public benchmark data (RevenueCat, mobile-centric) shows hard/early paywalls convert about 5x better than freemium and earn far more revenue per install, but they bring more refunds and faster churn. For low-frequency, one-off needs like a reading, the evidence points to "show real value first, then gate the full result", sold as one-time unlocks or credit packs. Subscriptions fit only the tools people come back to.

### Cited Findings
- RevenueCat State of Subscription Apps **2026**: median download-to-paid conversion is **10.7% for hard paywall apps vs 2.1% for freemium**. The top 10% of hard-paywall apps reach 38.7%. Revenue per install at Day 14 is $2.32 (hard) vs $0.27 (freemium), and at Day 60 $3.09 vs $0.38 — [SaaStr summary of RevenueCat 2026](https://www.saastr.com/the-top-10-learnings-from-revenuecats-state-of-subscription-apps/)
- RevenueCat **2025** report (as summarized): hard paywall apps convert at **12.1%, about 5.5x the average**, but **hard-gated apps have refund rates 70% higher than freemium** — [Subscription Insider](https://subscriptioninsider.com/article-type/news/revenuecats-state-of-subscription-apps-2025-report-ais-dominance-retention-challenges-and-the-shift-away-from-pure-subscriptions); [Airbridge](https://www.airbridge.io/en/blog/hard-paywall-vs-freemium-2026)
- Timing: **80% of trial starts happen on day one**, and 55% of 3-day-trial cancellations happen on Day 0. The intent window is the first session — [Subscription Insider (RevenueCat 2025)](https://subscriptioninsider.com/article-type/news/revenuecats-state-of-subscription-apps-2025-report-ais-dominance-retention-challenges-and-the-shift-away-from-pure-subscriptions)
- Trial length (2026 report): 17–32-day trials convert at 42.5% vs 25.5% for trials of 4 days or less. Day-0 cancellation is 55% for 3-day trials, 39.8% for 7-day and 31% for 30-day — [SaaStr/RevenueCat 2026](https://www.saastr.com/the-top-10-learnings-from-revenuecats-state-of-subscription-apps/)
- Price level: high-priced apps earn **$62.19 annual LTV per payer vs $10.69** for low-priced apps. Higher-priced apps also convert downloads to trials at 8.9% vs 4.4%, so cheap pricing did not buy more conversion. The median annual price is $34.80 (up from $31.60) — [SaaStr/RevenueCat 2026](https://www.saastr.com/the-top-10-learnings-from-revenuecats-state-of-subscription-apps/)
- AI apps earn **41% more revenue per payer but churn 30% faster** than non-AI apps — [SaaStr/RevenueCat 2026](https://www.saastr.com/the-top-10-learnings-from-revenuecats-state-of-subscription-apps/)
- 30% of annual subscribers cancel within the first month — [Subscription Insider (RevenueCat 2025)](https://subscriptioninsider.com/article-type/news/revenuecats-state-of-subscription-apps-2025-report-ais-dominance-retention-challenges-and-the-shift-away-from-pure-subscriptions)
- The 2025 report is framed around a "shift away from pure subscriptions" toward hybrid models (subscriptions plus consumables or one-time purchases) — [Subscription Insider headline](https://subscriptioninsider.com/article-type/news/revenuecats-state-of-subscription-apps-2025-report-ais-dominance-retention-challenges-and-the-shift-away-from-pure-subscriptions)
- Market reality: only **17.3% of newly launched apps reach $1K MRR within two years, and 4.6% reach $10K MRR**. Apps launched in 2025 or later hold 3% of subscription revenue — [SaaStr/RevenueCat 2026](https://www.saastr.com/the-top-10-learnings-from-revenuecats-state-of-subscription-apps/)

### Inferences
- RevenueCat data is mobile in-app subscriptions, and the "conversion" denominator is installs. A web visitor who lands from search has lower intent than someone who installed an app, so expect web paywall conversion to be well below 10%. Use these as directional ratios, not targets.
- For divination ($2.99–$9.99, low repeat frequency), use a soft gate:
  - Generate a real partial result first, such as the first card or section, or a summary with the detailed interpretation blurred.
  - Then gate the full reading.
  - Do not gate before any value is shown, since hard gates bring 70% more refunds and more disputes, and a $15 dispute fee wipes out about 5 sales at $2.99.
- Low prices do not obviously convert better (RevenueCat price data). Test $4.99–$6.99 as the anchor price for a single reading, plus a "3-pack" credit bundle, rather than defaulting to $2.99.
- Utilities at $4–4.99/mo: a free tier with usage limits plus a monthly plan is reasonable. Consider an annual or lifetime option, because low-priced apps have tiny LTV ($10.69/yr median).
- AI career tools at $9.99/mo: AI apps churn faster. Credit packs or "pay per document" may match episodic job-search use better than an open-ended subscription.

### Gaps
- No primary-source web-specific (non-app) conversion benchmarks were found for blurred or partial-result paywalls. Adapty, ProfitWell/Paddle and RevenueCat's own report pages were not fetched directly; the figures come via SaaStr, Subscription Insider and Airbridge summaries.
- No reliable data was found on weekly vs annual plans for web micro-SaaS. No public A/B data was found on credit packs vs one-time unlocks for low-frequency use.

## 2. No-account payment patterns (Stripe Checkout / Payment Links)

### Takeaway
Stripe's own docs say webhooks are required for fulfillment. The success page may also trigger fulfillment, but only by retrieving the Checkout Session server-side and checking `payment_status`. The fulfillment function must be idempotent per session ID. Payment Links can carry a `client_reference_id`, which appears in the `checkout.session.completed` webhook. That is how a no-account app ties a payment to a stored request or reading.

### Cited Findings
- "You can't rely on triggering fulfillment only from your checkout landing page, because it's not guaranteed customers visit that page." Webhooks are mandatory for subscriptions and delayed payment methods — [Stripe: Fulfill orders](https://docs.stripe.com/checkout/fulfillment.md?payment-ui=stripe-hosted)
- The fulfillment function must:
  1. "Correctly handle being called multiple times with the same Checkout Session ID"
  2. Retrieve the session from the API with `line_items` expanded
  3. Check `payment_status`
  4. Fulfill
  5. Record fulfillment status

  It "might be called multiple times, possibly concurrently" — [Stripe: Fulfill orders](https://docs.stripe.com/checkout/fulfillment.md?payment-ui=stripe-hosted)
- The success URL should include the `{CHECKOUT_SESSION_ID}` placeholder. The server extracts the ID, runs fulfillment, then renders. Checkout waits up to 10 seconds for the webhook response before redirecting. This does not apply to endpoints registered in organization accounts — [Stripe: Fulfill orders](https://docs.stripe.com/checkout/fulfillment.md?payment-ui=stripe-hosted)
- Payment Links: set `after_completion.redirect.url` with `{CHECKOUT_SESSION_ID}`. In the Dashboard, choose "Don't show confirmation page" and enter that URL — [Stripe: Fulfill orders](https://docs.stripe.com/checkout/fulfillment.md?payment-ui=stripe-hosted)
- Verify the webhook signature with the `whsec_` secret and handle `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Optionally handle `async_payment_failed` as well — [Stripe: Fulfill orders](https://docs.stripe.com/checkout/fulfillment.md?payment-ui=stripe-hosted)
- `client_reference_id` on Payment Links:
  - Allows alphanumeric characters, dashes and underscores, up to 200 characters.
  - "Invalid values are silently dropped, but your payment page continues to work."
  - It is sent in `checkout.session.completed`.
  - Do not put secrets in it, because links "might show up in unexpected places".

  [Stripe: Payment Link URL parameters](https://docs.stripe.com/payment-links/url-parameters)
- Bank debits and vouchers can take 2–14 days to confirm, so listen for the extra webhooks if those are enabled — [Stripe: Payment Link URL parameters](https://docs.stripe.com/payment-links/url-parameters)

### Inferences (implementation pattern for the MDO3D sites)
1. Before redirecting, save the user's input (question, birth data, resume text) server-side under a random request ID, such as a UUID. Use dashes, not `+` or `/`, so the ID is not silently dropped. Then either:
   - (a) create a Checkout Session server-side with `client_reference_id=<requestId>` and `metadata`, or
   - (b) append `?client_reference_id=<requestId>` to the Payment Link.

   Option (a) is stronger because the server fixes the price and line item. A Payment Link URL can be shared or reused.
2. On the webhook or the success page, retrieve the session and check all of the following:
   - `payment_status == 'paid'`
   - the line item's price ID matches the product the request belongs to (stops a $2.99 session from unlocking a $9.99 product)
   - `client_reference_id` matches a stored, unfulfilled request

   Then mark the request fulfilled in a transaction keyed on `session.id`. That gives idempotency and blocks replay.
3. Never treat "landed on success_url" or a `?paid=true` query flag as an entitlement. Never let the client decide which result to unlock. Common bugs to avoid:
   - trusting the success URL without verifying the session
   - using a Payment Link without `client_reference_id`, which leaves orphan payments the app cannot match
   - not deduplicating concurrent webhook and success-page calls, which can produce double Claude generations and double cost
4. Delivery without accounts: Checkout collects the email, which is available on the session as customer_details. After fulfillment, email a magic link to `/r/<requestId>?t=<signed token>` so the buyer can come back. This also covers the "paid then lost connection" case Stripe warns about.
5. Generate the expensive AI output only after payment is verified, or cache the free partial and generate the remainder after payment. That way unpaid abandoners cost only the preview.

### Gaps
- `customer_details.email` behavior and magic-link best practices were not verified against a primary doc in this pass; they come from general Stripe knowledge.
- No public writeups of specific indie paywall-bypass incidents were found.

## 3. Unit economics with LLM costs; abuse protection; fees

### Takeaway
At $2.99, Stripe's fixed 30¢ takes about 13% of revenue, and a merchant of record (Paddle or Lemon Squeezy at 5% + 50¢) would take about 22%. Bundling (credit packs, or a higher price per unlock) is the main lever. Free AI endpoints need server-verified Turnstile plus rate limits, because each free generation is a real Claude API cost.

### Cited Findings
- Stripe US standard pricing:
  - "2.9% + 30¢ per successful transaction"
  - +1.5% for international cards and +1% for currency conversion
  - $15 per dispute received, plus $15 to counter (refunded if won)

  [Stripe pricing](https://stripe.com/pricing)
- Paddle: "5% + 50¢ per Checkout transaction". For "product with under 10$ value you can contact us for bespoke pricing" — [Paddle pricing](https://www.paddle.com/pricing)
- Lemon Squeezy: 5% + 50¢, plus 1.5% on international transactions per one comparison. Its technology is being folded into Stripe's "Managed Payments" (merchant-of-record style tax handling in 80+ countries), which charges **3.5% on top of standard Stripe processing** — [Dodo Payments comparison](https://dodopayments.com/blogs/paddle-vs-lemon-squeezy/); [Rework](https://resources.rework.com/tools/billing-revenue/paddle-vs-lemon-squeezy). These are secondary vendor blogs; verify on Stripe's page before relying on them.
- Cloudflare Turnstile:
  - "You must call the Siteverify API to complete your Turnstile implementation". Client-side-only checks give no protection.
  - Tokens are valid for 300 seconds and single-use; a replay returns `timeout-or-duplicate`.
  - Endpoint: `POST https://challenges.cloudflare.com/turnstile/v0/siteverify`

  [Cloudflare Turnstile docs](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- Stripe recommends being set up to prevent and mitigate card testing — [Stripe account checklist](https://docs.stripe.com/get-started/account/checklist). Cheap no-account checkouts are classic card-testing targets.

### Fee math (computed from the cited rates; domestic US card)
| Price | Stripe fee (2.9%+30¢) | % of price | MoR fee (5%+50¢) | % of price |
|---|---|---|---|---|
| $2.99 | $0.39 | 12.9% | $0.65 | 21.7% |
| $4.99 | $0.45 | 8.9% | $0.75 | 15.0% |
| $9.99 | $0.59 | 5.9% | $1.00 | 10.0% |
| $14.99 (e.g. 5-reading pack) | $0.73 | 4.9% | $1.25 | 8.3% |

Add 1.5% for international cards on Stripe. One $15 dispute equals the gross of about 5 readings at $2.99.

### Inferences
- Margin per $2.99 reading is roughly $2.60 after Stripe fees, minus the Claude cost of the free preview plus the paid generation, minus the expected refund and dispute rate. A typical reading is a few thousand tokens, so model cost per reading is likely cents. For a solo operator the bigger margin risks are fees, disputes and abuse of free endpoints. **Flag: this is an estimate.** Use the `claude-api` pricing reference or the Anthropic pricing page for exact per-token rates; they were not verified here.
- Mitigations:
  - Credit packs, e.g. 3 readings for $7.99, to amortize the 30¢.
  - A minimum price around $4.99.
  - A cheaper model for free previews and the stronger model only after payment.
  - A per-IP and per-fingerprint daily cap on free generations.
  - Turnstile on the free-generation endpoint, verified server-side, with each token used once.
  - A max-tokens cap per request.
  - Caching or deduplicating identical inputs.
- Merchant of record vs Stripe:
  - A merchant of record (Paddle, Lemon Squeezy, Stripe Managed Payments) takes on global VAT/GST liability and filing.
  - At under-$10 prices it costs roughly 9–13 points more of revenue than plain Stripe. Paddle explicitly invites a custom quote for products under $10.
  - For a US-based seller with mostly US buyers, plain Stripe (optionally with Stripe Tax) is probably cheaper. A merchant of record becomes attractive if EU/UK sales grow and filing becomes a burden.

### Gaps
- Exact current Stripe Billing (subscriptions) and Stripe Tax percentages were not re-verified this pass. Commonly cited as about 0.7% Billing and 0.5% Tax per transaction; check stripe.com/billing/pricing and stripe.com/tax/pricing.
- No authoritative data was found on card-testing rates for low-price no-account checkouts.

## 4. Legal and trust must-haves

### Takeaway
Minimum set for each paying site:
- a clear description of what is sold, with price in an explicit currency
- an email or other direct contact (not only a form)
- refund policy, plus cancellation policy for subscriptions
- privacy policy and terms
- the statement descriptor disclosed on the site
- truthful reviews and stats

The FTC click-to-cancel rule was vacated in July 2025. The FTC restarted rulemaking with an ANPRM in March 2026. State auto-renewal laws, notably California's amended ARL in force since July 1, 2025, apply now. The FTC fake-review rule has been in force since October 21, 2024, with civil penalties.

### Cited Findings
- Stripe website checklist items:
  - a description of what you sell, with a warning that "If we review your website and find that it isn't clear what you're selling, we may contact you"
  - the purchase currency shown explicitly
  - **customer service contact info**, ideally multiple direct channels, "something besides contact forms"
  - fulfillment policies including a **refund policy** and a **cancellation policy** for subscriptions
  - a privacy policy
  - a business address, if you have one
  - promotion and trial terms
  - HTTPS and security
  - accepted card logos

  Stripe Shop Terms are available under CC BY 4.0 as a starting template — [Stripe website checklist](https://docs.stripe.com/get-started/checklist/website)
- Statement descriptor: 5–22 characters. Stripe recommends text on your site telling users what they will see on their statement, to reduce confusion disputes — [Stripe account checklist](https://docs.stripe.com/get-started/account/checklist)
- Divination on Stripe: the Restricted Businesses list (updated 2026-09-22 per fetch) lists "Psychic services and fortune tellers" as **prohibited in Japan, Mexico and Thailand**. It is not listed as restricted for the US, and astrology and tarot are not named — [Stripe restricted businesses](https://stripe.com/legal/restricted-businesses). A secondary report says Stripe removed "psychic services" from its general restricted list — [The Tech Outlook](https://www.thetechoutlook.com/current-affairs/business/elon-musk-tweeted-they-saw-it-coming-replying-to-stripes-decision-of-unrestricting-psychic-services/). The country-specific prohibitions remain.
- FTC click-to-cancel (Negative Option Rule):
  - Vacated by the 8th Circuit on **July 8, 2025**, days before its July 14 effective date, on procedural grounds: no preliminary regulatory analysis was published despite the rule's more than $100M in costs — [Morgan Lewis](https://www.morganlewis.com/pubs/2025/07/ftcs-click-to-cancel-rule-vacated-ahead-of-planned-july-14-effective-date); [Sidley](https://www.sidley.com/zh-hans/insights/newsupdates/2025/07/us-ftc-click-to-cancel-rule-struck-down)
  - **March 11, 2026: the FTC issued an ANPRM restarting negative-option rulemaking**, with no draft text. It asks about disclosures, express informed consent, click-to-cancel and B2B scope — [Perkins Coie](https://perkinscoie.com/insights/blog/ftc-kicks-new-negative-options-rulemaking); [Subscription Insider](https://www.subscriptioninsider.com/article-type/news/ftc-restarts-negative-option-rulemaking-after-click-to-cancel-vacatur-signaling-subscription-rules-are-back-in-play)
  - The FTC still enforces against subscription "dark patterns" under existing law (ROSCA, FTC Act Section 5). Commentary flags this, but no specific statute text was fetched here.
- California ARL (AB 2863), effective **July 1, 2025**:
  - express affirmative consent to renewal terms, with proof of consent kept 3 years (or 1 year after termination, if longer)
  - annual reminders
  - clear notice of price changes
  - "click to cancel" through the same medium used to sign up

  It applies to contracts entered, amended or extended on or after July 1, 2025 — [DWT](https://dwt.com/insights/2024/10/ab-2863-updates-california-automatic-renewal-law); [Kilpatrick Townsend](https://ktslaw.com/en/insights/alert/2024/10/california-latest-automatic-renewal-law-amendments-take-effect-in-july-2025)
- FTC fake reviews and testimonials rule:
  - Final rule issued Aug 14, 2024 and **effective Oct 21, 2024**.
  - It bans fake reviews and testimonials, including **AI-generated** ones and ones from people without real experience. It also bans sentiment-conditioned incentives, undisclosed insider reviews, and fake social-influence metrics.
  - Civil penalties of up to about $52K per violation (inflation-adjusted).

  [FTC press release](https://www.ftc.gov/news-events/news/press-releases/2024/08/federal-trade-commission-announces-final-rule-banning-fake-reviews-testimonials); [DWT](https://dwt.com/insights/2024/08/ftc-finalizes-rule-banning-fake-consumer-reviews)
- EU VAT: non-EU businesses selling B2C digital services to EU consumers owe VAT at the customer's country rate (e.g. DE 19%, FR 20%). They can register for **non-Union OSS** in one member state and file one quarterly return — [Avalara VATlive](https://www.avalara.com/vatlive/en/eu-vat-rules/eu-vat-digital-services-moss.html); [Taxually](https://support.taxually.com/support/solutions/articles/80001155457)

### Inferences
- For the MDO3D sites:
  - **Remove any invented testimonials, user counts or "X readings delivered" stats** unless they are real and measured. This is the highest legal risk on the list, given civil penalties per violation and the explicit ban on AI-generated reviews.
  - Add an entertainment disclaimer to divination pages ("for entertainment/reflection; not medical, legal or financial advice"). Add an AI-generated content disclosure on AI readings and career tools; this is good practice, and some state and EU AI-transparency rules point the same way.
  - Add a simple refund policy, e.g. "if the reading fails to generate, or within X days on request". A generous refund costs far less than a $15 dispute.
- Subscriptions ($4.99 and $9.99/mo), even with the federal rule vacated:
  - Follow California's ARL nationally.
  - Show the renewal terms beside the pay button, and use Stripe's Checkout consent and terms display.
  - Send a receipt that includes the cancellation method.
  - Provide self-serve online cancellation through the Stripe Customer Portal, reachable by an emailed link so it works without an account.
  - Send annual reminders.
- Since divination is prohibited on Stripe in JP, MX and TH, consider blocking or not marketing to those countries, or check how Stripe treats buyers in those countries (the list likely targets merchants located there). This is an inference; confirm with Stripe.
- EU VAT: the one-sale-triggers-obligation rule for non-EU sellers (no €10K threshold) is commonly stated but was not verified against an EU primary source here. Many US indies ignore it at small scale, which is a compliance risk. Stripe Tax or a merchant of record solves it.

### Gaps
- The UK digital-services VAT position for non-UK sellers (generally no threshold) was not verified this pass.
- No authoritative source was found for state laws specifically requiring entertainment disclaimers for psychic services. Some local ordinances historically regulated fortune-telling (e.g. a 2007 Philadelphia item), but this was not researched in depth.
- The FTC has not proposed rule text since the ANPRM, as of what was found. Whether a 2026 NPRM was issued later was not verified.

## 5. Indie case studies (portfolios of many small sites)

### Takeaway
The famous multi-product indies ship many small products, but revenue concentrates in a few winners. They then double down on those winners while keeping a personal brand and audience as the shared distribution channel, rather than splitting attention evenly across dozens of sites.

### Cited Findings
- Pieter Levels (levelsio): describes about a 95% failure rate across dozens of ventures. Revenue is concentrated in Photo AI (about $100K–150K/mo at various points; a record of about $150K/mo in Sept 2025), RemoteOK (about $44K/mo), InteriorAI (about $35K/mo) and others. Photo AI launched Feb 2023 — [ppc.land](https://ppc.land/how-one-photo-ai-app-generates-132k-monthly-after-70-failed-startups/); [Indie Hackers case study](https://www.indiehackers.com/post/photo-ai-by-pieter-levels-complete-deep-dive-case-study-0-to-132k-mrr-in-18-months-3a9a2b1579). Figures come from secondary aggregators citing his public dashboards and posts; they fluctuate, so treat them as approximate.
- His game project ("flight simulator built in three hours") reportedly hit a $1M/yr run rate in 17 days and then "went to zero". Novelty spikes are fragile — [DEV Community](https://dev.to/promptway/he-built-a-flight-simulator-in-three-hours-and-hit-1m-a-year-in-17-days-then-it-went-to-zero-1b1l). Secondary source; the headline claim is unverified.
- Marc Lou: about 30 failed products before success. ShipFast (a boilerplate) became the main earner. Reported about $1.03M over 12 months, about 20% lower than the prior year by choice, to cut workload and concentration. He diversified into adjacent products (CodeFast, DataFast, TrustMRR) sold to the same audience, plus an affiliate program — [yespress.io profile](https://yespress.io/marc-lou.md); [Indie Hackers on ShipFast marketing](https://www.indiehackers.com/post/marc-louvion-s-unconventional-approach-to-marketing-that-grew-ship-fast-to-43k-monthly-revenue-in-2-months-6163fb113f). Secondary.
- Market base rate: only 17.3% of new subscription apps reach $1K MRR within two years — [SaaStr/RevenueCat 2026](https://www.saastr.com/the-top-10-learnings-from-revenuecats-state-of-subscription-apps/)

### Inferences
- With 28 sites, expect a power law: probably 2–4 sites will produce most revenue. Instrument each site's visit → preview → checkout → paid funnel, then put effort, SEO and pricing tests into the top performers, and leave the long tail on autopilot or sunset it.
- A shared brand or audience, like levelsio's and Marc Lou's personal X/Twitter followings, is the common distribution engine. Cross-link related sites, e.g. all divination tools under one umbrella with a shared footer and "try another reading" links. A shared checkout and credit wallet across sister sites could also amortize Stripe's 30¢.
- Adjacent products sold to the same audience (Marc Lou) beat unrelated one-offs.

### Gaps
- Not covered due to tool-call limits:
  - Tony Dinh (TypingMind, DevUtils) and Danny Postma (HeadshotPro) — no sources gathered
  - Product Hunt and Reddit launch outcome data
  - programmatic SEO case data

  These should be researched separately if needed.
- No primary founder posts were fetched; all case-study numbers come from secondary aggregators.
