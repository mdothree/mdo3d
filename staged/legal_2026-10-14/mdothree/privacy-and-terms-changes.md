<!--
DRAFT 2026-10-14 · mdothree.com/privacy and /terms (source: mdothree/mdo3d monorepo →
projects/mdothree/landing/public/privacy.html, terms.html). Linked from all 9 tool subdomains.
The live mdothree pages are largely accurate. Below are full replacement sections only where something
is missing or inaccurate; keep every other section as live. Not legal advice.
Option: instead of a separate policy, point mdothree.com/privacy at the shared MDO policy and add
section "4.7 mdothree utilities" (text in block A below) — recommended if the 3-property consolidation goes ahead.
-->

# mdothree.com — privacy and terms corrections

## A. Privacy Policy

**Opening paragraph (replace):**
> This Privacy Policy explains how mdothree ("we") handles information on mdothree.com and its tool sites (pdf., image., json., qr., text., color., hash., password., timestamp.mdothree.com). Contact: hello@mdothree.com · [CONFIRM: mailing address].

**Section 1 "Tool input" (replace):**
> **Tool input.** Every tool runs in your browser. The colors, text, passwords, hashes, JSON, images and PDFs you work with are processed on your device and are not sent to our servers. Two things do leave your browser:
> - **Password breach check** (password.mdothree.com/breach): your browser computes a SHA-1 hash of the password and sends only the **first 5 characters of that hash** to the Have I Been Pwned "Pwned Passwords" service (api.pwnedpasswords.com, run by Have I Been Pwned with Cloudflare). The password itself, and the full hash, never leave your device. The service receives your IP address under its own terms.
> - **Code libraries** (for example the PDF and image libraries) are downloaded from the jsDelivr CDN, which receives your IP address and browser details when it serves them.

**Section 1 "Account data" (replace):**
> **Account data.** mdothree Pro is not on sale yet, so we do not create accounts today. When Pro opens, signing in will use Firebase Authentication (email and sign-in identifiers). [CONFIRM: delete "not on sale yet" when Pro opens.]

**New: anonymous usage counts (add after "Usage data"):**
> **Anonymous usage counts.** [CONFIRM: only if the mdothree-api `/trackEvent` function is deployed and called by any live tool — the 2026-10-14 sweep found no live call.] We may count which tools are used (for example "pdf_processed") in our Firebase database. These counts contain no account ID, IP address or tool content.

**Section 3 processors (replace list):**
> Stripe (payments, when Pro opens), Google Firebase (sign-in, when Pro opens), Vercel (hosting), Cloudflare (DNS, security, email routing to [CONFIRM: inbox provider]), jsDelivr (code libraries), Have I Been Pwned (breach-check prefix only) and, only if you accept analytics cookies, Google Analytics.

**Section 4 cookies (append):**
> Some tools remember your recent colors, conversions or settings in your browser's local storage; this stays on your device. Google Analytics is currently turned off on every mdothree site, so no banner shows and no analytics cookie is set.
> **Do Not Track / Global Privacy Control.** We do not track you across other sites and do not sell or share personal information, so a Do Not Track signal has nothing to switch off. [CONFIRM: GPC handling, same as the shared MDO policy.]

**New sections (add before "Changes"):**
> **Your rights.** You can ask us to see, correct, export or delete personal information we hold about you by emailing hello@mdothree.com; we reply within 30 days. California residents have these rights under the CCPA/CPRA; EEA/UK residents under the GDPR/UK GDPR (legal bases: contract, legitimate interests, consent for analytics, legal obligation), and may complain to their data protection authority. Information is processed in the United States.
> **Children.** The tools are not directed to children under 13 and we do not knowingly collect their information. Buying Pro requires you to be 18 or the age of majority where you live.

## B. Terms of Service

**Opening (replace "operated by MDO3D")** with "run by mdothree ("we")".

**Section 2 "Access and Pro" (replace):**
> Core tools can be used without an account. mdothree Pro is **not on sale yet**; the Pro page lists what it will add. When it opens, Pro will be a subscription billed through Stripe at the price shown at checkout [CONFIRM: $4.99/month or $39.99/year per the Stripe prices — the tool pricing pages still say "$4 per month"; make them match before checkout reopens], renewing automatically until you cancel in the billing portal. Access continues to the end of the paid period; sales are final except for non-delivery, charges made in error, or rights the law gives you (see the Refund Policy).
> [Principal note: under the paid-only doctrine, whether the core tools stay usable without paying is a taste/strategy call (CONSUMER_AUDIT 4.2). These Terms describe what is true today.]

**New: eligibility (add as section 1a):**
> You must be at least 13 to use the tools and 18 (or the age of majority where you live) to buy Pro.

**Section 6 limitation of liability (append):**
> Our total liability for any claim is limited to the greater of what you paid us in the 12 months before the claim or US $50.

**Section 8 governing law (replace "State of Delaware")** with "[CONFIRM: governing-law state]".

## C. Refund Policy
Add the same non-delivery / charged-in-error exception used in `shared-mdo/refund-and-cancellation.md`, and the sentence "mdothree Pro is not on sale yet; this policy applies once it opens."
