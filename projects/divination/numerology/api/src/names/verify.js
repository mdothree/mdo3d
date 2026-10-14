/**
 * Server-side checks that a Stripe Checkout Session is a real, paid purchase of
 * the Baby Name Oracle report ($3 Payment Link; the original link stays valid).
 * READ-ONLY: it only calls checkout.sessions.retrieve / checkout.sessions.list.
 * It never writes to Stripe.
 *
 * The stripe client is injected so tests can pass a stub.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const LINKS_FILE = require('./links.json');

// Floor for a session that can't be matched to a known link (line-item name
// fallback): the lowest list price any names link has ever had.
export const MIN_PRICE_CENTS = 299;

const PLINK_RE = /^plink_[A-Za-z0-9]+$/;

/**
 * The Payment Links that sell the report: [{ id, amount_cents, price_id? }].
 * From src/names/links.json (filled in by the pricing GO script; placeholder
 * entries are skipped) plus NAMES_PAYMENT_LINK_ID / NAMES_PAYMENT_LINK_IDS
 * (env, comma-separated; amount unknown -> MIN_PRICE_CENTS floor).
 * Read per call (not at import) so dotenv / Vercel env changes apply.
 */
export function namesLinks(file = LINKS_FILE) {
  const out = [];
  for (const l of file?.links || []) {
    if (l && PLINK_RE.test(l.id || '') && Number.isInteger(l.amount_cents) && l.amount_cents > 0) {
      out.push({ id: l.id, amount_cents: l.amount_cents, price_id: /^price_/.test(l.price_id || '') ? l.price_id : null });
    }
  }
  const env = [process.env.NAMES_PAYMENT_LINK_ID, process.env.NAMES_PAYMENT_LINK_IDS].filter(Boolean).join(',');
  for (const id of env.split(',').map(x => x.trim()).filter(x => PLINK_RE.test(x))) {
    if (!out.some(l => l.id === id)) out.push({ id, amount_cents: null, price_id: null });
  }
  return out;
}

// Back-compat: the first configured link id ('' when none).
export const namesPaymentLinkId = () => (namesLinks()[0]?.id || '');

// opts.links (array) wins; else opts.plinkId (string: '' = no link matching,
// 'plink_...' = that one link, amount floor); else the configured links.
function linksFrom(opts = {}) {
  if (Array.isArray(opts.links)) return opts.links;
  if (typeof opts.plinkId === 'string') return opts.plinkId ? [{ id: opts.plinkId, amount_cents: null, price_id: null }] : [];
  return namesLinks();
}

const PRODUCT_NAME_RE = /name/i;
const SESSION_ID_RE = /^cs_(live|test)_[A-Za-z0-9]{10,250}$/;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

export const isSessionId = s => typeof s === 'string' && SESSION_ID_RE.test(s);
export const isEmail = s => typeof s === 'string' && s.length <= 254 && EMAIL_RE.test(s.trim());

function lineItemNames(session) {
  const items = session?.line_items?.data || [];
  return items.map(li => li.description || li.price?.product?.name || '').filter(Boolean);
}

function sessionLinkId(session) {
  return typeof session.payment_link === 'string' ? session.payment_link : session.payment_link?.id;
}

/**
 * Returns null when the session is a valid paid purchase, else a reason string.
 *
 * Amount: amount_subtotal (the price before discounts) must be at least the
 * list price of the link the session came from ($3 link: 300; original link:
 * 299). Promo codes only lower amount_total, so MDOEARLY50 (50% off, total 150)
 * passes. A session fully covered by a promotion code (payment_status
 * 'no_payment_required') is accepted only when its subtotal is the full price
 * and a discount was applied. With no link configured, sessions match by
 * line-item name and the MIN_PRICE_CENTS floor.
 */
