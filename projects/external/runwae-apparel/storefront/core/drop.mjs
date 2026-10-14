// Drop maths shared by the site build, the checkout function and the CLI toolkit (universal seed core).
// Pure functions only: no network, no filesystem. Everything here is unit-tested.

const DAY = 86_400_000;

/** Default schedule after a pre-order window closes (days). Conservative on purpose:
 *  the ship-by date is a legal promise (FTC Mail Order Rule), so we quote the slow end. */
export const DEFAULT_SCHEDULE = Object.freeze({
  productionDays: 28, // ~2–4 wk once samples are approved -> quote 4
  freightDays: 7,     // air courier, ~1 wk
  receivingDays: 7,   // count the carton, pack, label
  safetyDays: 7,      // customs holds, defects
  noticeLeadDays: 3,  // send any delay notice at least this long before ship-by passes
});

export function toDate(d) {
  const x = d instanceof Date ? new Date(d.getTime()) : new Date(d);
  if (Number.isNaN(x.getTime())) throw new Error(`bad date: ${d}`);
  return x;
}

export const isoDay = (d) => toDate(d).toISOString().slice(0, 10);

/** Ship-by date = window close + production + freight + receiving + safety. */
export function shipBy(closeDate, schedule = {}) {
  const s = { ...DEFAULT_SCHEDULE, ...schedule };
  const days = s.productionDays + s.freightDays + s.receivingDays + s.safetyDays;
  const shipByDate = new Date(toDate(closeDate).getTime() + days * DAY);
  const noticeBy = new Date(shipByDate.getTime() - s.noticeLeadDays * DAY);
  return { shipBy: isoDay(shipByDate), noticeBy: isoDay(noticeBy), daysAfterClose: days };
}

/** Window state for a drop at `now`: 'unscheduled' | 'upcoming' | 'open' | 'closed'. */
export function windowState(drop, now = new Date()) {
  const w = drop?.window ?? {};
  if (!w.open || !w.close) return 'unscheduled';
  const t = toDate(now).getTime();
  if (t < toDate(w.open).getTime()) return 'upcoming';
  if (t < toDate(w.close).getTime()) return 'open';
  return 'closed';
}

/** Validate a window: 2–3 weeks per the playbook (warn, don't block, outside 14–21 days). */
export function checkWindow(drop) {
  const w = drop?.window ?? {};
  if (!w.open || !w.close) return { ok: false, errors: ['window open/close not set'], warnings: [] };
  const len = (toDate(w.close) - toDate(w.open)) / DAY;
  const errors = len <= 0 ? ['close must be after open'] : [];
  const warnings = len > 0 && (len < 14 || len > 21) ? [`window is ${len} days; playbook says 14–21`] : [];
  return { ok: errors.length === 0, errors, warnings, days: len };
}

/** Normalise paid orders into line items {id, product, size, qty, drop}.
 *  Accepts:
 *   - Stripe Checkout Session objects listed with `expand[]=data.line_items&expand[]=data.line_items.data.price.product`:
 *     each line's metadata (set by core/checkout.mjs) sits on price.product.metadata. Multi-line orders give one row per line.
 *   - legacy single-item sessions (metadata on the session itself),
 *   - our own rows: {product,size,qty,status} or {status, lines:[{product,size,qty,drop}]}. */
export function normaliseOrders(rows) {
  const out = [];
  for (const r of rows) {
    if (r.object === 'checkout.session') {
      if (r.payment_status !== 'paid') continue;
      const email = r.customer_details?.email ?? null;
      const items = r.line_items?.data;
      if (Array.isArray(items) && items.length) {
        for (const li of items) {
          const m = li.price?.product?.metadata ?? li.metadata ?? {};
          if (m.refunded === 'true') continue;
          out.push({ id: r.id, product: m.product, size: m.size, qty: Number(li.quantity ?? m.qty ?? 1), drop: m.drop || null, email });
        }
        continue;
      }
      const m = r.metadata ?? {};
      if (m.refunded === 'true') continue;
      out.push({ id: r.id, product: m.product, size: m.size, qty: Number(m.qty ?? 1), drop: m.drop || null, email });
    } else if (Array.isArray(r.lines)) {
      if (r.status && r.status !== 'paid') continue;
      for (const l of r.lines) out.push({ id: r.id ?? null, product: l.product, size: l.size, qty: Number(l.qty ?? 1), drop: l.drop ?? null, email: r.email ?? null });
    } else {
      if (r.status && r.status !== 'paid') continue;
      out.push({ id: r.id ?? null, product: r.product, size: r.size, qty: Number(r.qty ?? 1), drop: r.drop ?? null, email: r.email ?? null });
    }
  }
  for (const o of out) {
    if (!o.product || !o.size || !Number.isInteger(o.qty) || o.qty < 1) throw new Error(`bad order row: ${JSON.stringify(o)}`);
  }
  return out;
}

