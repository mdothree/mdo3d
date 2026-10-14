// Stock control for every shop: an append-only ledger, replayable stock, reservations that stop overselling.
// Brand-agnostic. Storage is files on one host for now (see SEED.md "Inventory" for the database move).
//
// inventory/ledger.csv  one movement per row, never edited or deleted:
//   id, ts, sku, kind, qty, fulfilment, ref, order, reason, expires_at
//   kind  receive   +qty on hand (supplier delivery; ref = PO)
//         sale      a paid order line. fulfilment stock: -qty on hand; preorder: +qty owed to customers; pod: count only.
//                   Closes the reservation with the same ref + sku.
//         reserve   holds qty while a checkout is open (ref = reservation id, expires_at = hold end)
//         release   ends a hold early (checkout expired/cancelled, or the expiry sweep); ref = reservation id
//         adjust    +/-qty on hand, reason required (count correction, damage, samples)
//         return    +qty on hand (customer return restocked; order = order ref)
//         fulfil    pre-orders shipped from received stock: -qty on hand, -qty owed
//   sku   brand/product/colour/size (colour "-" when the product has no colours)
// Current stock = replay(ledger). inventory.csv `stock` mirrors it; every writer here updates both under one lock,
// and tools/inventory.mjs check fails when they drift (a hand edit that skipped the ledger).
import { promises as fsp, existsSync, readFileSync, mkdirSync, statSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { parseCsv, toCsv, csvCell, inventoryPath, writeInventory } from './inventory.mjs';

export const LEDGER_COLUMNS = Object.freeze(['id', 'ts', 'sku', 'kind', 'qty', 'fulfilment', 'ref', 'order', 'reason', 'expires_at']);
export const KINDS = Object.freeze(['receive', 'sale', 'reserve', 'release', 'adjust', 'return', 'fulfil']);
export const HOLD_MS = 30 * 60 * 1000; // Stripe Checkout's shortest session; the hold lasts as long as the session
export const ledgerPath = (root) => join(root, 'inventory', 'ledger.csv');
export const variantKey = (color, size) => `${color || '-'}/${size || '-'}`;
export const splitSku = (sku) => { const [brand, product, color, size] = sku.split('/'); return { brand, product, variant: `${color}/${size}` }; };
const newId = (now) => `mv_${now.getTime().toString(36)}_${randomBytes(4).toString('hex')}`;

export function readLedger(root) {
  const p = ledgerPath(root);
  return existsSync(p) ? parseCsv(readFileSync(p, 'utf8'), LEDGER_COLUMNS) : [];
}

/** Replay movements -> Map sku -> {on_hand, reserved, sold, preorder_sold, owed, received, holds}. Pure. */
export function replay(ledger, now = new Date()) {
  const t = now.getTime();
  const st = new Map();
  const get = (sku) => { if (!st.has(sku)) st.set(sku, { on_hand: 0, reserved: 0, sold: 0, preorder_sold: 0, owed: 0, received: 0, holds: new Map() }); return st.get(sku); };
  for (const m of ledger) {
    const s = get(m.sku);
    const q = Number(m.qty);
    switch (m.kind) {
      case 'receive': s.on_hand += q; s.received += q; break;
      case 'adjust': s.on_hand += q; break;
      case 'return': s.on_hand += q; break;
      case 'fulfil': s.on_hand -= q; s.owed -= q; break;
      case 'sale':
        s.sold += q;
        if (m.fulfilment === 'stock') s.on_hand -= q;
        if (m.fulfilment === 'preorder') { s.preorder_sold += q; s.owed += q; }
        if (m.ref) s.holds.delete(m.ref);
        break;
      case 'reserve': s.holds.set(m.ref, { qty: q, expires: Date.parse(m.expires_at) }); break;
      case 'release': s.holds.delete(m.ref); break;
      default: break;
    }
  }
  for (const s of st.values()) {
    for (const [ref, h] of s.holds) if (!(h.expires > t)) s.holds.delete(ref); // an expired hold is released
    s.reserved = [...s.holds.values()].reduce((a, h) => a + h.qty, 0);
  }
  return st;
}
const EMPTY = Object.freeze({ on_hand: 0, reserved: 0, sold: 0, preorder_sold: 0, owed: 0, received: 0, holds: new Map() });

/** What a shopper can buy of one SKU now. sku = merged SKU settings {fulfilment, cap, low, sold_out}.
 *  state: in_stock | low | preorder | pod | sold_out | preorder_full | not_in_stock.
 *  `left` is set only when it is true and worth saying (stock at or under the SKU's low-stock threshold). */
export function availability(sku, s = EMPTY) {
  if (!sku) return { state: 'not_in_stock', available: 0, left: null };
  if (sku.sold_out) return { state: 'sold_out', available: 0, left: null };
  if (sku.fulfilment === 'pod') return { state: 'pod', available: Infinity, left: null };
  if (sku.fulfilment === 'preorder') {
    if (sku.cap == null) return { state: 'preorder', available: Infinity, left: null };
    const a = sku.cap - s.preorder_sold - s.reserved;
    return a > 0 ? { state: 'preorder', available: a, left: null } : { state: 'preorder_full', available: 0, left: null };
  }
  const a = s.on_hand - s.reserved;
  if (a <= 0) return { state: s.sold > 0 ? 'sold_out' : 'not_in_stock', available: 0, left: null };
  if (sku.low != null && a <= sku.low) return { state: 'low', available: a, left: a };
  return { state: 'in_stock', available: a, left: null };
}
export const AVAIL_TEXT = Object.freeze({ in_stock: 'In stock', pod: 'Made to order', preorder: 'Pre-order', preorder_full: 'Pre-order full', sold_out: 'Sold out', not_in_stock: 'Not in stock yet' });
export const availText = (a) => (a.state === 'low' ? `Only ${a.left} left` : AVAIL_TEXT[a.state]);

// ---------- file lock (single host) ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function withLock(root, fn, { timeoutMs = 10_000, staleMs = 30_000 } = {}) {
  const lock = join(root, 'inventory', '.lock');
  mkdirSync(join(root, 'inventory'), { recursive: true });
  const t0 = Date.now();
  for (;;) {
    try { await fsp.mkdir(lock); break; } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      try { if (Date.now() - statSync(lock).mtimeMs > staleMs) rmSync(lock, { recursive: true, force: true }); } catch { /* gone */ }
      if (Date.now() - t0 > timeoutMs) throw new Error('inventory is busy (lock timeout)');
      await sleep(3 + Math.random() * 12);
    }
  }
  try { return await fn(); } finally { rmSync(lock, { recursive: true, force: true }); }
}

