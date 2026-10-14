import './_cleanup.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fork } from 'node:child_process';
import { reserve, release, releaseExpired, commitSale, receive, adjust, returnUnits, fulfil, readLedger, replay, availability, reconcile } from '../core/stock.mjs';
import { readInventory } from '../core/inventory.mjs';
import { buildBrand, ROOT } from '../core/build.mjs';
import { templateRoot, rowsFor, writeInv } from './_fixtures.mjs';

const SKU = 'demo/example-tee/black/M';
const T0 = new Date('2026-11-01T12:00:00Z');
const stockRoot = (extra = {}) => templateRoot(ROOT, mkdtempSync(join(tmpdir(), 'sf-stk-')), 'demo', { 'example-tee': { status: 'available', fulfilment: 'stock', stock: 0, low: 3, price: '4800', ...extra } }).root;
const onHand = (root, sku = SKU, now = T0) => replay(readLedger(root), now).get(sku) ?? { on_hand: 0, reserved: 0 };

test('concurrent reservations cannot oversell (same process, interleaved async)', async () => {
  const root = stockRoot();
  await receive(root, { sku: SKU, qty: 3, ref: 'PO-1', now: T0 });
  const tries = await Promise.all(Array.from({ length: 8 }, (_, i) => reserve(root, { lines: [{ sku: SKU, qty: 1 }], ref: `r${i}`, now: T0 })));
  assert.equal(tries.filter((t) => t.ok).length, 3);
  assert.ok(tries.filter((t) => !t.ok).every((t) => /Not in stock|only|Sold out/.test(t.reason)));
  assert.equal(onHand(root).reserved, 3);
});

test('concurrent reservations cannot oversell (separate processes, file lock)', async () => {
  const root = stockRoot();
  await receive(root, { sku: SKU, qty: 2, ref: 'PO-1', now: T0 });
  const worker = join(root, 'w.mjs');
  writeFileSync(worker, `import { reserve } from ${JSON.stringify(join(ROOT, 'core', 'stock.mjs'))};
const r = await reserve(process.argv[2], { lines: [{ sku: ${JSON.stringify(SKU)}, qty: 1 }], ref: process.argv[3], now: new Date(${T0.getTime()}) });
process.send(r.ok);`);
  const run = (i) => new Promise((res) => { const c = fork(worker, [root, `p${i}`]); c.on('message', (m) => res(m)); c.on('exit', () => res(false)); });
  const results = await Promise.all(Array.from({ length: 6 }, (_, i) => run(i)));
  assert.equal(results.filter(Boolean).length, 2);
});

test('reservation expiry releases stock; explicit release is idempotent', async () => {
  const root = stockRoot();
  await receive(root, { sku: SKU, qty: 1, ref: 'PO-1', now: T0 });
  assert.equal((await reserve(root, { lines: [{ sku: SKU, qty: 1 }], ref: 'a', now: T0 })).ok, true);
  assert.equal((await reserve(root, { lines: [{ sku: SKU, qty: 1 }], ref: 'b', now: T0 })).ok, false, 'held');
  const later = new Date(T0.getTime() + 31 * 60 * 1000);
  assert.equal(onHand(root, SKU, later).reserved, 0, 'an expired hold no longer counts');
  assert.equal((await reserve(root, { lines: [{ sku: SKU, qty: 1 }], ref: 'c', now: later })).ok, true);
  const sweep = await releaseExpired(root, { now: new Date(later.getTime() + 31 * 60 * 1000) });
  assert.equal(sweep.released, 2, 'both lapsed holds are recorded as released');
  assert.equal((await release(root, { ref: 'c' })).released, 0);
  const r2 = stockRoot();
  await receive(r2, { sku: SKU, qty: 1, ref: 'PO-1', now: T0 });
  await reserve(r2, { lines: [{ sku: SKU, qty: 1 }], ref: 'x', now: T0 });
  assert.equal((await release(r2, { ref: 'x', now: T0 })).released, 1);
  assert.equal((await release(r2, { ref: 'x', now: T0 })).released, 0);
  assert.equal(onHand(r2).reserved, 0);
});

