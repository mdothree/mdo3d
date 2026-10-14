// Shared inventory master for every shop. Brand-agnostic: one file, the same fields and rules for all brands.
//
// Principal 2026-10-14, verbatim: "ensure the inventory management is unfiorm and even shared really. because
// realistically i will manage it all" and "and the inventory maangament must be proper also".
//
// inventory/inventory.csv (storefront root) is the editable master for status, price and per-SKU stock settings.
// inventory/ledger.csv is the append-only record of every stock movement (core/stock.mjs); on-hand stock is the
// replay of the ledger, and `stock` in the master must match it (tools/inventory.mjs check reconciles them).
// Product definitions (name, copy, images, print spec) stay in brands/<id>/catalog.json. The build merges the two
// and fails on any mismatch or rule violation. Drop membership (drops.json `products`) also comes from here.
//
// Columns: brand, product_id, variant, status, price_cents, fulfilment, stock, preorder_cap, low_stock, drop_id,
//          sales_record_channel, notes
// Two kinds of row:
//   product row  variant "-": status (required), price_cents (empty = Price TBA), drop_id, sales_record_channel,
//                notes. fulfilment/stock/preorder_cap/low_stock stay empty.
//   SKU row      variant "<colour>/<size>" (colour "-" when the product has no colours): one per sellable SKU
//                (SKU = brand/product/colour/size). fulfilment (required):
//                  stock     physical units on hand; `stock` = on hand (from the ledger), low_stock = alert threshold
//                  preorder  made to order after the drop closes; preorder_cap = optional unit cap
//                  pod       print-on-demand (Printful); no stock count
//                status empty (inherits) or sold_out (same sold_out rule). price/drop are inherited (left empty).
// Products that can be bought (available / preorder) need a SKU row for every colour × size.
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';

export const COLUMNS = Object.freeze(['brand', 'product_id', 'variant', 'status', 'price_cents', 'fulfilment', 'stock', 'preorder_cap', 'low_stock', 'drop_id', 'sales_record_channel', 'notes']);
export const INV_STATUSES = Object.freeze(['available', 'preorder', 'next_drop', 'in_development', 'archive', 'sold_out']);
export const FULFILMENT = Object.freeze(['stock', 'preorder', 'pod']);
/** Fields that live ONLY in the inventory; a catalog.json product carrying one is a build error. */
export const INVENTORY_FIELDS = Object.freeze(['status', 'price_cents', 'stock', 'sales_record', 'sold_count']);
export const inventoryPath = (root) => join(root, 'inventory', 'inventory.csv');
export const skuId = (brand, product, variant) => `${brand}/${product}/${variant}`;
export const variantsOf = (p) => {
  const cs = (p.colors ?? []).length ? p.colors.map((c) => c.id) : ['-'];
  const ss = (p.sizes ?? []).length ? p.sizes : ['-'];
  return cs.flatMap((c) => ss.map((s) => `${c}/${s}`));
};

