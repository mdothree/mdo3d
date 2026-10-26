// Shared policy pages for every shop: Privacy, Terms, Returns and pre-orders, Shipping, plus the policies hub.
// One template, per-brand fields from brand.json `policies` (and `shipping`, `tokens.fontsHref`). The core never
// names a brand. The text describes what the code actually does (keep it in step when the code changes):
//   * guest checkout on Stripe Checkout (Stripe Link offered, Stripe Tax on, US shipping address collected);
//   * the bag lives in the browser's localStorage (key "seed-cart:<brand>"), nothing is sent until checkout;
//   * the Stripe webhook appends each paid order (name, email, shipping address, items) to the order store
//     (orders/orders.jsonl) and the stock ledger; order emails go out through Resend;
//   * "Notify me" stores {email, product, time}; order lookup matches order number AND email;
//   * hosting and functions on Vercel; Google Fonts only when the brand sets tokens.fontsHref;
//   * pieces marked made to order (fulfilment "pod") are printed and shipped by Printful;
//   * no accounts, no analytics, no ad pixels, no cookies set by the shop itself.
// Unknown facts stay as "[CONFIRM: ...]" in brand.json; a live build refuses to ship while any remain.
// Copy rules: no em dashes, no "including", never call anything "free", no dollar amounts.
import { esc } from './kit.mjs';
import { shopLabel } from './site.mjs';

export const POLICY_PAGES = Object.freeze([
  { id: 'privacy', path: 'privacy.html', label: 'Privacy' },
  { id: 'terms', path: 'terms.html', label: 'Terms' },
  { id: 'returns', path: 'returns.html', label: 'Returns and pre-orders' },
  { id: 'shipping', path: 'shipping.html', label: 'Shipping' },
]);

const C = (what) => `[CONFIRM: ${what}]`;

/** Normalised policy fields for a brand. Missing facts come back as [CONFIRM: ...] markers, never invented. */
export function policyFields(brand) {
  const p = brand.policies ?? {};
  const days = Number.isInteger(p.returns_window_days) ? p.returns_window_days : null;
  return {
    shop: brand.name,
    domain: shopLabel(brand),
    entity: p.entity ?? brand.name, // the project itself is the seller (DECISIONS 2026-10-15: project names, no entity name)
    contact: p.contact ?? C('customer service inbox'),
    privacy: p.privacy_contact ?? p.contact ?? C('privacy inbox'),
    address: p.mailing_address ?? C('mailing address'),
    law: p.governing_law ?? C('governing-law state'),
    effective: p.effective_date ?? C('effective date'),
    returnsDays: days === null ? C('size-exchange window in days') : String(days),
    defectDays: Number.isInteger(p.defect_window_days) ? String(p.defect_window_days) : '30',
    exchangeShipping: p.exchange_shipping ?? C('who pays shipping on size exchanges'),
    handling: p.handling ?? 'In-stock orders ship within 30 days of your order.',
    retention: p.order_retention ?? C('how long order records are kept (suggest 7 years for tax records)'),
    preorderCancel: p.preorder_cancel ?? C('whether a pre-order can be cancelled for a full refund before its window closes'),
    country: brand.shipping?.country ?? 'US',
    shipNote: brand.shipping?.note ?? '',
    fonts: !!brand.tokens?.fontsHref,
    draft: brand.mode !== 'live' || p.draft === true,
  };
}

/** Every [CONFIRM: ...] marker left in a brand's policy fields (a live build must have none). */
export function policyGaps(brand) {
  const f = policyFields(brand);
  const markers = Object.values(f).filter((v) => typeof v === 'string').flatMap((v) => v.match(/\[CONFIRM:[^\]]*\]/g) ?? []);
  // brand.json `policies.<field>_status` notes ("placeholder: ...", "provisional: ...") block a launch too.
  const notes = Object.entries(brand.policies ?? {}).filter(([k, v]) => k.endsWith('_status') && /placeholder|provisional|pending/i.test(String(v)))
    .map(([k, v]) => `[CONFIRM: ${k.replace(/_status$/, '')}: ${v}]`);
  return [...new Set([...markers, ...notes])];
}

