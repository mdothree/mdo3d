#!/usr/bin/env node
// Inventory for every shop, one file (inventory/inventory.csv) + one ledger (inventory/ledger.csv). See SEED.md "Inventory".
//
//   node tools/inventory.mjs list [--brand glb] [--status preorder] [--alerts]
//   node tools/inventory.mjs set <brand>/<product>[:<colour>/<size>] status=preorder price=48 drop=first-drop
//        keys: status, price (dollars; "" or TBA = Price TBA), price_cents, fulfilment (stock|preorder|pod), cap,
//              low, drop, channel (sales_record_channel), notes. Creates the row if the product/SKU exists.
//              Stock is never set by hand: use receive / adjust / return.
//   node tools/inventory.mjs receive <brand>/<product>/<colour>/<size> qty=24 po=PO-0012 [reason=…]
//   node tools/inventory.mjs adjust  <sku> qty=-2 reason="damaged in receiving"
//   node tools/inventory.mjs return  <sku> qty=1 order=RW-AB12CD34 [reason=…]
//   node tools/inventory.mjs fulfil  <sku> qty=10 [ref=…]          ship owed pre-orders from received stock
//   node tools/inventory.mjs fulfil-drop <brand>/<drop-id>          every owed pre-order in a drop, up to stock on hand
//   node tools/inventory.mjs release-expired                       record releases for lapsed checkout holds
//   node tools/inventory.mjs export <file.csv>                     master for a spreadsheet (+ read-only name column)
//   node tools/inventory.mjs export-stock <file.csv> | export-ledger <file.csv>
//   node tools/inventory.mjs import <file.csv> [reason="cycle count"]   validated; stock changes become adjust movements
//   node tools/inventory.mjs check                                 rules + catalog match + ledger reconcile (exit 1 on errors)
// Root: --root <dir> (default: the storefront folder). Every write validates the whole file first.
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readInventory, writeInventory, parseCsv, toCsv, checkAll, sortRows, COLUMNS, variantsOf } from '../core/inventory.mjs';
import { readLedger, replay, reconcile, receive, adjust, returnUnits, fulfil, releaseExpired, withLock, LEDGER_COLUMNS, ledgerPath } from '../core/stock.mjs';
import { rawBrands, stockReport, STOCK_COLUMNS } from '../core/admin.mjs';

const kv = (args) => Object.fromEntries(args.filter((a) => a.includes('=') && !a.startsWith('--')).map((a) => { const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)]; }));
const flag = (args, k) => { const i = args.indexOf(`--${k}`); return i > -1 ? args[i + 1] : undefined; };
const fail = (msg) => { const e = new Error(msg); e.cli = true; throw e; };

/** Validate rows (+ reconcile with the ledger) and write them. Returns the sorted rows. */
function save(root, rows, { ledger = readLedger(root) } = {}) {
  const brands = rawBrands(root);
  const errs = [...checkAll(rows, brands), ...reconcile(rows, ledger)];
  if (errs.length) fail(`not saved; ${errs.length} problem(s):\n  ${errs.join('\n  ')}`);
  const sorted = sortRows(rows, brands);
  writeInventory(root, sorted);
  return sorted;
}

const KEYMAP = { status: 'status', price_cents: 'price_cents', fulfilment: 'fulfilment', cap: 'preorder_cap', preorder_cap: 'preorder_cap', low: 'low_stock', low_stock: 'low_stock', drop: 'drop_id', drop_id: 'drop_id', channel: 'sales_record_channel', sales_record_channel: 'sales_record_channel', notes: 'notes' };
export function applySet(rows, brands, target, sets) {
  const m = /^([a-z0-9-]+)\/([a-z0-9-]+)(?::(.+))?$/.exec(target ?? '');
  if (!m) fail('target must be <brand>/<product>[:<colour>/<size>]');
  const [, brand, product, variant = '-'] = m;
  const p = brands[brand]?.catalog.find((x) => x.id === product);
  if (!p) fail(`no product ${brand}/${product}`);
  if (variant !== '-' && !variantsOf(p).includes(variant)) fail(`${variant} is not a SKU of ${brand}/${product} (${variantsOf(p).join(', ')})`);
  let r = rows.find((x) => x.brand === brand && x.product_id === product && x.variant === variant);
  if (!r) { r = Object.fromEntries(COLUMNS.map((c) => [c, ''])); Object.assign(r, { brand, product_id: product, variant }); rows.push(r); }
  for (const [k, v] of Object.entries(sets)) {
    if (k === 'stock') fail('stock comes from the ledger: use receive, adjust or return');
    if (k === 'price') { const t = v.trim(); if (t === '' || /^tba$/i.test(t)) r.price_cents = ''; else if (/^\d+(\.\d{1,2})?$/.test(t)) r.price_cents = String(Math.round(Number(t) * 100)); else fail(`price "${v}" (use dollars, e.g. price=48 or price=48.00, or price=TBA)`); continue; }
    if (!KEYMAP[k]) fail(`unknown key "${k}" (${Object.keys(KEYMAP).join(', ')}, price)`);
    r[KEYMAP[k]] = v.trim();
  }
  return r;
}