test('a paid order converts the hold to a sale and decrements stock once (idempotent), with low-stock alerts', async () => {
  const root = stockRoot();
  await receive(root, { sku: SKU, qty: 5, ref: 'PO-1', now: T0 });
  await reserve(root, { lines: [{ sku: SKU, qty: 2 }], ref: 'rsv1', now: T0 });
  const a = await commitSale(root, { order: 'EX-1', ref: 'rsv1', lines: [{ sku: SKU, qty: 2 }], now: T0 });
  assert.equal(a.duplicate, false);
  assert.deepEqual(a.lowAlerts, [{ sku: SKU, before: 5, after: 3, low: 3 }]);
  const b = await commitSale(root, { order: 'EX-1', ref: 'rsv1', lines: [{ sku: SKU, qty: 2 }], now: T0 });
  assert.equal(b.duplicate, true);
  const s = onHand(root);
  assert.equal(s.on_hand, 3);
  assert.equal(s.reserved, 0, 'the hold became the sale');
  assert.equal(readInventory(root).find((r) => r.variant === 'black/M').stock, '3', 'master mirrors the ledger');
});

test('pre-order caps are enforced the same way', async () => {
  const root = templateRoot(ROOT, mkdtempSync(join(tmpdir(), 'sf-cap-')), 'demo', { 'example-tee': { status: 'preorder', drop: 'first-drop', cap: '3' } }).root;
  assert.equal((await reserve(root, { lines: [{ sku: SKU, qty: 2 }], ref: 'a', now: T0 })).ok, true);
  await commitSale(root, { order: 'EX-1', ref: 'a', lines: [{ sku: SKU, qty: 2 }], now: T0 });
  const over = await reserve(root, { lines: [{ sku: SKU, qty: 2 }], ref: 'b', now: T0 });
  assert.equal(over.ok, false);
  assert.match(over.reason, /only 1 available/);
  assert.equal((await reserve(root, { lines: [{ sku: SKU, qty: 1 }], ref: 'c', now: T0 })).ok, true);
  await commitSale(root, { order: 'EX-2', ref: 'c', lines: [{ sku: SKU, qty: 1 }], now: T0 });
  const st = replay(readLedger(root), T0).get(SKU);
  assert.equal(st.preorder_sold, 3);
  assert.equal(availability({ fulfilment: 'preorder', cap: 3, low: null }, st).state, 'preorder_full');
  assert.equal(st.on_hand, 0, 'pre-order sales owe units; they do not touch on-hand');
  assert.equal(st.owed, 3);
});

test('receive / adjust / return / fulfil, and ledger replay equals current stock', async () => {
  const root = templateRoot(ROOT, mkdtempSync(join(tmpdir(), 'sf-mv-')), 'demo', { 'example-tee': { status: 'preorder', drop: 'first-drop' } }).root;
  await reserve(root, { lines: [{ sku: SKU, qty: 4 }], ref: 'p', now: T0 });
  await commitSale(root, { order: 'EX-9', ref: 'p', lines: [{ sku: SKU, qty: 4 }], now: T0 });
  await assert.rejects(fulfil(root, { sku: SKU, qty: 4 }), /only 0 on hand.*receive the PO first/);
  await receive(root, { sku: SKU, qty: 6, ref: 'PO-0012', now: T0 });
  await fulfil(root, { sku: SKU, qty: 4, ref: 'drop:first-drop', now: T0 });
  await assert.rejects(adjust(root, { sku: SKU, qty: -1 }), /reason is required/);
  await adjust(root, { sku: SKU, qty: -1, reason: 'damaged', now: T0 });
  await assert.rejects(returnUnits(root, { sku: SKU, qty: 1 }), /order is required/);
  await returnUnits(root, { sku: SKU, qty: 1, order: 'EX-9', now: T0 });
  await assert.rejects(receive(root, { sku: SKU, qty: 2 }), /ref is required/);
  await assert.rejects(receive(root, { sku: 'demo/example-tee/red/M', qty: 2, ref: 'x' }), /unknown SKU/);
  const s = replay(readLedger(root), T0).get(SKU);
  assert.deepEqual([s.on_hand, s.owed], [6 - 4 - 1 + 1, 0]);
  const kinds = readLedger(root).map((m) => m.kind);
  assert.deepEqual(kinds, ['reserve', 'sale', 'receive', 'fulfil', 'adjust', 'return']);
  // replay twice from scratch = same answer; nothing drifted from the master
  assert.deepEqual(replay(readLedger(root), T0).get(SKU).on_hand, s.on_hand);
  assert.deepEqual(reconcile(readInventory(root), readLedger(root), T0), []);
});

