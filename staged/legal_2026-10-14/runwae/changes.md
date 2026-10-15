<!--
DRAFT 2026-10-14 · runwae.com /privacy, /terms, /refund, /cancellation (source: mdothree/runwae, production
branch `master` → privacy.html, terms.html, refund.html, cancellation.html). Not legal advice.
The 2026-10-13/14 privacy rewrite (consent banner, cookie list, retention) is good and matches the code.
The Terms carry 2019-era clauses that contradict it. Coordinate with staged 04_copy.sh A (runwae honesty
fixes on branch copy-honest-2026-10-14) so both land together.
-->

# Runwae — legal page corrections

## 1. Seller name
Terms and Privacy say "Runwae, LLC and its affiliates". Every other MDO site says "MDO3D", and the lab treats Runwae (the app) as an MDO product (Runwae Apparel is a separate Butts Studios brand).
- Replace "Runwae, LLC and its affiliates" with "Runwae" on Terms and Privacy (DECISIONS 2026-10-15: each property names its own project as the seller; no entity name). Do not publish an LLC name that is not a live registration.

## 2. Terms: "Sharing and Disclosure" contradicts the Privacy Policy (replace)
Live Terms: "Runwae will not share or sell any information regarding individual users under any circumstances."
The Privacy Policy (correctly) says data goes to Firebase/Google, Stripe, Google Analytics and Meta (if accepted), font providers, and that profiles are public to other users. Replace with:
> **Sharing and Disclosure.** We do not sell information about users. We share it only as the Privacy Policy describes: with the service providers that run Runwae (Google Firebase, Stripe, and — only if you accept cookies — Google Analytics and Meta), with other users to the extent your profile and public activity are visible on the platform, when the law requires it, or with a successor if Runwae is transferred.

## 3. Terms: limitation of liability is overbroad (replace)
Live: "UNDER NO CIRCUMSTANCES SHALL Runwae ... BE HELD LIABLE FOR ANY DIRECT, OR INDIRECT LOSSES". A blanket exclusion of all direct losses is unlikely to be enforced and reads badly. Replace with:
> To the extent the law allows, Runwae is not liable for indirect, incidental, special, consequential or punitive damages, or for lost profits, data or goodwill, including losses caused by other users' content or conduct, by your inability to access the site, or by the removal of your content. Our total liability for any claim is limited to the greater of the fees Runwae received from you in the 12 months before the claim or US $50. Gig payments held for you are not limited by this section.
(Note: Runwae charges no fee today, so the cap would effectively be $50; see the revenue-model decision.)

## 4. Terms: arbitration notice with no arbitration agreement (decide, then fix) [CONFIRM]
The Terms announce "MANDATORY BINDING ARBITRATION" and a class-action waiver but never say who arbitrates, under which rules, where, who pays, or how to opt out, and the Governing Law section points to Delaware courts. An incomplete clause invites a court to throw it out.
- **Option A (recommended for a small marketplace):** delete the arbitration notice and class waiver; keep governing law + courts + small-claims carve-out (same text as the shared MDO Terms §13).
- **Option B:** keep arbitration and add a full clause (AAA Consumer Rules or JAMS, fees for consumers per those rules, seat/venue, 30-day opt-out by email, small-claims carve-out, informal-resolution step). Needs counsel.

## 5. Payments held by the platform (describe accurately) [CONFIRM]
Terms/Refund: "the payment will be held by the Runwae platform until the influencer submits proof", then "transferred to the influencer".
- [CONFIRM: is this Stripe Connect "separate charges and transfers" (funds sit in the Runwae Stripe balance) or destination charges? Holding third-party funds can raise money-transmission questions; Stripe Connect's model normally covers it, but the copy should say "held in Runwae's Stripe account" rather than implying Runwae custody.]
- Gap: there is no rule for a gig that is paid but never posted after 14 days (the refund window closes while the funds remain held). Add: "If the influencer has not submitted proof within [CONFIRM: 30] days of payment, the marketer may request a full refund."
- Runwae adds no fee and pays the influencer the full price, so Stripe's processing fee is absorbed by Runwae on every gig [business note for the revenue-model decision].

## 6. Privacy Policy small fixes
- "Runwae does not collect or store any payment information" (Information We Collect) contradicts Data Retention ("Our records of a transaction (the gig, the amount, the two accounts involved and the Stripe payment reference)"). Replace with: "Runwae does not collect or store card details. We keep a record of each gig payment (gig, amount, the two accounts and the Stripe payment reference) and, for influencers, your Stripe account ID."
- Add **Your rights**: access, correction, export, deletion by emailing hello@runwae.com; reply within 30 days; CCPA/CPRA and GDPR/UK GDPR mention; processed in the United States.
- Add **Children**: "Runwae is for people 18 and older (see the Terms); we do not knowingly collect information from anyone under 18."
- Add **Do Not Track**: "Optional tools load only if you click Accept; we treat a Global Privacy Control signal as Reject [CONFIRM: wire it], and otherwise do not respond to Do Not Track signals."
- Add the operator name and a postal address [CONFIRM] to the Introduction.

## 7. Site-wide copy that the policies depend on (already staged in 04_copy.sh A)
- The footer subscribe form on every page (including /privacy) says "Thanks for Subscribing! We sent you an email!", but no email is sent (`email.php` is excluded from the build and returns 403). Staged fix changes it to "You're on the list".
- Visible stray `-->` markers in the header and footer of every legal page.
- `app.runwae.com` has no DNS record while the policies describe accounts, profiles and gigs. [CONFIRM: app fate; if the app stays offline, add a line at the top of Privacy/Terms: "The Runwae app is not open to new sign-ups right now."]