/** Tally line items by product × size. */
export function tally(lines) {
  const t = {};
  for (const { product, size, qty } of lines) {
    t[product] ??= {};
    t[product][size] = (t[product][size] ?? 0) + qty;
  }
  return t;
}

const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);

/** Supplier PO from a tally: per-size quantity plus a buffer (default 10%, at least 1 extra
 *  per design so there's always a swap spare), checked against MOQ per design.
 *  moq: number (all designs) or {productId: number}. Designs under MOQ are flagged, not ordered. */
export function purchaseOrder(t, { buffer = 0.10, moq = 0, sizeOrder = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'] } = {}) {
  const rows = [];
  for (const [product, sizes] of Object.entries(t)) {
    const sold = sum(sizes);
    const min = typeof moq === 'number' ? moq : (moq[product] ?? 0);
    const order = {};
    for (const [size, n] of Object.entries(sizes)) order[size] = Math.ceil(n * (1 + buffer));
    // Guarantee at least one spare per design: add it to the best-selling size.
    if (sum(order) === sold && sold > 0) {
      const top = Object.entries(sizes).sort((a, b) => b[1] - a[1])[0][0];
      order[top] += 1;
    }
    const ordered = sum(order);
    const meetsMoq = ordered >= min;
    rows.push({
      product, sold, ordered, moq: min, meetsMoq,
      action: meetsMoq ? 'order' : 'below MOQ: refund in full or offer a swap',
      sizes: Object.fromEntries(Object.entries(order).sort((a, b) => sizeRank(a[0], sizeOrder) - sizeRank(b[0], sizeOrder))),
    });
  }
  return rows.sort((a, b) => a.product.localeCompare(b.product));
}

const sizeRank = (s, order) => (order.indexOf(s) === -1 ? 99 : order.indexOf(s));

/** Landed cost per unit and a suggested price.
 *  Duty is charged on the goods value (FOB), not on freight. Rates move: re-check each drop. */
export function landedCost({
  unitCost, qty, freightTotal = 0, dutyRate = 0.165, surchargeRate = 0.10,
  packagingPerUnit = 0, postagePerUnit = 0, sampleCostTotal = 0,
  targetMargin = 0.5, stripePct = 0.029, stripeFixed = 0.30, taxFeePct = 0.005,
}) {
  if (!(unitCost > 0) || !(qty > 0)) throw new Error('unitCost and qty must be > 0');
  const goods = unitCost * qty;
  const duty = goods * (dutyRate + surchargeRate);
  const perUnit = (goods + duty + freightTotal + sampleCostTotal) / qty + packagingPerUnit + postagePerUnit;
  // price p such that p - fees(p) - perUnit = targetMargin * p
  const price = (perUnit + stripeFixed) / (1 - stripePct - taxFeePct - targetMargin);
  const r2 = (x) => Math.round(x * 100) / 100;
  return {
    goods: r2(goods), duty: r2(duty), landedPerUnit: r2(perUnit),
    suggestedPrice: r2(price), suggestedPriceRounded: r2(Math.ceil(price + 0.01) - 0.01), // next x.99 at or above
    feesAtPrice: r2(price * (stripePct + taxFeePct) + stripeFixed),
  };
}

/** Statuses that can be sold. 'live' is the pre-seed spelling (sold now, or as a pre-order when channel is 'preorder'). */
export const SELLABLE = Object.freeze(['available', 'preorder', 'live']);

/** Find a product's purchasable state. Returns {ok, reason, drop?, price_cents?}.
 *  This is the gate the checkout function re-checks server-side; the page only displays it. */
export function purchasable(product, drops, now = new Date()) {
  if (!product) return { ok: false, reason: 'unknown product' };
  if (product.rights_hold) return { ok: false, reason: 'rights hold' };
  if (!SELLABLE.includes(product.status)) return { ok: false, reason: 'not released' };
  if (!Number.isInteger(product.price_cents) || product.price_cents <= 0) return { ok: false, reason: 'no price' };
  const preorder = product.status === 'preorder' || (product.status === 'live' && product.channel === 'preorder');
  if (!preorder) return { ok: true, price_cents: product.price_cents };
  const drop = (drops ?? []).find((d) => d.products.includes(product.id) && windowState(d, now) === 'open');
  if (!drop) return { ok: false, reason: 'pre-order window not open' };
  return { ok: true, price_cents: product.price_cents, drop };
}