const mail = (a) => (/^\S+@\S+\.\S+$/.test(a) ? `<a href="mailto:${esc(a)}">${esc(a)}</a>` : esc(a));
const head = (f, title) => `<article class="seed-prose seed-policy"><h1>${esc(title)}</h1>
<p class="seed-fine">Last updated: ${esc(f.effective)}${f.draft ? '. Draft for review: final before the shop opens.' : ''}</p>`;
const foot = (f) => `<h2>Contact</h2><p>${esc(f.entity)}${f.entity === f.shop ? '' : `, selling as ${esc(f.shop)}`}. Email ${mail(f.contact)}. Post: ${esc(f.address)}.</p></article>`;

export function privacyBody(f, href) {
  return `${head(f, 'Privacy policy')}
<p>This policy explains what ${esc(f.shop)} (${esc(f.domain)}) collects, why, who helps us handle it and the choices you have. The shop is run by ${esc(f.entity)} ("we", "us").</p>
<h2>What we collect</h2>
<ul>
<li><strong>When you order.</strong> Checkout runs on Stripe. Stripe collects your name, email, shipping address and payment details. We receive your name, email, shipping address, the items, sizes and amounts, the ship-by date and the Stripe payment reference. We never see or store your full card number.</li>
<li><strong>Stripe Link.</strong> If you choose to save your details with Link, Stripe stores them under its own privacy policy so later checkouts can fill them in.</li>
<li><strong>Waitlists and reservations.</strong> If you join a waitlist or reserve a place for a piece, we keep your email, the piece, the time you signed up and your place in line. We use it to email you about that piece and nothing else. A reservation is not an order and nothing is charged. Every such email has an unsubscribe link.</li>
<li><strong>Order lookup.</strong> The order number and email you enter are used to find your order. Both must match.</li>
<li><strong>Emails to us.</strong> If you write to us, we keep the conversation to answer you.</li>
<li><strong>Technical data.</strong> Our host receives your IP address, browser type and the pages you request, as every web server does, and keeps short-lived request logs for security and troubleshooting.</li>
</ul>
<h2>Your bag, cookies and tracking</h2>
<p>Your bag is saved in your own browser (localStorage) so it survives a page reload. It stays on your device until you check out. The shop sets no cookies of its own and runs no analytics, advertising pixels or cross-site tracking. Stripe's checkout pages use cookies of their own for fraud prevention and to run Link.</p>
<p><strong>Do Not Track and Global Privacy Control.</strong> Because we do no cross-site tracking and never sell or share personal information for advertising, these signals do not change anything here; you are already opted out.</p>
<h2>How we use it</h2>
<p>To take payment, make and ship your order, send order emails (confirmation, production, shipping, and delay notices with the option to cancel), handle exchanges and refunds, calculate sales tax, prevent fraud, keep tax and accounting records, and send a waitlist or reservation email you asked for. We send marketing email only if you sign up for it.</p>
<h2>Who we share it with</h2>
<p>Only the service providers that run the shop, each limited to its part of the job:</p>
<ul>
<li><strong>Stripe</strong>: payments, Link, fraud checks and sales tax calculation.</li>
<li><strong>Resend</strong>: sends our order emails.</li>
<li><strong>Vercel</strong>: hosts the shop and runs checkout and sign-up functions.</li>
<li><strong>Cloudflare</strong>: stores waitlist and reservation sign-ups (email, piece, time) in a private database.</li>
<li><strong>Printful</strong>: for pieces marked made to order, receives your name, shipping address and the items so it can print and ship them.</li>
<li><strong>Shipping carriers</strong>: receive your name and address to deliver your order.</li>
${f.fonts ? '<li><strong>Google Fonts</strong>: your browser loads the shop\'s typefaces from Google, which receives your IP address.</li>\n' : ''}</ul>
<p>We may also disclose information when the law requires it, to protect our rights or our customers, or as part of a sale or transfer of the business. We do not sell your personal information.</p>
<h2>How long we keep it</h2>
<p>Order records: ${esc(f.retention)}. Waitlist and reservation sign-ups: until the piece is released or you unsubscribe. Correspondence: as long as needed to help you. Request logs: kept briefly by our host.</p>
<h2>Your rights</h2>
<p>You can ask to see, correct or delete your personal information, or for a copy of it. Residents of California and other US states with privacy laws, and of the UK and EU, have these rights by law; we extend them to everyone. We will confirm the request comes from you (usually by replying from the email on the order), answer within 30 days, and never treat you differently for asking. Some order records must be kept for tax law even after a deletion request. UK and EU visitors may also complain to their data protection authority. Write to ${mail(f.privacy)}.</p>
<h2>Children</h2>
<p>The shop is for adults. You must be 18 or older, or have a parent or guardian place the order. We do not knowingly collect information from children under 13; if you believe a child has given us information, write to us and we will delete it.</p>
<h2>Security and location</h2>
<p>Payment details stay with Stripe. Our records are kept with access limited to the people who fulfil orders. The shop and its providers are in the United States, and your information is processed there.</p>
<h2>Changes</h2>
<p>If we change this policy we update the date above, and for significant changes we say so on the site.</p>
<p>See also: <a href="${href('terms')}">Terms</a> · <a href="${href('returns')}">Returns and pre-orders</a> · <a href="${href('shipping')}">Shipping</a></p>
${foot(f)}`;
}

