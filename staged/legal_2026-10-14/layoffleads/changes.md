<!--
DRAFT 2026-10-14 · layoffleads.com /privacy, /terms, /refunds (source: mdothree/layoffleads →
scripts/build.mjs, which generates the legal pages). Live pages (2026-10-13) are accurate to behaviour;
these are additions only. Not legal advice.
-->

# LayoffLeads — legal page additions

## Privacy (add)
**Who we are (new first section):**
> LayoffLeads ("we") runs this site. Contact: hello@layoffleads.com · [CONFIRM: mailing address].

**Purchases (append one sentence):**
> Stripe's checkout page and receipts show our account name [CONFIRM: currently "Latarence Butts"; once the Stripe public business name is changed, say "LayoffLeads"] and charges appear as LAYOFFLEADS.

**Where we store early sign-ups (append to "Earlier sign-ups"):**
> These addresses are kept in [CONFIRM: where the pre-launch sign-up list lives, e.g. our inbox / a Vercel KV store].

**When automated delivery ships (02_fulfilment.sh):** add "We use Resend to send your export and alert emails" to the provider list. Do not publish this line before that deploy.

**Your rights (replace "Your choices"):**
> Email hello@layoffleads.com to access, correct, export or delete the information we hold about you; we respond within 30 days. California residents have these rights under the CCPA/CPRA and EEA/UK residents under the GDPR/UK GDPR (legal bases: contract, legitimate interests, legal obligation); information is processed in the United States, and you may complain to your data protection authority. We do not sell or share personal information.

**New sections:**
> **Do Not Track.** We set no tracking cookies and use no analytics, so there is nothing for a Do Not Track signal to change.
> **Children.** LayoffLeads is a business tool and is not directed to anyone under 16.

## Terms (add)
- First paragraph: "These terms are an agreement between you and LayoffLeads ("we")."
- Eligibility: "You must be 18 or older, or the age of majority where you live, to buy Pro."
- Governing law: replace "the State of Delaware" with "[CONFIRM: governing-law state]", and add "Nothing here removes consumer protections that the law of your home state or country gives you."
- When 02_fulfilment ships: change "delivered by email within 1 business day" to the new delivery promise in the same deploy (the `sitecopy` step already does this on the product pages; keep the Terms in step).

## Refunds
No change needed. The non-delivery refund, legal-rights carve-out and statement descriptor are present.