test('ledger replay = stock for a long random sequence', async () => {
  const root = stockRoot();
  let model = 0;
  for (let i = 0; i < 40; i++) {
    const k = i % 4;
    if (k === 0) { await receive(root, { sku: SKU, qty: 3, ref: `PO-${i}`, now: T0 }); model += 3; }
    if (k === 1 && model > 0) { await reserve(root, { lines: [{ sku: SKU, qty: 1 }], ref: `r${i}`, now: T0 }); await commitSale(root, { order: `O-${i}`, ref: `r${i}`, lines: [{ sku: SKU, qty: 1 }], now: T0 }); model -= 1; }
    if (k === 2) { await adjust(root, { sku: SKU, qty: -1, reason: 'count', now: T0 }); model -= 1; }
    if (k === 3) { await returnUnits(root, { sku: SKU, qty: 1, order: `O-${i - 2}`, now: T0 }); model += 1; }
  }
  assert.equal(onHand(root).on_hand, model);
  assert.equal(Number(readInventory(root).find((r) => r.variant === 'black/M').stock), model);
});

test('"Only N left" renders only when true (stock at or under the low-stock threshold)', async () => {
  const { root, catalogPath } = templateRoot(ROOT, mkdtempSync(join(tmpdir(), 'sf-left-')));
  const c = JSON.parse(readFileSync(catalogPath, 'utf8'));
  c.products[0].sizes = ['OS'];
  writeFileSync(catalogPath, JSON.stringify(c));
  writeInv(root, rowsFor('demo', c.products, { 'example-tee': { status: 'available', fulfilment: 'stock', stock: 0, low: 3, price: '4800' } }));
  const sku = 'demo/example-tee/black/OS';
  await receive(root, { sku, qty: 10, ref: 'PO-1' });
  let out = join(root, 'o1');
  await buildBrand('demo', out, { root });
  let pdp = readFileSync(join(out, 'products', 'example-tee.html'), 'utf8');
  assert.match(pdp, /data-avail[^>]*>In stock</);
  assert.doesNotMatch(pdp + readFileSync(join(out, 'catalog.js'), 'utf8'), /Only \d+ left/);
  await adjust(root, { sku, qty: -8, reason: 'samples' });
  out = join(root, 'o2');
  await buildBrand('demo', out, { root });
  pdp = readFileSync(join(out, 'products', 'example-tee.html'), 'utf8');
  assert.match(pdp, /Only 2 left/);
  await reserve(root, { lines: [{ sku, qty: 2 }], ref: 'last' });
  await commitSale(root, { order: 'EX-L', ref: 'last', lines: [{ sku, qty: 2 }] });
  out = join(root, 'o3');
  await buildBrand('demo', out, { root });
  pdp = readFileSync(join(out, 'products', 'example-tee.html'), 'utf8');
  assert.match(pdp, /Sold out/, 'real stock reached 0 after real sales');
  assert.doesNotMatch(pdp, /data-add /);
  assert.doesNotMatch(pdp, /Only \d+ left/);
});

test('stock that was never received says so, never "Sold out"', () => {
  assert.equal(availability({ fulfilment: 'stock', cap: null, low: 2 }, { on_hand: 0, reserved: 0, sold: 0, preorder_sold: 0 }).state, 'not_in_stock');
  assert.equal(availability({ fulfilment: 'pod', cap: null, low: null }).state, 'pod');
  assert.equal(availability({ fulfilment: 'stock', cap: null, low: null }, { on_hand: 1, reserved: 0, sold: 0 }).left, null, 'no threshold, no "left" line');
});