export function termsBody(f, href) {
  return `${head(f, 'Terms of sale')}
<p>These terms apply when you browse or buy from ${esc(f.shop)} (${esc(f.domain)}). The seller is ${esc(f.entity)}. By placing an order you agree to them, and to our <a href="${href('privacy')}">Privacy policy</a>, <a href="${href('returns')}">Returns and pre-orders</a> and <a href="${href('shipping')}">Shipping</a> pages.</p>
<h2>Who can buy</h2><p>You must be 18 or older, or order with a parent or guardian's permission. We ship to ${esc(f.country)} addresses only.</p>
<h2>Products and images</h2><p>We describe each piece as accurately as we can. Images labelled as concept renders show the design before production; the finished piece can differ slightly in colour and print placement. Sizes are listed on each product page.</p>
<h2>Prices, tax and payment</h2><p>Prices are in US dollars. Sales tax is calculated at checkout from your shipping address, and the shipping charge is shown before you pay. Payment is taken by Stripe when you place the order, pre-orders too.</p>
<h2>Your order</h2><p>Your order is accepted when we email the confirmation. We may cancel an order and refund it in full if a price or listing was wrong, a piece is no longer available, or we suspect fraud.</p>
<h2>Pre-orders and ship-by dates</h2><p>Every pre-order shows a ship-by date before you pay. If we cannot ship by that date we email you before it passes, with a new date and the option to cancel for a full refund. The details are on <a href="${href('returns')}">Returns and pre-orders</a>.</p>
<h2>Delivery and risk</h2><p>Title and risk of loss pass to you when the carrier delivers the order. If a parcel is lost or arrives damaged, tell us and we will replace or refund it.</p>
<h2>Exchanges and refunds</h2><p>Size exchanges within ${esc(f.returnsDays)} days of delivery; no change-of-mind returns. Faulty or wrong items are always replaced or refunded. See <a href="${href('returns')}">Returns and pre-orders</a>.</p>
<h2>Designs and content</h2><p>The designs, artwork, photos and text on this site belong to us or our licensors. You may share links and images for personal, non-commercial use; anything else needs our written permission.</p>
<h2>Using the site</h2><p>Please do not misuse the site: no attempts to break or overload it, scrape it at scale, or buy for unauthorised resale using automated tools.</p>
<h2>Warranties and liability</h2><p>Apart from the promises in these terms and any rights you have by law, the site and products are provided as is. To the extent the law allows, our total liability for any order is limited to the amount you paid for it, and we are not liable for indirect or consequential losses. Nothing here limits rights that cannot be limited by law, and some states do not allow certain limits, so they may not apply to you.</p>
<h2>Governing law</h2><p>These terms are governed by the laws of ${esc(f.law)}, without regard to conflict-of-law rules. If you are a consumer, you keep any protections of the law where you live.</p>
<h2>Changes</h2><p>We may update these terms; the version in place when you ordered applies to that order.</p>
${foot(f)}`;
}

