<!--
DRAFT 2026-10-14 · replaces https://mdo3d.com/privacy (source: mdothree/mdo3d-landing → privacy.html)
Served (via redirect) for: mdo3d.com, guidance., oracle., tarot., runes., iching., dreams., astrology.,
numerology., fengshui., pastlife., names., compare.mdo3d.com, rigor.design + 7 tools, ronnascanner.com +
leads/companies/contacts/emails/prospects subdomains, and (when back up) leads.mdo3d.com.
Not legal advice. Practical compliance-hygiene draft; have counsel review before publishing.
Every [CONFIRM: …] must be resolved by the Principal before this goes live.
-->

# Privacy Policy

**Last updated:** [CONFIRM: publish date]

This Privacy Policy explains how MDO3D ("we", "us") handles personal information on mdo3d.com and the sites we run under it (together, the "Services"). Each site links here from its footer. The sections below cover all of them; the product sections in part 4 describe what each one does with your information.

Who to contact: **hello@mdo3d.com** for any privacy question or request. Postal address: [CONFIRM: mailing address for privacy and legal notices].

## 1. What we collect

| What | When | Where it goes |
|---|---|---|
| **Your questions and inputs** (a question for a reading, card/rune/hexagram draws, a dream description, your full name, birth date, birth time and birth place, details about your home or space, past-life "soul clues", resume and job text, interview answers, salary details) | When you ask a tool for a result | Sent to our API and on to Anthropic to generate the result (see part 3). Not saved by us unless you press Save in a Rigor tool. |
| **Email address** | When you start a paid checkout (we ask for it before sending you to Stripe), when you sign in to Rigor, or when you write to us | Stripe (as your checkout email), Firebase Authentication (Rigor accounts), our inbox |
| **Purchase records** (what you bought, amount, date, Stripe session and customer IDs, card brand and last 4 digits) | When you pay | Stripe, and our payment records |
| **Account records** (Rigor only): sign-in identifiers, plan and renewal status, monthly usage counts, items you choose to save | When you create a Rigor account | Firebase (Google) |
| **Technical data** (IP address, browser and device type, pages requested, time) | Every visit | Our hosting and network providers' logs (Vercel, Cloudflare) |
| **Things stored in your own browser** (see part 5) | When you use a tool | Your device only |

We do not ask for and do not want sensitive information beyond what a tool needs. Birth details and dream or past-life descriptions can be personal: enter only what you are comfortable sharing.

## 2. How we use it

- to produce the result you asked for;
- to take payment, confirm what you paid for and unlock it;
- to answer you when you write to us, and to handle billing problems;
- to keep the Services working and secure (rate limits, abuse prevention, error logs).

We do **not** sell personal information, we do not "share" it for cross-context behavioral advertising, and we do not use your inputs to build advertising profiles. We do not use your inputs to train AI models, and our AI provider does not train on them under its commercial terms.

## 3. AI processing (please read)

Most of our results are written by an AI model. When you request an AI result:

1. your input (for example your question and the cards drawn, or your name and birth date, or your resume and the job description) is sent over HTTPS to our API, hosted on Vercel;
2. our API sends it to **Anthropic, PBC**, which runs the Claude model that writes the result;
3. the result comes back to your browser.

Our API does not write these inputs to a database. Our hosting provider keeps short-lived request and error logs, which can include your checkout email when a payment completes [CONFIRM: Vercel log retention on the plan in use]. Anthropic processes the input to produce the result and keeps it for a limited period under its commercial terms [CONFIRM: current Anthropic API retention period, e.g. up to 30 days for trust and safety]; it does not use it to train its models.

Free previews that are calculated in your browser (for example the basic chart, numbers, card meanings or symbol lookups) are not sent to Anthropic.

## 4. Product sections

### 4.1 Guidance (oracle, tarot, runes, I Ching, dreams, astrology, numerology, feng shui, past life)
- **Inputs:** your question and draw; for astrology your birth date and (optionally) birth time and place; for numerology your full name and birth date; for dreams your dream description; for feng shui details about your space; for past life your birth details and the clues you enter. These go to Anthropic only when you request the paid AI reading (part 3).
- **Checkout email:** before checkout we ask for your email. It is passed to Stripe as your checkout email so Stripe can send your receipt. **We do not email the reading itself**; it is shown on the page after payment. [CONFIRM: if a reading-by-email feature ships, update this line.]
- **Unlocking:** after payment, a one-time credit is saved in your browser's local storage on that site. It does not follow you to another browser or device. If you lose it, email us with your checkout email and we will help.
- **Dream journal:** saved only in your browser (local storage). We never receive it.
- **Accounts:** sign-in is turned off on these sites today. [CONFIRM: keep off; if Firebase sign-in is turned on, add it here.]

### 4.2 Baby Name Oracle (names.mdo3d.com)
- The report is built from public U.S. Social Security Administration name data and our own curated meanings; your search (names, surname, sibling names, filters) is sent to our API to build it. [CONFIRM: no AI model is used for the report.]
- **Recovering a report:** if you lose the page, you can enter your checkout email and the last 4 digits of the card you paid with. We use them only to look up your payment with Stripe and re-show the report.
- Your last search is kept in your browser's local storage so the page can restore it.