async function readAll(root) {
  const inv = existsSync(inventoryPath(root)) ? parseCsv(await fsp.readFile(inventoryPath(root), 'utf8')) : [];
  const lp = ledgerPath(root);
  const ledger = existsSync(lp) ? parseCsv(await fsp.readFile(lp, 'utf8'), LEDGER_COLUMNS) : [];
  return { inv, ledger };
}
async function append(root, rows) {
  const lp = ledgerPath(root);
  const head = existsSync(lp) ? '' : `${LEDGER_COLUMNS.join(',')}\n`;
  await fsp.appendFile(lp, head + rows.map((r) => LEDGER_COLUMNS.map((c) => csvCell(r[c])).join(',')).join('\n') + '\n');
}
/** Master SKU settings for a sku id, from inventory rows. */
export function skuSettings(inv, sku) {
  const { brand, product, variant } = splitSku(sku);
  const r = inv.find((x) => x.brand === brand && x.product_id === product && x.variant === variant);
  const pr = inv.find((x) => x.brand === brand && x.product_id === product && x.variant === '-');
  if (!r || !pr) return null;
  const buyable = ['available', 'preorder'].includes(pr.status);
  return { fulfilment: r.fulfilment, cap: r.preorder_cap === '' ? null : Number(r.preorder_cap), low: r.low_stock === '' ? null : Number(r.low_stock), sold_out: r.status === 'sold_out' || pr.status === 'sold_out', buyable, row: r };
}
/** Mirror replayed on-hand into inventory.csv `stock` for stock SKUs. */
function mirror(root, inv, state) {
  let changed = false;
  for (const r of inv) {
    if (r.variant === '-' || r.fulfilment !== 'stock') continue;
    const s = state.get(`${r.brand}/${r.product_id}/${r.variant}`);
    const v = String(s ? s.on_hand : 0);
    if ((r.stock || '0') !== v) { r.stock = v; changed = true; }
  }
  if (changed) writeInventory(root, inv);
}