export async function main(argv, { root: rootIn, log = console.log } = {}) {
  const [cmd, ...args] = argv;
  const root = resolve(flag(args, 'root') ?? rootIn ?? join(dirname(fileURLToPath(import.meta.url)), '..'));
  const pos = args.filter((a, i) => !a.includes('=') && !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
  const o = kv(args);
  switch (cmd) {
    case 'list': {
      const { rows } = stockReport(root);
      const b = flag(args, 'brand'); const s = flag(args, 'status');
      const sel = rows.filter((r) => (!b || r.brand === b) && (!s || r.status === s) && (!args.includes('--alerts') || r.alert));
      const cols = ['sku', 'status', 'price_cents', 'fulfilment', 'on_hand', 'reserved', 'available', 'preorder_sold', 'preorder_cap', 'low_stock', 'state'];
      const w = cols.map((c) => Math.max(c.length, ...sel.map((r) => String(r[c] ?? '').length)));
      log(cols.map((c, i) => c.padEnd(w[i])).join('  '));
      for (const r of sel) log(cols.map((c, i) => String(r[c] ?? '').padEnd(w[i])).join('  '));
      log(`${sel.length} rows`);
      return sel;
    }
    case 'set': {
      return withLock(root, async () => {
        const rows = readInventory(root);
        const r = applySet(rows, rawBrands(root), pos[0], o);
        save(root, rows);
        log(`saved ${r.brand}/${r.product_id}:${r.variant}`);
        return r;
      });
    }
    case 'receive': { const r = await receive(root, { sku: pos[0], qty: o.qty, ref: o.po ?? o.ref ?? '', reason: o.reason ?? '' }); log(r); return r; }
    case 'adjust': { const r = await adjust(root, { sku: pos[0], qty: o.qty, reason: o.reason ?? '' }); log(r); return r; }
    case 'return': { const r = await returnUnits(root, { sku: pos[0], qty: o.qty, order: o.order ?? '', reason: o.reason ?? '' }); log(r); return r; }
    case 'fulfil': { const r = await fulfil(root, { sku: pos[0], qty: o.qty, ref: o.ref ?? '' }); log(r); return r; }
    case 'fulfil-drop': {
      const [brand, drop] = (pos[0] ?? '').split('/');
      const inv = readInventory(root);
      const prods = inv.filter((x) => x.brand === brand && x.variant === '-' && x.drop_id === drop).map((x) => x.product_id);
      if (!prods.length) fail(`no products in drop ${brand}/${drop}`);
      const state = replay(readLedger(root));
      const done = [];
      for (const r of inv.filter((x) => x.brand === brand && prods.includes(x.product_id) && x.variant !== '-')) {
        const sku = `${brand}/${r.product_id}/${r.variant}`;
        const s = state.get(sku);
        const q = Math.min(s?.owed ?? 0, s?.on_hand ?? 0);
        if (q > 0) done.push(await fulfil(root, { sku, qty: q, ref: `drop:${drop}` }));
        if ((s?.owed ?? 0) > q) log(`${sku}: ${s.owed - q} still owed (receive more stock)`);
      }
      log(`fulfilled ${done.length} SKU(s)`);
      return done;
    }
    case 'release-expired': { const r = await releaseExpired(root); log(r); return r; }
    case 'export': {
      if (!pos[0]) fail('export <file.csv>');
      const brands = rawBrands(root);
      const rows = readInventory(root).map((r) => ({ ...r, name: brands[r.brand]?.catalog.find((p) => p.id === r.product_id)?.name ?? '' }));
      writeFileSync(pos[0], toCsv(rows, [...COLUMNS, 'name']));
      log(`exported ${rows.length} rows -> ${pos[0]} (the name column is read-only)`);
      return rows;
    }
    case 'export-stock': { const { rows } = stockReport(root); writeFileSync(pos[0], toCsv(rows, STOCK_COLUMNS)); log(`exported ${rows.length} SKU rows -> ${pos[0]}`); return rows; }
    case 'export-ledger': { if (existsSync(ledgerPath(root))) copyFileSync(ledgerPath(root), pos[0]); else writeFileSync(pos[0], toCsv([], LEDGER_COLUMNS)); log(`ledger -> ${pos[0]}`); return true; }
    case 'import': {
      if (!pos[0]) fail('import <file.csv> [reason="…"]');
      const incoming = parseCsv(readFileSync(pos[0], 'utf8'));
      return withLock(root, async () => {
        const current = readInventory(root);
        // Stock changes in a spreadsheet are physical counts: they become adjust movements (reason required).
        const moves = [];
        for (const r of incoming) {
          if (r.variant === '-' || r.fulfilment !== 'stock') continue;
          const was = current.find((x) => x.brand === r.brand && x.product_id === r.product_id && x.variant === r.variant);
          const d = Number(r.stock || 0) - Number(was?.stock || 0);
          if (d) moves.push({ sku: `${r.brand}/${r.product_id}/${r.variant}`, qty: d });
        }
        if (moves.length && !o.reason) fail(`import changes stock on ${moves.length} SKU(s); add reason="…" (e.g. reason="cycle count 2026-10-14")`);
        const ledger = readLedger(root);
        const now = new Date();
        const extra = moves.map((m, i) => ({ id: `mv_import_${now.getTime().toString(36)}_${i}`, ts: now.toISOString(), sku: m.sku, kind: 'adjust', qty: String(m.qty), fulfilment: 'stock', ref: 'import', order: '', reason: o.reason, expires_at: '' }));
        const brands = rawBrands(root);
        const errs = [...checkAll(incoming, brands), ...reconcile(incoming, [...ledger, ...extra])];
        if (errs.length) fail(`not imported; ${errs.length} problem(s):\n  ${errs.join('\n  ')}`);
        if (extra.length) writeFileSync(ledgerPath(root), (existsSync(ledgerPath(root)) ? readFileSync(ledgerPath(root), 'utf8') : `${LEDGER_COLUMNS.join(',')}\n`) + extra.map((r) => LEDGER_COLUMNS.map((c) => r[c] ?? '').join(',')).join('\n') + '\n');
        writeInventory(root, sortRows(incoming, brands));
        log(`imported ${incoming.length} rows${extra.length ? `, ${extra.length} stock adjustment(s) recorded` : ''}`);
        return { rows: incoming.length, adjustments: extra.length };
      });
    }
    case 'check': {
      const { rows, errors } = stockReport(root);
      if (errors.length) fail(`${errors.length} problem(s):\n  ${errors.join('\n  ')}`);
      const prod = readInventory(root).filter((r) => r.variant === '-');
      const by = (s) => prod.filter((r) => r.status === s).length;
      log(`ok: ${prod.length} products, ${rows.filter((r) => r.variant !== '-').length} SKUs across ${new Set(prod.map((r) => r.brand)).size} shops; ledger reconciles. ${['available', 'preorder', 'next_drop', 'in_development', 'archive', 'sold_out'].map((s) => `${s} ${by(s)}`).join(', ')}`);
      return { ok: true, rows: rows.length };
    }
    default:
      fail('commands: list, set, receive, adjust, return, fulfil, fulfil-drop, release-expired, export, export-stock, export-ledger, import, check');
  }
  return null;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2)).catch((e) => { console.error(e.cli ? e.message : e.stack ?? e.message); process.exit(1); });
}
