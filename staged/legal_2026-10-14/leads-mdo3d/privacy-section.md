<!--
DRAFT 2026-10-14 · leads.mdo3d.com (DOWN: Cloudflare 1033/530; staged redeploy ops/DEPLOY_FLEET.sh awaits GO).
Its footer links https://mdo3d.com/privacy.html and /terms.html (both 200 → shared pages), which say nothing
about this product. Add this section to the shared MDO privacy policy (as 4.6) BEFORE the product reopens.
Not legal advice; this one especially needs counsel, because the product sells records about other people.
-->

# 4.6 MDO3D Leads (leads.mdo3d.com) — business filing data

**What the product is.** A searchable list of newly registered businesses in [CONFIRM: Florida, Colorado, Connecticut], built from public state business-filing records (for Florida, the Division of Corporations "Sunbiz" data).

**Information about people in the records.** Filings can include the names of registered agents, officers or owners and a business address, which for small businesses may be a home address. Where we find a business website, we may add a business email address and a confidence score; we check that the address's mail server exists [CONFIRM: describe the email-finding method accurately — `src/validate_email.py` does MX and SMTP checks]. We do not guess personal email addresses.

**Why.** To let subscribers find and contact newly formed businesses for business-to-business purposes. Customers must follow the CAN-SPAM Act and other marketing laws (see the Terms).

**Your choices if you are in the data.** Email hello@mdo3d.com with the business name or filing number to have the email address or the whole record removed from our product; we act within 30 days and keep a suppression note so it is not re-added. You can also ask what we hold about you.

**Customers' data.** Account (Firebase Authentication email), saved searches, plan and payment records (Stripe). Weekly saved-search emails are sent only if you turn them on.

**[CONFIRM before launch, with counsel]**
- Whether selling these records makes the operator a "data broker" under California (Delete Act / registration with the CPPA), Vermont, Texas or Oregon law. Florida/Colorado/Connecticut filings can include residents of any state.
- Whether to drop the individual registered-agent name from exports, or keep business-only fields.
- Terms additions for customers: lawful use only, no consumer (non-business) marketing, honour opt-outs, no resale.