// ---------- CSV (RFC 4180) ----------
export function parseCsvRaw(text) {
  const rows = [];
  let row = [], f = '', q = false;
  const s = text.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"' && s[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && s[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim() !== ''));
}
/** Parse a CSV with a header row into objects keyed by `cols` (extra columns are ignored, missing ones fail). */
export function parseCsv(text, cols = COLUMNS) {
  const rows = parseCsvRaw(text);
  if (!rows.length) return [];
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const missing = cols.filter((c) => !head.includes(c));
  if (missing.length) throw new Error(`CSV is missing columns: ${missing.join(', ')}`);
  return rows.slice(1).map((r) => Object.fromEntries(cols.map((c) => [c, (r[head.indexOf(c)] ?? '').trim()])));
}
export const csvCell = (v) => { const s = String(v ?? ''); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
/** extra: additional read-only columns for a spreadsheet export (e.g. name); import ignores them. */
export function toCsv(rows, cols = COLUMNS) {
  return `${cols.join(',')}\n${rows.map((r) => cols.map((c) => csvCell(r[c])).join(',')).join('\n')}${rows.length ? '\n' : ''}`;
}

export function readInventory(root) {
  const p = inventoryPath(root);
  if (!existsSync(p)) throw new Error(`inventory missing: ${p} (status, price and stock live there; see SEED.md "Inventory")`);
  return parseCsv(readFileSync(p, 'utf8'));
}
export function writeInventory(root, rows) {
  const p = inventoryPath(root);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(`${p}.tmp`, toCsv(rows));
  renameSync(`${p}.tmp`, p); // atomic replace
}

// ---------- validation ----------
const isInt = (v) => /^\d+$/.test(v);
const intOrEmpty = (v) => v === '' || isInt(v);

/** Rule errors for one brand's rows against its catalog + drops (catalog = raw catalog.json products). */
export function inventoryErrors(brandId, rows, catalog, drops = []) {
  const errs = [];
  const mine = rows.filter((r) => r.brand === brandId);
  const byId = new Map(catalog.map((p) => [p.id, p]));
  const dropIds = new Set(drops.map((d) => d.id));
  const seen = new Set();
  const productRow = new Map();
  for (const r of mine) if (r.variant === '-') productRow.set(r.product_id, r);
  for (const r of mine) {
    const at = `inventory ${r.brand}/${r.product_id}:${r.variant || '(empty)'}`;
    const key = `${r.product_id}:${r.variant}`;
    if (seen.has(key)) errs.push(`${at}: duplicate row`);
    seen.add(key);
    const p = byId.get(r.product_id);
    if (!p) { errs.push(`${at}: no product "${r.product_id}" in brands/${brandId}/catalog.json`); continue; }
    if (!r.variant) { errs.push(`${at}: variant is empty (use "-" for the product row, "<colour>/<size>" for a SKU)`); continue; }
    if (r.status && !INV_STATUSES.includes(r.status)) errs.push(`${at}: unknown status "${r.status}" (${INV_STATUSES.join(', ')})`);
    if (!intOrEmpty(r.price_cents) || r.price_cents === '0') errs.push(`${at}: price_cents must be a positive whole number of cents, or empty (Price TBA)`);
    for (const f of ['stock', 'preorder_cap', 'low_stock']) if (!intOrEmpty(r[f])) errs.push(`${at}: ${f} must be a whole number >= 0, or empty`);
    if (r.drop_id && !dropIds.has(r.drop_id)) errs.push(`${at}: drop "${r.drop_id}" is not in brands/${brandId}/drops.json`);
    if (r.variant === '-') {
      if (!r.status) errs.push(`${at}: status is required on the product row`);
      for (const f of ['fulfilment', 'stock', 'preorder_cap', 'low_stock']) if (r[f]) errs.push(`${at}: ${f} belongs on the SKU rows, not the product row`);
      if (r.status === 'sold_out' && !r.sales_record_channel) errs.push(`${at}: sold_out needs sales_record_channel (where the real sales happened). No fake scarcity.`);
      if (r.status === 'archive' && r.price_cents) errs.push(`${at}: archive pieces are not for sale (no price)`);
      if (r.status === 'archive' && !Number.isInteger(p.archive_year)) errs.push(`${at}: archive needs archive_year in the catalog (pieces that really existed only)`);
      if (r.status === 'preorder' && !r.drop_id) errs.push(`${at}: preorder needs a drop_id`);
      continue;
    }
    // SKU row
    if (!variantsOf(p).includes(r.variant)) errs.push(`${at}: "${r.variant}" is not a colour/size of ${r.product_id} (one of ${variantsOf(p).slice(0, 4).join(', ')}…)`);
    if (!FULFILMENT.includes(r.fulfilment)) errs.push(`${at}: fulfilment must be ${FULFILMENT.join(' | ')}`);
    if (r.status && r.status !== 'sold_out') errs.push(`${at}: a SKU's status is empty (inherits) or sold_out`);
    if (r.price_cents) errs.push(`${at}: per-SKU prices are not supported (leave price empty to inherit)`);
    if (r.drop_id) errs.push(`${at}: drop_id belongs on the product row`);
    if (r.fulfilment !== 'stock' && (r.stock || r.low_stock)) errs.push(`${at}: stock/low_stock only apply to fulfilment "stock"`);
    if (r.fulfilment !== 'preorder' && r.preorder_cap) errs.push(`${at}: preorder_cap only applies to fulfilment "preorder"`);
    if (r.status === 'sold_out') {
      if (!r.sales_record_channel && !productRow.get(r.product_id)?.sales_record_channel) errs.push(`${at}: sold_out needs sales_record_channel. No fake scarcity.`);
      if (r.stock && r.stock !== '0') errs.push(`${at}: sold_out with stock ${r.stock} > 0`);
    }
    const pr = productRow.get(r.product_id);
    if (pr?.status === 'preorder' && r.fulfilment !== 'preorder') errs.push(`${at}: a preorder product's SKUs use fulfilment "preorder"`);
    if (pr?.status === 'available' && r.fulfilment === 'preorder') errs.push(`${at}: an available product's SKUs use fulfilment "stock" or "pod"`);
  }
  for (const p of catalog) {
    const pr = productRow.get(p.id);
    if (!pr) errs.push(`brands/${brandId}/catalog.json ${p.id}: no inventory row (run: node tools/inventory.mjs set ${brandId}/${p.id} status=in_development)`);
    const owned = INVENTORY_FIELDS.filter((f) => f in p);
    if (owned.length) errs.push(`brands/${brandId}/catalog.json ${p.id}: ${owned.join(', ')} belong in inventory/inventory.csv, not the catalog`);
    if (pr && ['available', 'preorder'].includes(pr.status)) {
      const have = new Set(mine.filter((x) => x.product_id === p.id && x.variant !== '-').map((x) => x.variant));
      const miss = variantsOf(p).filter((v) => !have.has(v));
      if (miss.length) errs.push(`inventory ${brandId}/${p.id}: ${pr.status} needs a SKU row for every colour/size; missing ${miss.join(', ')}`);
    }
  }
  for (const d of drops) if ('products' in d) errs.push(`brands/${brandId}/drops.json ${d.id}: drop membership comes from inventory drop_id; remove "products"`);
  return errs;
}

/** Merge: catalog products + the brand's rows -> products with status/price/sales_record and `skus`, and drops
 *  with `products` filled from drop_id. Throws on any error. Internal fields (sales_record, stock) never reach the
 *  browser (publicCatalog whitelists). */
export function mergeInventory(brandId, rows, catalog, drops = []) {
  const errs = inventoryErrors(brandId, rows, catalog, drops);
  if (errs.length) throw new Error(`inventory invalid:\n  ${errs.join('\n  ')}`);
  const mine = rows.filter((r) => r.brand === brandId);
  const products = catalog.map((p) => {
    const r = mine.find((x) => x.product_id === p.id && x.variant === '-');
    const out = { ...p, status: r.status, price_cents: r.price_cents ? Number(r.price_cents) : null };
    if (r.sales_record_channel) out.sales_record = { channel: r.sales_record_channel, note: r.notes };
    out.skus = Object.fromEntries(mine.filter((x) => x.product_id === p.id && x.variant !== '-').map((x) => [x.variant, {
      fulfilment: x.fulfilment, stock: x.stock === '' ? 0 : Number(x.stock), cap: x.preorder_cap === '' ? null : Number(x.preorder_cap),
      low: x.low_stock === '' ? null : Number(x.low_stock), sold_out: x.status === 'sold_out',
    }]));
    return out;
  });
  const mergedDrops = drops.map((d) => ({ ...d, products: mine.filter((x) => x.variant === '-' && x.drop_id === d.id).map((x) => x.product_id) }));
  return { products, drops: mergedDrops };
}

/** Errors across the whole file: rows for brands that don't exist, plus every brand's own errors.
 *  brands: {id: {catalog, drops}} (raw catalog.json products / drops.json drops). */
export function checkAll(rows, brands) {
  const errs = [];
  for (const r of rows) if (!brands[r.brand]) errs.push(`inventory ${r.brand}/${r.product_id}:${r.variant}: unknown brand "${r.brand}"`);
  for (const [id, b] of Object.entries(brands)) errs.push(...inventoryErrors(id, rows, b.catalog, b.drops));
  return errs;
}

/** Stable order: brand, then catalog order, product row before its SKUs (colour, then size order). */
export function sortRows(rows, brands) {
  const pIdx = (r) => (brands[r.brand]?.catalog ?? []).findIndex((p) => p.id === r.product_id);
  const vIdx = (r) => { const p = (brands[r.brand]?.catalog ?? []).find((x) => x.id === r.product_id); return r.variant === '-' ? -1 : p ? variantsOf(p).indexOf(r.variant) : 999; };
  return [...rows].sort((a, b) => a.brand.localeCompare(b.brand) || pIdx(a) - pIdx(b) || vIdx(a) - vIdx(b));
}
