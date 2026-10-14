// Cart logic shared by the browser (bundled into seed.js by core/build.mjs) and Node (tests, checkout).
// RULES for this file: no imports, no Node or DOM APIs, plain functions only. The build strips the
// `export` keywords and wraps it in an IIFE, so it must also be valid as a classic script.

export const CART_LIMITS = { maxQty: 5, maxLines: 10 };

export function lineKey(l) {
  return [l.product, l.size || '', l.color || ''].join('|');
}

/** Clean whatever came out of storage into [{product, size, color, qty}]. Drops junk, merges duplicates. */
export function normaliseCart(raw, limits) {
  const lim = limits || CART_LIMITS;
  const out = [];
  if (!Array.isArray(raw)) return out;
  for (const r of raw) {
    if (!r || typeof r.product !== 'string' || !r.product) continue;
    const qty = Math.floor(Number(r.qty));
    if (!(qty >= 1)) continue;
    const line = { product: r.product, size: typeof r.size === 'string' ? r.size : '', color: typeof r.color === 'string' ? r.color : '', qty: Math.min(qty, lim.maxQty) };
    const hit = out.find((x) => lineKey(x) === lineKey(line));
    if (hit) hit.qty = Math.min(hit.qty + line.qty, lim.maxQty);
    else if (out.length < lim.maxLines) out.push(line);
  }
  return out;
}

/** Add a line (or increase an existing one). Returns {cart, ok, error?}; never mutates the input. */
export function addLine(cart, line, limits) {
  const lim = limits || CART_LIMITS;
  const next = normaliseCart(cart, lim);
  const add = normaliseCart([Object.assign({ qty: 1 }, line)], lim)[0];
  if (!add) return { cart: next, ok: false, error: 'That item could not be added.' };
  const hit = next.find((x) => lineKey(x) === lineKey(add));
  if (hit) {
    if (hit.qty >= lim.maxQty) return { cart: next, ok: false, error: 'You have the most we allow per order of that item (' + lim.maxQty + ').' };
    hit.qty = Math.min(hit.qty + add.qty, lim.maxQty);
    return { cart: next, ok: true };
  }
  if (next.length >= lim.maxLines) return { cart: next, ok: false, error: 'Your bag is full (' + lim.maxLines + ' items).' };
  next.push(add);
  return { cart: next, ok: true };
}

export function setQty(cart, key, qty, limits) {
  const lim = limits || CART_LIMITS;
  const q = Math.floor(Number(qty));
  return normaliseCart(cart, lim)
    .map((l) => (lineKey(l) === key ? Object.assign({}, l, { qty: Math.min(q, lim.maxQty) }) : l))
    .filter((l) => l.qty >= 1);
}

export function removeLine(cart, key) {
  return normaliseCart(cart).filter((l) => lineKey(l) !== key);
}

export function cartCount(cart) {
  return normaliseCart(cart).reduce((n, l) => n + l.qty, 0);
}

export function fmtDay(d) {
  if (!d) return '';
  return new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

/** The whole order ships when its latest item is ready.
 *  items: [{preorder: bool, ship_by: 'YYYY-MM-DD'|null, drop: id|null}]
 *  -> null (nothing on pre-order) or {latest, pending, mixed, text}. */
export function shipNotice(items) {
  const pre = items.filter((i) => i.preorder);
  if (!pre.length) return null;
  const inStock = items.length - pre.length;
  const drops = pre.map((i) => i.drop || '').filter((d, i, a) => a.indexOf(d) === i);
  const pending = pre.some((i) => !i.ship_by);
  const latest = pre.map((i) => i.ship_by).filter(Boolean).sort().pop() || null;
  const mixed = inStock > 0 || drops.length > 1;
  let text;
  if (pending) {
    text = 'Your bag includes pre-order pieces. Their ship-by date is set when the pre-order window opens, and the whole order ships together when its latest item is ready.';
  } else if (mixed) {
    text = 'Your bag mixes ' + (inStock > 0 ? 'in-stock and pre-order pieces' : 'pieces from more than one drop') + '. Everything ships together by ' + fmtDay(latest) + ', when the latest item is ready.';
  } else {
    text = 'Pre-order. Ships by ' + fmtDay(latest) + '.';
  }
  return { latest: latest, pending: pending, mixed: mixed, text: text };
}

/** Join the cart with the public catalog (window.SEED.products or the build's data).
 *  Unknown products are flagged so the page can offer to remove them. */
export function summarise(cart, products) {
  const lines = normaliseCart(cart).map((l) => {
    const p = products[l.product];
    if (!p) return Object.assign({}, l, { key: lineKey(l), name: l.product, unavailable: true, price_cents: null, line_cents: null, preorder: false, ship_by: null, drop: null });
    const price = Number.isInteger(p.price_cents) ? p.price_cents : null;
    const color = (p.colors || []).find((c) => c.id === l.color);
    return Object.assign({}, l, {
      key: lineKey(l), name: p.name, url: p.url, image: p.image, colorName: color ? color.name : '',
      unavailable: !p.canAdd, price_cents: price, line_cents: price === null ? null : price * l.qty,
      preorder: !!p.preorder, ship_by: p.ship_by || null, drop: p.drop || null,
    });
  });
  const known = lines.every((l) => l.line_cents !== null);
  return {
    lines: lines,
    count: lines.reduce((n, l) => n + l.qty, 0),
    subtotal_cents: known && lines.length ? lines.reduce((n, l) => n + l.line_cents, 0) : null,
    notice: shipNotice(lines),
  };
}

/** What the browser POSTs to /api/checkout. Prices never travel from the client. */
export function checkoutBody(brandId, cart) {
  return { brand: brandId, lines: normaliseCart(cart).map((l) => ({ product: l.product, size: l.size, color: l.color, qty: l.qty })) };
}