// ---------- operations (each runs under the lock) ----------

/** Hold stock for a checkout. lines: [{sku, qty}]. All-or-nothing. */
export function reserve(root, { lines, ref, now = new Date(), holdMs = HOLD_MS }) {
  return withLock(root, async () => {
    const { inv, ledger } = await readAll(root);
    const state = replay(ledger, now);
    const want = new Map();
    for (const l of lines) want.set(l.sku, (want.get(l.sku) ?? 0) + Number(l.qty));
    for (const [sku, q] of want) {
      const set = skuSettings(inv, sku);
      if (!set) return { ok: false, sku, reason: 'unknown SKU', available: 0 };
      if (!set.buyable) return { ok: false, sku, reason: 'not on sale', available: 0 };
      const a = availability(set, state.get(sku));
      if (a.available < q) return { ok: false, sku, reason: a.available > 0 ? `only ${a.available} available` : AVAIL_TEXT[a.state] ?? a.state, available: a.available };
    }
    const expires_at = new Date(now.getTime() + holdMs).toISOString();
    await append(root, [...want].map(([sku, q]) => ({ id: newId(now), ts: now.toISOString(), sku, kind: 'reserve', qty: q, fulfilment: skuSettings(inv, sku).fulfilment, ref, expires_at })));
    return { ok: true, ref, expires_at };
  });
}

/** End a hold (checkout expired or cancelled). Idempotent. */
export function release(root, { ref, reason = 'checkout ended', now = new Date() }) {
  return withLock(root, async () => {
    const { ledger } = await readAll(root);
    const open = new Map();
    for (const m of ledger) {
      if (m.ref !== ref) continue;
      if (m.kind === 'reserve') open.set(m.sku, m);
      if (m.kind === 'release' || m.kind === 'sale') open.delete(m.sku);
    }
    if (!open.size) return { ok: true, released: 0 };
    await append(root, [...open.values()].map((m) => ({ id: newId(now), ts: now.toISOString(), sku: m.sku, kind: 'release', qty: m.qty, fulfilment: m.fulfilment, ref, reason })));
    return { ok: true, released: open.size };
  });
}

/** Write release rows for holds that have expired (the shop already treats them as released; this records it). */
export function releaseExpired(root, { now = new Date() } = {}) {
  return withLock(root, async () => {
    const { ledger } = await readAll(root);
    const open = new Map();
    for (const m of ledger) {
      const k = `${m.ref}|${m.sku}`;
      if (m.kind === 'reserve') open.set(k, m);
      if ((m.kind === 'release' || m.kind === 'sale') && m.ref) open.delete(k);
    }
    const due = [...open.values()].filter((m) => !(Date.parse(m.expires_at) > now.getTime()));
    if (due.length) await append(root, due.map((m) => ({ id: newId(now), ts: now.toISOString(), sku: m.sku, kind: 'release', qty: m.qty, fulfilment: m.fulfilment, ref: m.ref, reason: 'expired' })));
    return { released: due.length };
  });
}

/** A paid order: reservation -> sale, stock decremented. Idempotent on `order` (a repeat is a no-op).
 *  Returns lowAlerts: SKUs this order took to or below their low-stock threshold. */
