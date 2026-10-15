<!--
DRAFT 2026-10-14 · dailyaitoll.com legal set (source: Latarence/dailyaitoll → web/privacy/index.html,
web/terms/index.html, web/refund-policy/index.html, web/cancellation/, web/data-license/, web/disclaimer/;
older markdown copies at ~/latarence/docs/policies/dailyaitoll/). The set is thorough and matches behaviour
(one-time Checkout Sessions, mode 'payment'; patron + data-license; consent tick stored on the Stripe record).
Not legal advice.
-->

# Daily AI Toll — legal page corrections

## 1. BLOCKER: the only contact address does not receive mail
Every DAT policy routes privacy requests, refunds, corrections and abuse reports to **data@dailyaitoll.com**.
On 2026-10-14 `dailyaitoll.com` has **no MX record** (and no SPF/TXT); its A records are Cloudflare proxies that do not accept SMTP. Mail to that address bounces, so the privacy-rights and refund contact in every policy is unreachable.
- **Fix (ops, not copy):** turn on Cloudflare Email Routing for dailyaitoll.com and forward `data@` to the monitored inbox (the other MDO domains already use route1–3.mx.cloudflare.net). DNS change = low-risk config, but it needs the Cloudflare account. [CONFIRM: forward-to inbox]
- **Until then:** change the contact on all seven pages to a working address [CONFIRM: e.g. hello@mdo3d.com].
- Verify with a test email after the change.

## 2. Name the operator
"Daily AI Toll operates the website" / "the operators of Daily AI Toll" names no person or company.
- Privacy §1 and Terms opening: "Daily AI Toll ("we") runs this site. Contact: data@dailyaitoll.com · [CONFIRM: mailing address]."
- Footer: add "© 2026 Daily AI Toll" (no copyright line today).
- Stripe: checkout shows the account's public business name [CONFIRM: same Stripe-name question as LayoffLeads].

## 3. Small additions
- Privacy, new §2.6: **Do Not Track.** "We use no analytics or advertising cookies, so there is nothing for a Do Not Track signal to change."
- Privacy §4 providers: name them: "Stripe, Vercel (hosting), Cloudflare (DNS/CDN), [CONFIRM: email provider]".
- Privacy §2.3: "Google Analytics is not turned on" (consent.js ships with an empty GA_ID).
- Terms §14 governing law: replace "the State of Delaware" with "[CONFIRM: governing-law state]".
- Refund policy: add the non-delivery case: "If your data download link does not work and we cannot fix it within 2 business days, we will refund you in full." (Today the policy has no non-delivery remedy at all, unlike LayoffLeads and Prompts for Business; a no-refund-even-if-undelivered stance is hard to defend.)
- Data accuracy (not a legal-page fix, but it is what the Disclaimer and Data License rely on): do the B2B audit's data-integrity pass before promoting paid CSVs.