export function returnsBody(f, href) {
  return `${head(f, 'Returns, exchanges and pre-orders')}
<h2>Size exchanges</h2><p>If a piece doesn't fit, you can exchange it for another size within ${esc(f.returnsDays)} days of delivery, while that size is available. It must be unworn and unwashed with its tags on. Email ${mail(f.contact)} with your order number and the size you want, and we'll send instructions. Shipping on exchanges: ${esc(f.exchangeShipping)}.</p>
<h2>Returns</h2><p>We take no change-of-mind returns; checkout says so before you pay. This does not affect the remedies below or your rights by law.</p>
<h2>Faulty, damaged or wrong items</h2><p>If a piece arrives faulty, damaged or not what you ordered, email us within ${esc(f.defectDays)} days of delivery with your order number and a photo. We'll replace it or refund it in full with its shipping, and cover the cost of sending it back.</p>
<h2>Pre-orders</h2>
<ul>
<li>Pre-order pieces are made after their window closes. Every pre-order shows a <strong>ship-by date</strong> on the product page, in the bag and at checkout, and you are charged at checkout.</li>
<li>If something will stop us shipping by that date, we email you <strong>before it passes</strong> with a new date and the option to cancel for a full refund.</li>
<li>If the new date is more than 30 days after the original one, or we can't give a new date, we cancel and refund your order unless you tell us you want to wait.</li>
<li>Each design has a minimum production run. If a design doesn't reach it, everyone who ordered it gets a full refund or a swap to a design that did.</li>
<li>Cancelling before the window closes: ${esc(f.preorderCancel)}.</li>
</ul>
<h2>Mixed orders</h2><p>An order that mixes in-stock and pre-order pieces, or pieces from different drops, ships together when its latest item is ready. The bag and checkout both show that date, and the delay promise above covers the whole order.</p>
<h2>Refunds</h2><p>Refunds go back to the original payment method through Stripe within 7 business days of approval. Your bank may take a few more days to show it.</p>
<p>See also: <a href="${href('shipping')}">Shipping</a> · <a href="${href('terms')}">Terms</a> · <a href="${href('privacy')}">Privacy</a></p>
${foot(f)}`;
}

export function shippingBody(f, href) {
  return `${head(f, 'Shipping')}
<h2>Where we ship</h2><p>${esc(f.shipNote)} We ship to ${esc(f.country)} addresses only.</p>
<h2>When it ships</h2><p>${esc(f.handling)} Pre-orders ship by the date shown before you pay (see <a href="${href('returns')}">Returns and pre-orders</a>). An order with several pieces ships together when its latest item is ready.</p>
<h2>Cost and tax</h2><p>The shipping charge is shown at checkout before you pay. Sales tax is calculated at checkout from your shipping address.</p>
<h2>Tracking</h2><p>You'll get a tracking number by email when your order ships, and you can check status any time with your order number and email on <a href="${href('orders')}">Order lookup</a>.</p>
<h2>Addresses, losses and damage</h2><p>Please check your address at checkout; email us straight away if it's wrong and we'll fix it if the order hasn't shipped. If a parcel is lost in transit or arrives damaged, email us and we'll replace or refund it.</p>
${foot(f)}`;
}

/** The policies hub (policies.html): a short summary of each page plus links. */
export function hubBody(f, href) {
  return `<article class="seed-prose seed-policy"><h1>Shipping, returns and policies</h1>
<p class="seed-fine">Last updated: ${esc(f.effective)}${f.draft ? '. Draft for review: final before the shop opens.' : ''}</p>
<h2>Pre-orders</h2><p>Pre-order pieces are made after their window closes and show a <strong>ships-by date</strong> before you pay. If something will stop us shipping by that date, we'll email you <strong>before</strong> it passes with the new date and the option to cancel for a full refund. An order that mixes pieces ships together when its latest item is ready.</p>
<h2>Exchanges</h2><p>Size exchanges within ${esc(f.returnsDays)} days of delivery. Faulty or wrong items are replaced or refunded.</p>
<h2>Shipping</h2><p>${esc(f.shipNote)} You'll get a tracking number by email when your order ships.</p>
<h2>Your details</h2><p>Checkout runs on Stripe. We use your name, email and address to make, ship and support your order, and never sell them.</p>
<ul class="seed-policy-index">${POLICY_PAGES.map((p) => `<li><a href="${href(p.id)}">${esc(p.label)}</a></li>`).join('')}</ul>
${foot(f)}`;
}

export const POLICY_BODIES = { privacy: privacyBody, terms: termsBody, returns: returnsBody, shipping: shippingBody };

/** The legal links row the core appends to every footer: every policy page plus the contact address. */
export function legalNav(brand, href) {
  const f = policyFields(brand);
  return `<nav class="seed-legal" aria-label="Policies">${POLICY_PAGES.map((p) => `<a href="${href(p.id)}">${esc(p.label)}</a>`).join('')}<a href="mailto:${esc(f.contact)}">Contact</a></nav>`;
}