export function commitSale(root, { order, ref, lines, now = new Date() }) {
  return withLock(root, async () => {
    const { inv, ledger } = await readAll(root);
    if (ledger.some((m) => m.kind === 'sale' && m.order === order)) return { ok: true, duplicate: true, lowAlerts: [] };
    const before = replay(ledger, now);
    const rows = lines.map((l) => ({ id: newId(now), ts: now.toISOString(), sku: l.sku, kind: 'sale', qty: Number(l.qty), fulfilment: skuSettings(inv, l.sku)?.fulfilment ?? 'stock', ref: ref ?? '', order }));
    await append(root, rows);
    const after = replay([...ledger, ...rows], now);
    mirror(root, inv, after);
    const lowAlerts = [];
    for (const sku of new Set(lines.map((l) => l.sku))) {
      const set = skuSettings(inv, sku);
      if (!set || set.fulfilment !== 'stock') continue;
      const b = before.get(sku)?.on_hand ?? 0;
      const a = after.get(sku)?.on_hand ?? 0;
      if ((set.low != null && a <= set.low && b > set.low) || (a <= 0 && b > 0)) lowAlerts.push({ sku, before: b, after: a, low: set.low });
      else if (a < 0) lowAlerts.push({ sku, before: b, after: a, low: set.low, oversold: true });
    }
    return { ok: true, duplicate: false, lowAlerts };
  });
}

function stockMove(kind, need) {
  return (root, { sku, qty, ref = '', order = '', reason = '', now = new Date() }) => withLock(root, async () => {
    const { inv, ledger } = await readAll(root);
    const set = skuSettings(inv, sku);
    if (!set) throw new Error(`unknown SKU ${sku} (add its row to inventory.csv first)`);
    const q = Number(qty);
    if (!Number.isInteger(q) || q === 0 || (kind !== 'adjust' && q < 0)) throw new Error(`${kind}: qty must be a whole number${kind === 'adjust' ? ' (+/-)' : ' > 0'}`);
    for (const f of need) if (!({ ref, order, reason })[f]) throw new Error(`${kind}: ${f} is required`);
    if (kind === 'fulfil') {
      const s = replay(ledger, now).get(sku) ?? EMPTY;
      if (q > s.owed) throw new Error(`fulfil: only ${s.owed} pre-order units are owed on ${sku}`);
      if (q > s.on_hand) throw new Error(`fulfil: only ${s.on_hand} on hand for ${sku} (receive the PO first)`);
    }
    const row = { id: newId(now), ts: now.toISOString(), sku, kind, qty: q, fulfilment: set.fulfilment, ref, order, reason };
    await append(root, [row]);
    const state = replay([...ledger, row], now);
    mirror(root, inv, state);
    return { ok: true, sku, ...(({ on_hand, reserved, owed }) => ({ on_hand, reserved, owed }))(state.get(sku)) };
  });
}
export const receive = stockMove('receive', ['ref']);
export const adjust = stockMove('adjust', ['reason']);
export const returnUnits = stockMove('return', ['order']);
export const fulfil = stockMove('fulfil', []);

/** Reconcile inventory.csv `stock` against the ledger: errors for drift and for ledger SKUs with no master row. */
export function reconcile(inv, ledger, now = new Date()) {
  const errs = [];
  const state = replay(ledger, now);
  const known = new Set(inv.filter((r) => r.variant !== '-').map((r) => `${r.brand}/${r.product_id}/${r.variant}`));
  for (const r of inv) {
    if (r.variant === '-' || r.fulfilment !== 'stock') continue;
    const sku = `${r.brand}/${r.product_id}/${r.variant}`;
    const on = state.get(sku)?.on_hand ?? 0;
    if (Number(r.stock || 0) !== on) errs.push(`${sku}: inventory.csv stock ${r.stock || 0} but the ledger replays to ${on} (use receive/adjust/return, or import with a reason)`);
  }
  for (const sku of state.keys()) if (!known.has(sku)) errs.push(`${sku}: in the ledger but not in inventory.csv`);
  for (const m of ledger) if (!KINDS.includes(m.kind)) errs.push(`ledger ${m.id}: unknown kind "${m.kind}"`);
  return errs;
}

export { toCsv };