### 4.3 Rigor career tools (rigor.design and its tools)
- **Account:** email and password through Firebase Authentication. Using the AI tools requires an active Rigor Pro subscription. [CONFIRM: true at publish time; today Pro checkout shows "coming soon" and the tool API is offline.]
- **What is sent:** the text you type or paste (resume, job description, LinkedIn sections, interview answers, salary details, recipient details) goes to our API at api.rigor.design and on to Anthropic (part 3). Resume files must be plain text; they are read in your browser and the file itself is not uploaded.
- **What is stored:** a subscription record (plan, status, renewal date, Stripe customer and subscription IDs) and a monthly usage count per tool, holding counts only. Nothing you typed is saved unless you press **Save**; saving stores a history item in Firebase linked to your account (for the resume analyzer, the score and the first 100 characters of your resume and job description; for other tools, the generated result and the role or recipient details shown with it).
- **Retention:** saved items and usage counts are kept while your account exists; email us to delete saved items or your whole account, and we confirm by email. Subscription records are kept as long as billing and tax law requires.
- We never share resume content with employers or recruiters.

### 4.4 ClawBench (compare.mdo3d.com)
- No account and nothing to buy. The page asks GitHub's public API for repository statistics directly from your browser, so GitHub receives your IP address and browser details under its own privacy statement.

### 4.5 RonnaScanner (ronnascanner.com and its subdomains)
- No tool is open yet. Joining the waitlist opens an email to us; we keep your address only to tell you when tools open, and delete it on request.

### 4.6 leads.mdo3d.com (when open)
- See the separate section "Business filing data" that must be added before this product reopens (draft: `leads-mdo3d/privacy-section.md`).

## 5. Cookies and browser storage

| Name | Type | Purpose | How long |
|---|---|---|---|
| `mdo_consent` | first-party cookie | remembers your cookie choice | 180 days |
| `_ga`, `_ga_*` | Google Analytics cookies | visit counts, **only if you click Accept** on a site where analytics is turned on | up to 2 years |
| theme setting | local storage | light/dark mode | until you clear it |
| purchase credit (Guidance) | local storage | unlocks the reading you paid for | until used or cleared |
| dream journal, last name search | local storage | saves your own entries on your device | until you clear it |
| Firebase sign-in session (Rigor) | browser storage | keeps you signed in | until you sign out |
| Stripe | Stripe cookies on Stripe's checkout pages | payment and fraud prevention | Stripe's terms |

Today Google Analytics is **turned off** on every site listed here, so no banner shows and no analytics cookie is set. If we turn it on, a banner will ask first and this table already describes what it does. We don't use advertising cookies.

**Do Not Track and Global Privacy Control.** We do not track you across other companies' websites and we do not sell or share personal information, so there is nothing for a "Do Not Track" signal to switch off. We treat a Global Privacy Control signal as a "Reject" of optional cookies. [CONFIRM: wire GPC → reject in consent.js, or delete the GPC sentence.]

## 6. Who we share it with

Only the service providers that run the Services for us, each under its own terms: **Stripe** (payments), **Anthropic** (AI results), **Google Firebase** (Rigor accounts and saved items), **Vercel** (hosting and APIs), **Cloudflare** (DNS, network security, and routing mail sent to hello@mdo3d.com to our inbox at [CONFIRM: inbox provider, e.g. Google Workspace/Gmail]), **GitHub** (ClawBench statistics, from your browser), and **Google Analytics** only if you accept it. We also disclose information if the law requires it, to protect people or the Services, or to a successor if a product is sold (this policy keeps applying).

## 7. How long we keep it

- AI inputs: not stored by us (part 3).
- Purchase records: as long as tax and accounting law requires [CONFIRM: e.g. 7 years].
- Rigor account data: while the account exists, then deleted within 30 days of a deletion request (billing records excepted).
- Emails to us: up to 3 years, then deleted. [CONFIRM]
- Hosting logs: per our providers' short log windows.

## 8. Your rights

Wherever you live, you can ask us to **see, correct, export or delete** the personal information we hold about you, and to stop any optional processing. Email hello@mdo3d.com from the address you used with us; we may need to confirm it is you, and we reply within 30 days (45 where California law allows). We will not treat you differently for asking.

- **California residents** have these rights under the CCPA/CPRA, including the right to know the categories above and to opt out of sale or sharing (we do neither). You may use an authorized agent.
- **EEA/UK residents** have rights under the GDPR/UK GDPR. Our legal bases: performing our contract with you (results, payment, accounts), legitimate interests (security, fraud prevention, records), consent (analytics cookies), and legal obligation (tax records). Your information is processed in the United States by us and our providers. You can complain to your data protection authority.

## 9. Children

The Services are for adults. They are not directed to children under 13, and we do not knowingly collect information from anyone under 13 (under 16 in the EEA/UK). Purchases require you to be 18 or the age of majority where you live. If you think a child has given us information, email us and we will delete it.

## 10. Security

We use HTTPS everywhere, keep secrets server-side, limit what we store, and rely on established providers for payments and sign-in. No system is perfectly secure.

## 11. Changes

We will post changes here with a new "Last updated" date. If a change materially affects information we already hold, we will tell account holders by email before it applies.

## 12. Contact

hello@mdo3d.com · MDO3D · [CONFIRM: mailing address]
