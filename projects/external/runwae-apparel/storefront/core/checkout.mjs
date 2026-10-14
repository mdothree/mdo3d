// Cart -> Stripe Checkout Session params. Pure: no network, no filesystem (api/checkout.mjs does the I/O).
// The client sends only product ids, size, colour and qty; price, name and ship-by come from the server catalog.
// Each line carries its own metadata {brand, product, size, color, qty, drop, ship_by, channel} on
// price_data.product_data.metadata, so `tools/drop.mjs tally` can read multi-line orders.
// Stripe Link: Checkout offers Link automatically when dynamic payment methods are on in the Dashboard
// (we don't pin payment_method_types), so returning buyers get their saved email, address and card.
import { purchasable, shipBy } from './drop.mjs';
import { normaliseCart, CART_LIMITS } from './cart.mjs';

export const MAX_QTY = CART_LIMITS.maxQty;
export const MAX_LINES = CART_LIMITS.maxLines;

/** Accepts {lines:[{product,size,color,qty}]} or the legacy single item {product,size,qty}. */
export function checkoutParams({ brand, products, drops }, body, { siteUrl, now = new Date(), shippingCents } = {}) {
  const raw = Array.isArray(body?.lines) ? body.lines : (body && typeof body === 'object' && 'product' in body ? [body] : null);
  if (!raw || !raw.length) return { status: 400, error: 'product and size are required' };
  if (raw.length > MAX_LINES) return { status: 400, error: `at most ${MAX_LINES} lines` };
  const lines = [];
  for (const l of raw) {
    const qty = Number(l?.qty ?? 1);
    if (typeof l?.product !== 'string' || typeof l?.size !== 'string') return { status: 400, error: 'product and size are required' };
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) return { status: 400, error: `qty must be 1–${MAX_QTY}` };
    const p = products.find((x) => x.id === l.product);
    if (!p) return { status: 404, error: 'unknown product' };
    if (p.format === 'digital') return { status: 409, error: 'not available: digital checkout is not configured' };
    if (!(p.sizes ?? []).includes(l.size)) return { status: 400, error: 'unknown size' };
    const colors = p.colors ?? [];
    let color = typeof l.color === 'string' ? l.color : '';
    if (colors.length === 1 && !color) color = colors[0].id;
    if (colors.length && !colors.some((c) => c.id === color)) return { status: 400, error: 'unknown colour' };
    const buy = purchasable(p, drops, now);
    if (!buy.ok) return { status: 409, error: `not available: ${buy.reason}` };
    lines.push({ p, size: l.size, color, qty, buy, sb: buy.drop ? shipBy(buy.drop.window.close, buy.drop.schedule).shipBy : null });
  }
  if (normaliseCart(lines.map((x) => ({ product: x.p.id, size: x.size, color: x.color, qty: x.qty }))).length !== lines.length) {
    return { status: 400, error: 'duplicate lines' };
  }
  if (!siteUrl) return { status: 500, error: 'SITE_URL not set' };
  const ship = Number.isInteger(shippingCents) ? shippingCents : brand.shipping?.flat_cents;
  if (!Number.isInteger(ship) || ship < 0) return { status: 500, error: 'shipping rate not set' };

  // The order ships when its latest item is ready.
  const latest = lines.map((x) => x.sb).filter(Boolean).sort().pop() ?? null;
  const mixed = latest && (lines.some((x) => !x.sb) || new Set(lines.filter((x) => x.sb).map((x) => x.buy.drop.id)).size > 1);
  const terms = latest
    ? `Pre-order: ships by ${latest}${mixed ? ' (the whole order ships together when its latest item is ready)' : ''}. Size exchanges only; no returns.`
    : 'Size exchanges only; no returns.';
  const f = {
    mode: 'payment',
    'automatic_tax[enabled]': 'true',
    'shipping_address_collection[allowed_countries][0]': brand.shipping?.country ?? 'US',
    'shipping_options[0][shipping_rate_data][type]': 'fixed_amount',
    'shipping_options[0][shipping_rate_data][display_name]': latest ? `Ships by ${latest}` : 'Standard shipping',
    'shipping_options[0][shipping_rate_data][fixed_amount][amount]': String(ship),
    'shipping_options[0][shipping_rate_data][fixed_amount][currency]': 'usd',
    'shipping_options[0][shipping_rate_data][tax_behavior]': 'exclusive',
    'custom_text[submit][message]': terms,
    'metadata[brand]': brand.id,
    'metadata[lines]': String(lines.length),
    'payment_intent_data[metadata][brand]': brand.id,
    success_url: `${siteUrl}/thanks.html?session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/cart.html`,
  };
  lines.forEach((x, i) => {
    const k = `line_items[${i}]`;
    const colorName = (x.p.colors ?? []).find((c) => c.id === x.color)?.name;
    f[`${k}[quantity]`] = String(x.qty);
    f[`${k}[price_data][currency]`] = 'usd';
    f[`${k}[price_data][unit_amount]`] = String(x.buy.price_cents);
    f[`${k}[price_data][tax_behavior]`] = 'exclusive';
    f[`${k}[price_data][product_data][name]`] = [x.p.name, colorName, x.size].filter(Boolean).join(', ');
    f[`${k}[price_data][product_data][description]`] = x.sb ? `Pre-order. Ships by ${x.sb}.` : String(x.p.summary ?? x.p.description ?? x.p.name).slice(0, 200);
    f[`${k}[price_data][product_data][tax_code]`] = x.p.tax_code ?? 'txcd_30011000'; // clothing
    const meta = { brand: brand.id, product: x.p.id, size: x.size, color: x.color, qty: String(x.qty), channel: x.p.channel ?? '', drop: x.buy.drop?.id ?? '', ship_by: x.sb ?? '' };
    for (const [mk, mv] of Object.entries(meta)) if (mv) f[`${k}[price_data][product_data][metadata][${mk}]`] = mv;
  });
  const dropIds = [...new Set(lines.map((x) => x.buy.drop?.id).filter(Boolean))];
  if (dropIds.length) {
    f['metadata[drop]'] = dropIds.join(',');
    f['payment_intent_data[metadata][drop]'] = dropIds.join(',');
  }
  if (latest) f['metadata[ship_by]'] = latest;
  if (lines.length === 1) { // single-item orders keep the pre-seed session fields too
    f['metadata[product]'] = lines[0].p.id;
    f['metadata[size]'] = lines[0].size;
    f['metadata[qty]'] = String(lines[0].qty);
  }
  return { params: f, ship_by: latest, mixed: !!mixed };
}
