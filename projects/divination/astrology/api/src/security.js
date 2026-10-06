/**
 * Abuse protection and paid-session checks for the divination APIs.
 *
 * rateLimit: small in-memory fixed-window limiter keyed by client IP. On
 * Vercel each warm instance keeps its own counters and a cold start resets
 * them, so this is best-effort protection against casual abuse, not a hard
 * quota.
 */

const TEN_MINUTES = 10 * 60 * 1000;

function clientIp(req) {
  // Vercel overwrites x-forwarded-for with the real client address.
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

export function rateLimit({ windowMs = TEN_MINUTES, max = 10, skip } = {}) {
  const hits = new Map();
  return (req, res, next) => {
    if (skip && skip(req)) return next();
    const now = Date.now();
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
    }
    const key = clientIp(req);
    let entry = hits.get(key);
    if (!entry || entry.reset <= now) {
      entry = { count: 0, reset: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.reset - now) / 1000)));
      return res.status(429).json({ success: false, error: 'Too many requests. Please try again later.' });
    }
    next();
  };
}

// Free AI routes: 10 requests per 10 minutes per IP. Premium requests are
// skipped here because they are capped by the paid-session check instead.
export const freeAiLimiter = rateLimit({ max: 10, skip: req => Boolean(req.body && req.body.premium) });
// Checkout creation calls Stripe; keep spam from burning the Stripe rate limit.
export const checkoutLimiter = rateLimit({ max: 20 });

/**
 * Returns an error message when any field is longer than its cap, else null.
 * fields: { label: [value, maxChars] }. Non-string values are measured as JSON.
 */
export function tooLong(fields) {
  for (const [label, [value, max]] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;
    const len = typeof value === 'string' ? value.length : JSON.stringify(value).length;
    if (len > max) return `${label} is too long (max ${max} characters).`;
  }
  return null;
}

/**
 * Verifies a Stripe checkout session server-side before premium content is
 * generated. The session must be paid, created by this service, and (when
 * allowedTypes is given) bought for one of the product types that covers the
 * requested reading. Applies the per-session use cap via recordUse.
 * Returns null when allowed, else { status, error }.
 */
export async function checkPaidSession(stripeService, sessionId, { allowedTypes, typeKey = 'readingType', maxUses = 3 } = {}) {
  if (!sessionId || typeof sessionId !== 'string') {
    return { status: 402, error: 'Payment required for premium readings.' };
  }
  const pay = await stripeService.verifyPayment(sessionId);
  if (!pay.success || !pay.paid) {
    return { status: 402, error: 'Payment could not be verified.' };
  }
  const meta = pay.metadata || {};
  if (meta.serviceName !== stripeService.serviceName) {
    return { status: 403, error: 'This payment is not valid for this service.' };
  }
  if (allowedTypes && !allowedTypes.includes(meta[typeKey])) {
    return { status: 403, error: 'This payment does not cover this reading type.' };
  }
  const uses = parseInt(meta.uses || '0', 10);
  if (uses >= maxUses) {
    return { status: 402, error: 'This reading has already been redeemed.' };
  }
  try { await stripeService.recordUse(sessionId, uses + 1); } catch (e) { /* best-effort, fail-open */ }
  return null;
}
