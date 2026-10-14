// POST /api/checkout  {brand, lines:[{product, size, color, qty}]}  ->  {url}  (Stripe Checkout Session)
//
// SAFETY (payments code: deploying this is gated on the Principal's OK):
//   * Off unless CHECKOUT_ENABLED === 'true'  -> 503.
//   * Refuses any key that isn't sk_test_/rk_test_ unless ALLOW_LIVE_STRIPE === 'true'.
//   * Price, name and ship-by come from the server-side catalog, never from the client.
//   * Product must be status 'live', priced, and (for pre-orders) inside an open window.
// Env: BRAND, STRIPE_SECRET_KEY, CHECKOUT_ENABLED, ALLOW_LIVE_STRIPE, SITE_URL, SHIPPING_FLAT_CENTS (optional override)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkoutParams } from '../core/checkout.mjs';

export function loadCatalog(brandId, root = process.cwd()) {
  if (!/^[a-z0-9-]+$/.test(brandId ?? '')) throw new Error('BRAND not set');
  const read = (f) => JSON.parse(readFileSync(join(root, 'brands', brandId, f), 'utf8'));
  return { brand: read('brand.json'), products: read('catalog.json').products, drops: read('drops.json').drops };
}

export function keyAllowed(key, env) {
  if (!key) return false;
  if (/^(sk|rk)_test_/.test(key)) return true;
  return env.ALLOW_LIVE_STRIPE === 'true' && /^(sk|rk)_live_/.test(key);
}

/** Validate a request and return Stripe form params, or {error, status}. Pure: unit-tested.
 *  Body: {lines:[{product,size,color,qty}]} from the cart, or the legacy {product,size,qty}. */
export const sessionParams = checkoutParams;

export default async function handler(req, res) {
  const send = (status, obj) => { res.statusCode = status; res.setHeader('content-type', 'application/json'); res.setHeader('cache-control', 'no-store'); res.end(JSON.stringify(obj)); };
  if (req.method !== 'POST') return send(405, { error: 'POST only' });
  const env = process.env;
  if (env.CHECKOUT_ENABLED !== 'true') return send(503, { error: 'Checkout is not open yet.' });
  if (!keyAllowed(env.STRIPE_SECRET_KEY, env)) return send(503, { error: 'Checkout is not configured.' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { return send(400, { error: 'bad JSON' }); } }
  let cat;
  try { cat = loadCatalog(env.BRAND); } catch { return send(500, { error: 'store misconfigured' }); }
  const shippingCents = env.SHIPPING_FLAT_CENTS ? Number(env.SHIPPING_FLAT_CENTS) : undefined;
  const r = sessionParams(cat, body, { siteUrl: env.SITE_URL, shippingCents });
  if (r.error) return send(r.status, { error: r.error });

  const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(r.params),
  });
  const j = await resp.json().catch(() => ({}));
  if (!resp.ok || !j.url) return send(502, { error: 'Could not start checkout. Please try again.' });
  return send(200, { url: j.url });
}