export function sessionProblem(session, opts = {}) {
  const links = linksFrom(opts);
  if (!session || session.object !== 'checkout.session') return 'not a checkout session';
  if (session.mode && session.mode !== 'payment') return 'not a one-time payment';
  if (session.status && session.status !== 'complete') return 'checkout not complete';
  const discounted = (session.total_details?.amount_discount || 0) > 0;
  const paid = session.payment_status === 'paid' || (session.payment_status === 'no_payment_required' && discounted);
  if (!paid) return 'not paid';
  if ((session.currency || '').toLowerCase() !== 'usd') return 'wrong currency';
  const subtotal = session.amount_subtotal ?? session.amount_total ?? 0;
  if (links.length) {
    const link = links.find(l => l.id === sessionLinkId(session));
    if (!link) return 'different product';
    const prices = (session.line_items?.data || []).map(li => li.price?.id).filter(Boolean);
    if (link.price_id && prices.length && !prices.includes(link.price_id)) return 'different product';
    if (subtotal < (link.amount_cents ?? MIN_PRICE_CENTS)) return 'amount too low';
    return null;
  }
  if (subtotal < MIN_PRICE_CENTS) return 'amount too low';
  if (!lineItemNames(session).some(n => PRODUCT_NAME_RE.test(n))) return 'different product';
  return null;
}

/**
 * Verifies one session id. Returns { ok: true, session } or { ok: false, status, error }.
 */
export async function verifyNamesSession(stripe, sessionId, opts = {}) {
  if (!isSessionId(sessionId)) {
    return { ok: false, status: 402, error: 'Payment required: a valid checkout session is needed for the report.' };
  }
  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['line_items'] });
  } catch (err) {
    if (err && (err.statusCode === 404 || err.code === 'resource_missing' || err.statusCode === 400)) {
      return { ok: false, status: 402, error: 'Payment could not be verified for this checkout session.' };
    }
    console.error('names verify: stripe retrieve failed:', err && err.message);
    return { ok: false, status: 502, error: 'Could not reach the payment processor. Please try again shortly.' };
  }
  const problem = sessionProblem(session, opts);
  if (problem) {
    return { ok: false, status: 402, error: 'This checkout session is not a paid Baby Name Oracle report purchase.', reason: problem };
  }
  return { ok: true, session };
}

function cardLast4(session) {
  const pi = session.payment_intent;
  if (!pi || typeof pi !== 'object') return null;
  const ch = pi.latest_charge;
  if (!ch || typeof ch !== 'object') return null;
  return ch.payment_method_details?.card?.last4 || null;
}

/**
 * Finds the most recent valid purchase for an email (read-only Stripe list).
 * The buyer must also give the last 4 digits of the card they paid with, so an
 * email alone cannot reveal whether someone bought a baby-name report.
 * Returns { ok: true, session } or { ok: false, status, error }.
 */
export async function findPaidSessionByEmail(stripe, email, last4, opts = {}) {
  const links = linksFrom(opts);
  const notFound = {
    ok: false, status: 402,
    error: 'We could not find a paid report for that email and card. Use the email you entered at checkout and the last 4 digits of the card you paid with.',
  };
  if (!isEmail(email) || typeof last4 !== 'string' || !/^\d{4}$/.test(last4)) return notFound;

  const emails = [...new Set([email.trim(), email.trim().toLowerCase()])];
  const sessions = [];
  const linkIds = links.length ? links.map(l => l.id) : [null];
  try {
    for (const e of emails) {
      for (const linkId of linkIds) {
        const params = {
          customer_details: { email: e },
          status: 'complete',
          limit: 20,
          expand: ['data.line_items', 'data.payment_intent.latest_charge'],
        };
        if (linkId) params.payment_link = linkId;
        const page = await stripe.checkout.sessions.list(params);
        for (const s of page?.data || []) if (!sessions.some(x => x.id === s.id)) sessions.push(s);
      }
    }
  } catch (err) {
    console.error('names email lookup: stripe list failed:', err && err.message);
    return { ok: false, status: 502, error: 'Could not reach the payment processor. Please try again shortly.' };
  }
  const valid = sessions
    .filter(s => !sessionProblem(s, { links }) && cardLast4(s) === last4)
    .sort((a, b) => (b.created || 0) - (a.created || 0));
  return valid.length ? { ok: true, session: valid[0] } : notFound;
}
