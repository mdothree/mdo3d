// POST /api/checkout  {product, size, qty}  ->  {url}  (Stripe Checkout Session)
//
// SAFETY (payments code: deploying this is gated on the Principal's OK):
//   * Off unless CHECKOUT_ENABLED === 'true'  -> 503.
//   * Refuses any key that isn't sk_test_/rk_test_ unless ALLOW_LIVE_STRIPE === 'true'.
//   * Price, name and ship-by come from the server-side catalog, never from the client.
//   * Product must be status 'live', priced, and (for pre-orders) inside an open window.
// Env: BRAND, STRIPE_SECRET_KEY, CHECKOUT_ENABLED, ALLOW_LIVE_STRIPE, SITE_URL, SHIPPING_FLAT_CENTS (optional override)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { purchasable, shipBy } from '../src/drop.mjs';

const MAX_QTY = 5;

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

/** Validate a request and return Stripe form params, or {error, status}. Pure: unit-tested. */
export function sessionParams({ brand, products, drops }, body, { siteUrl, now = new Date(), shippingCents } = {}) {
  const { product: pid, size } = body ?? {};
  const qty = Number(body?.qty ?? 1);
  if (typeof pid !== 'string' || typeof size !== 'string') return { status: 400, error: 'product and size are required' };
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) return { status: 400, error: `qty must be 1–${MAX_QTY}` };
  const p = products.find((x) => x.id === pid);
  if (!p) return { status: 404, error: 'unknown product' };
  if (!p.sizes.includes(size)) return { status: 400, error: 'unknown size' };
  const buy = purchasable(p, drops, now);
  if (!buy.ok) return { status: 409, error: `not available: ${buy.reason}` };
  if (!siteUrl) return { status: 500, error: 'SITE_URL not set' };
  const ship = Number.isInteger(shippingCents) ? shippingCents : brand.shipping?.flat_cents;
  if (!Number.isInteger(ship) || ship < 0) return { status: 500, error: 'shipping rate not set' };

  const sb = buy.drop ? shipBy(buy.drop.window.close, buy.drop.schedule).shipBy : null;
  const terms = sb
    ? `Pre-order: ships by ${sb}. Size exchanges only; no returns.`
    : 'Size exchanges only; no returns.';
  const f = {
    mode: 'payment',
    'line_items[0][quantity]': String(qty),
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][unit_amount]': String(buy.price_cents),
    'line_items[0][price_data][tax_behavior]': 'exclusive',
    'line_items[0][price_data][product_data][name]': `${p.name}, ${size}`,
    'line_items[0][price_data][product_data][description]': sb ? `Pre-order. Ships by ${sb}.` : p.description.slice(0, 200),
    'line_items[0][price_data][product_data][tax_code]': 'txcd_30011000', // clothing
    'automatic_tax[enabled]': 'true',
    'shipping_address_collection[allowed_countries][0]': 'US',
    'shipping_options[0][shipping_rate_data][type]': 'fixed_amount',
    'shipping_options[0][shipping_rate_data][display_name]': sb ? `Ships by ${sb}` : 'Standard shipping',
    'shipping_options[0][shipping_rate_data][fixed_amount][amount]': String(ship),
    'shipping_options[0][shipping_rate_data][fixed_amount][currency]': 'usd',
    'shipping_options[0][shipping_rate_data][tax_behavior]': 'exclusive',
    'custom_text[submit][message]': terms,
    'metadata[brand]': brand.id,
    'metadata[product]': p.id,
    'metadata[size]': size,
    'metadata[qty]': String(qty),
    'metadata[channel]': p.channel,
    'payment_intent_data[metadata][brand]': brand.id,
    'payment_intent_data[metadata][product]': p.id,
    'payment_intent_data[metadata][size]': size,
    success_url: `${siteUrl}/thanks.html?session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/products/${p.id}.html`,
  };
  if (buy.drop) {
    f['metadata[drop]'] = buy.drop.id;
    f['metadata[ship_by]'] = sb;
    f['payment_intent_data[metadata][drop]'] = buy.drop.id;
  }
  return { params: f };
}

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
