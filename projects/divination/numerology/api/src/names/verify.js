/**
 * Server-side checks that a Stripe Checkout Session is a real, paid purchase of
 * the Baby Name Oracle report ($2.99 Payment Link). READ-ONLY: it only calls
 * checkout.sessions.retrieve / checkout.sessions.list. It never writes to Stripe.
 *
 * The stripe client is injected so tests can pass a stub.
 */

export const MIN_PRICE_CENTS = 299;

// The Payment Link id (plink_...) of https://buy.stripe.com/eVqeVc6l20HL1hW97Z8k802.
// Fill in NAMES_PAYMENT_LINK_ID (env) once the operator reads it from the
// Stripe dashboard. Until then, sessions are matched by line-item name instead.
// Read per call (not at import) so dotenv / Vercel env changes apply.
export const namesPaymentLinkId = () => (process.env.NAMES_PAYMENT_LINK_ID || '').trim();

const PRODUCT_NAME_RE = /name/i;
const SESSION_ID_RE = /^cs_(live|test)_[A-Za-z0-9]{10,250}$/;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

export const isSessionId = s => typeof s === 'string' && SESSION_ID_RE.test(s);
export const isEmail = s => typeof s === 'string' && s.length <= 254 && EMAIL_RE.test(s.trim());

function lineItemNames(session) {
  const items = session?.line_items?.data || [];
  return items.map(li => li.description || li.price?.product?.name || '').filter(Boolean);
}

/**
 * Returns null when the session is a valid paid purchase, else a reason string.
 *
 * Amount: checked on amount_subtotal (the price before discounts), because the
 * MDOEARLY50 promo code takes 50% off at checkout (amount_total ~ 150). A
 * session fully covered by a promotion code (payment_status
 * 'no_payment_required') is accepted only when its subtotal is the full price
 * and a discount was applied.
 */
export function sessionProblem(session, { plinkId = namesPaymentLinkId() } = {}) {
  if (!session || session.object !== 'checkout.session') return 'not a checkout session';
  if (session.mode && session.mode !== 'payment') return 'not a one-time payment';
  if (session.status && session.status !== 'complete') return 'checkout not complete';
  const discounted = (session.total_details?.amount_discount || 0) > 0;
  const paid = session.payment_status === 'paid' || (session.payment_status === 'no_payment_required' && discounted);
  if (!paid) return 'not paid';
  if ((session.currency || '').toLowerCase() !== 'usd') return 'wrong currency';
  const subtotal = session.amount_subtotal ?? session.amount_total ?? 0;
  if (subtotal < MIN_PRICE_CENTS) return 'amount too low';
  if (plinkId) {
    const link = typeof session.payment_link === 'string' ? session.payment_link : session.payment_link?.id;
    if (link !== plinkId) return 'different product';
  } else if (!lineItemNames(session).some(n => PRODUCT_NAME_RE.test(n))) {
    return 'different product';
  }
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
  const plinkId = opts.plinkId ?? namesPaymentLinkId();
  const notFound = {
    ok: false, status: 402,
    error: 'We could not find a paid report for that email and card. Use the email you entered at checkout and the last 4 digits of the card you paid with.',
  };
  if (!isEmail(email) || typeof last4 !== 'string' || !/^\d{4}$/.test(last4)) return notFound;

  const emails = [...new Set([email.trim(), email.trim().toLowerCase()])];
  const sessions = [];
  try {
    for (const e of emails) {
      const params = {
        customer_details: { email: e },
        status: 'complete',
        limit: 20,
        expand: ['data.line_items', 'data.payment_intent.latest_charge'],
      };
      if (plinkId) params.payment_link = plinkId;
      const page = await stripe.checkout.sessions.list(params);
      for (const s of page?.data || []) if (!sessions.some(x => x.id === s.id)) sessions.push(s);
    }
  } catch (err) {
    console.error('names email lookup: stripe list failed:', err && err.message);
    return { ok: false, status: 502, error: 'Could not reach the payment processor. Please try again shortly.' };
  }
  const valid = sessions
    .filter(s => !sessionProblem(s, { plinkId }) && cardLast4(s) === last4)
    .sort((a, b) => (b.created || 0) - (a.created || 0));
  return valid.length ? { ok: true, session: valid[0] } : notFound;
}
