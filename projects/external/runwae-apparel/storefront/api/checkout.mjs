// POST /api/checkout  {brand, lines:[{product, size, color, qty}]}  ->  {url}  (Stripe Checkout Session)
//
// SAFETY (payments code: deploying this is gated on the Principal's OK):
//   * Off unless CHECKOUT_ENABLED === 'true'  -> 503.
//   * Refuses any key that isn't sk_test_/rk_test_ unless ALLOW_LIVE_STRIPE === 'true'.
//   * Price, name and ship-by come from the server-side catalog, never from the client.
//   * Product must be available/preorder (inventory/inventory.csv), priced, and (for pre-orders) inside an open window.
//   * No overselling: every line is re-checked against live stock and HELD for the session's life (30 min,
//     core/stock.mjs reserve). The hold is released if Stripe refuses the session, when the session expires
//     (api/stripe-webhook.mjs, checkout.session.expired) or lazily once it passes expires_at; a paid session turns it
//     into a sale. Pre-order caps are enforced the same way.
// Env: BRAND, STRIPE_SECRET_KEY, CHECKOUT_ENABLED, ALLOW_LIVE_STRIPE, SITE_URL, SHIPPING_FLAT_CENTS (optional override),
//      INVENTORY_ROOT (default: the working directory)
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { checkoutParams } from '../core/checkout.mjs';
import { readBrandDir } from '../core/catalog.mjs';
import { reserve, release, variantKey, HOLD_MS } from '../core/stock.mjs';

export function loadCatalog(brandId, root = process.cwd(), now = new Date()) {
  if (!/^[a-z0-9-]+$/.test(brandId ?? '')) throw new Error('BRAND not set');
  const { brand, catalog, drops } = readBrandDir(join(root, 'brands', brandId), { now });
  return { brand, products: catalog, drops };
}

/** Cart lines -> SKU holds (colour defaults to the only colour, as checkoutParams does). */
export function holdLines(cat, lines) {
  return lines.map((l) => {
    const p = cat.products.find((x) => x.id === l.product);
    const color = l.color || ((p?.colors ?? []).length === 1 ? p.colors[0].id : '');
    return { sku: `${cat.brand.id}/${l.product}/${variantKey(color, l.size)}`, qty: Number(l.qty ?? 1) };
  });
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
  const root = env.INVENTORY_ROOT ?? process.cwd();
  let cat;
  try { cat = loadCatalog(env.BRAND, root); } catch { return send(500, { error: 'store misconfigured' }); }
  const shippingCents = env.SHIPPING_FLAT_CENTS ? Number(env.SHIPPING_FLAT_CENTS) : undefined;
  const r = sessionParams(cat, body, { siteUrl: env.SITE_URL, shippingCents });
  if (r.error) return send(r.status, { error: r.error });

  // Hold the stock before Stripe sees the order.
  const now = new Date();
  const ref = `rsv_${now.getTime().toString(36)}_${randomBytes(6).toString('hex')}`;
  const lines = Array.isArray(body?.lines) ? body.lines : [body];
  let hold;
  try { hold = await reserve(root, { lines: holdLines(cat, lines), ref, now, holdMs: HOLD_MS }); } catch { return send(503, { error: 'The shop is busy. Please try again.' }); }
  if (!hold.ok) return send(409, { error: `Not available: ${hold.sku.split('/').slice(1).join(' ')} (${hold.reason}).` });
  r.params['metadata[reservation]'] = ref;
  r.params.expires_at = String(Math.floor((now.getTime() + HOLD_MS) / 1000) + 60);

  let j = {};
  let ok = false;
  try {
    const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(r.params),
    });
    j = await resp.json().catch(() => ({}));
    ok = resp.ok && !!j.url;
  } catch { ok = false; }
  if (!ok) {
    await release(root, { ref, reason: 'stripe refused the session' }).catch(() => {});
    return send(502, { error: 'Could not start checkout. Please try again.' });
  }
  return send(200, { url: j.url });
}
