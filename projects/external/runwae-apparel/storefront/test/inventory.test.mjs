import './_cleanup.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseCsv, toCsv, mergeInventory, inventoryErrors, checkAll, readInventory, COLUMNS, variantsOf } from '../core/inventory.mjs';
import { buildBrand, ROOT, brandIds } from '../core/build.mjs';
import { readBrandDir } from '../core/catalog.mjs';
import { rawBrands } from '../core/admin.mjs';
import { main as cli } from '../tools/inventory.mjs';
import { templateRoot, rowsFor, writeInv } from './_fixtures.mjs';

const quiet = { log: () => {} };
const cat = [
  { id: 'tee', name: 'Tee', sizes: ['S', 'M'], colors: [{ id: 'black', name: 'Black', hex: '#000' }] },
  { id: 'old', name: 'Old', sizes: ['M'], archive_year: 2021 },
];
const drops = [{ id: 'd1', window: { open: null, close: null }, schedule: {} }];
const row = (o) => ({ ...Object.fromEntries(COLUMNS.map((c) => [c, ''])), brand: 'b', ...o });
const good = () => [
  row({ product_id: 'tee', variant: '-', status: 'preorder', drop_id: 'd1', price_cents: '4800' }),
  row({ product_id: 'tee', variant: 'black/S', fulfilment: 'preorder', preorder_cap: '20' }),
  row({ product_id: 'tee', variant: 'black/M', fulfilment: 'preorder' }),
  row({ product_id: 'old', variant: '-', status: 'archive' }),
];

test('CSV parse/serialise round-trips quotes, commas and newlines', () => {
  const rows = [row({ product_id: 'tee', variant: '-', status: 'next_drop', notes: 'says "hi", then\nleaves' })];
  assert.deepEqual(parseCsv(toCsv(rows)), rows);
  assert.throws(() => parseCsv('brand,product_id\nb,tee\n'), /missing columns/);
});

test('merge: status, price, drop membership and per-SKU settings come from the inventory', () => {
  const m = mergeInventory('b', good(), cat, drops);
  const tee = m.products.find((p) => p.id === 'tee');
  assert.equal(tee.status, 'preorder');
  assert.equal(tee.price_cents, 4800);
  assert.deepEqual(m.drops[0].products, ['tee']);
  assert.deepEqual(tee.skus['black/S'], { fulfilment: 'preorder', stock: 0, cap: 20, low: null, sold_out: false });
  assert.equal(m.products.find((p) => p.id === 'old').price_cents, null, 'empty price = Price TBA');
  assert.deepEqual(variantsOf(cat[0]), ['black/S', 'black/M']);
  assert.deepEqual(variantsOf(cat[1]), ['-/M']);
});

test('mismatch failures: a row with no product, a product with no row, fields left in the catalog', () => {
  assert.match(inventoryErrors('b', [...good(), row({ product_id: 'ghost', variant: '-', status: 'next_drop' })], cat, drops).join('\n'), /no product "ghost"/);
  assert.match(inventoryErrors('b', good().filter((r) => r.product_id !== 'old'), cat, drops).join('\n'), /old: no inventory row/);
  assert.match(inventoryErrors('b', good(), [{ ...cat[0], status: 'preorder' }, cat[1]], drops).join('\n'), /status belong in inventory\/inventory.csv/);
  assert.match(inventoryErrors('b', good(), cat, [{ ...drops[0], products: ['tee'] }]).join('\n'), /drop membership comes from inventory/);
  assert.match(checkAll([...good(), row({ brand: 'nobrand', product_id: 'x', variant: '-', status: 'next_drop' })], { b: { catalog: cat, drops } }).join('\n'), /unknown brand "nobrand"/);
  assert.throws(() => mergeInventory('b', good().slice(0, 3), cat, drops), /inventory invalid/);
});

test('rule violations fail, the same for every brand', () => {
  const errs = (mut) => { const r = good(); mut(r); return inventoryErrors('b', r, cat, drops).join('\n'); };
  assert.match(errs((r) => { r[0].status = 'sold_out'; }), /sold_out needs sales_record_channel/);
  assert.match(errs((r) => { r[0].status = 'bogus'; }), /unknown status/);
  assert.match(errs((r) => { r[0].price_cents = '48.00'; }), /positive whole number of cents/);
  assert.match(errs((r) => { r[0].price_cents = '0'; }), /positive whole number/);
  assert.match(errs((r) => { r[0].drop_id = ''; }), /preorder needs a drop_id/);
  assert.match(errs((r) => { r[0].drop_id = 'nope'; }), /drop "nope" is not in/);
  assert.match(errs((r) => { r[2].variant = 'red/M'; }), /not a colour\/size/);
  assert.match(errs((r) => { r.splice(2, 1); }), /missing black\/M/, 'a buyable product needs every SKU');
  assert.match(errs((r) => { r[1].fulfilment = 'stock'; }), /preorder product's SKUs use fulfilment "preorder"/);
  assert.match(errs((r) => { r[1].fulfilment = 'magic'; }), /fulfilment must be/);
  assert.match(errs((r) => { r[1].price_cents = '100'; }), /per-SKU prices/);
  assert.match(errs((r) => { r[2].stock = '5'; }), /stock\/low_stock only apply to fulfilment "stock"/);
  assert.match(errs((r) => { r[3].price_cents = '100'; }), /archive pieces are not for sale/);
  assert.match(errs((r) => { r[0].stock = '3'; }), /belongs on the SKU rows/);
  assert.match(errs((r) => { r[2].status = 'sold_out'; }), /sold_out needs sales_record_channel/);
  assert.match(errs((r) => r.push({ ...r[1] })), /duplicate row/);
  assert.equal(errs(() => {}), '');
});

test('the real inventory covers every product of all four shops and the build merges it', () => {
  const rows = readInventory(ROOT);
  const brands = rawBrands(ROOT);
  assert.deepEqual(Object.keys(brands), brandIds());
  assert.deepEqual(checkAll(rows, brands), []);
  for (const id of brandIds()) {
    const { catalog } = readBrandDir(join(ROOT, 'brands', id));
    for (const p of catalog) assert.ok(p.status, `${id}/${p.id}`);
    for (const p of brands[id].catalog) assert.ok(!('status' in p) && !('price_cents' in p), `${id}/${p.id}: status/price live in the inventory`);
  }
});

test('build fails on an inventory mismatch', async () => {
  const { root, catalogPath } = templateRoot(ROOT, mkdtempSync(join(tmpdir(), 'sf-inv-')));
  const c = JSON.parse(readFileSync(catalogPath, 'utf8'));
  c.products.push({ ...c.products[0], id: 'second-tee' });
  writeFileSync(catalogPath, JSON.stringify(c));
  await assert.rejects(buildBrand('demo', join(root, 'out'), { root }), /second-tee: no inventory row/);
});

test('CLI: set / export / import round-trip with validation', async () => {
  const { root } = templateRoot(ROOT, mkdtempSync(join(tmpdir(), 'sf-cli-')));
  await cli(['set', 'demo/example-tee', 'price=48', 'notes=first run'], { root, ...quiet });
  let r = readInventory(root).find((x) => x.variant === '-');
  assert.equal(r.price_cents, '4800');
  assert.equal(r.notes, 'first run');
  await cli(['set', 'demo/example-tee:black/M', 'cap=30'], { root, ...quiet });
  assert.equal(readInventory(root).find((x) => x.variant === 'black/M').preorder_cap, '30');
  await assert.rejects(cli(['set', 'demo/example-tee', 'status=sold_out'], { root, ...quiet }), /not saved.*sold_out needs sales_record_channel/s);
  await assert.rejects(cli(['set', 'demo/example-tee:black/M', 'stock=5'], { root, ...quiet }), /stock comes from the ledger/);
  await assert.rejects(cli(['set', 'demo/nope', 'status=next_drop'], { root, ...quiet }), /no product demo\/nope/);
  assert.equal(readInventory(root).find((x) => x.variant === '-').status, 'preorder', 'a rejected set changes nothing');
  await cli(['set', 'demo/example-tee', 'price=TBA'], { root, ...quiet });
  assert.equal(readInventory(root).find((x) => x.variant === '-').price_cents, '');

  const file = join(root, 'sheet.csv');
  await cli(['export', file], { root, ...quiet });
  const sheet = readFileSync(file, 'utf8');
  assert.match(sheet.split('\n')[0], /,name$/);
  assert.match(sheet, /Example Tee/);
  // edit in a "spreadsheet": next drop, then import
  writeFileSync(file, sheet.replace(/demo,example-tee,-,preorder,/, 'demo,example-tee,-,next_drop,'));
  await cli(['import', file], { root, ...quiet });
  assert.equal(readInventory(root).find((x) => x.variant === '-').status, 'next_drop');
  // a bad sheet is refused whole
  writeFileSync(file, sheet.replace(/demo,example-tee,-,preorder,/, 'demo,example-tee,-,bogus,'));
  await assert.rejects(cli(['import', file], { root, ...quiet }), /not imported.*unknown status/s);
  assert.equal(readInventory(root).find((x) => x.variant === '-').status, 'next_drop');
  const ok = await cli(['check'], { root, ...quiet });
  assert.equal(ok.ok, true);
});

test('CLI import: stock changes are physical counts and become adjust movements (reason required)', async () => {
  const { root, catalogPath } = templateRoot(ROOT, mkdtempSync(join(tmpdir(), 'sf-cnt-')), 'demo', { 'example-tee': { status: 'available', fulfilment: 'stock', stock: 0 } });
  await cli(['receive', 'demo/example-tee/black/M', 'qty=10', 'po=PO-1'], { root, ...quiet });
  const file = join(root, 'count.csv');
  await cli(['export', file], { root, ...quiet });
  writeFileSync(file, readFileSync(file, 'utf8').replace('demo,example-tee,black/M,,,stock,10,', 'demo,example-tee,black/M,,,stock,8,'));
  await assert.rejects(cli(['import', file], { root, ...quiet }), /add reason=/);
  const r = await cli(['import', file, 'reason=cycle count'], { root, ...quiet });
  assert.equal(r.adjustments, 1);
  const led = readFileSync(join(root, 'inventory', 'ledger.csv'), 'utf8');
  assert.match(led, /demo\/example-tee\/black\/M,adjust,-2,stock,import,,cycle count/);
  assert.equal((await cli(['check'], { root, ...quiet })).ok, true);
  void catalogPath;
});

test('check: a hand edit to stock that skipped the ledger is caught', async () => {
  const { root } = templateRoot(ROOT, mkdtempSync(join(tmpdir(), 'sf-drift-')), 'demo', { 'example-tee': { status: 'available', fulfilment: 'stock', stock: 0 } });
  await cli(['receive', 'demo/example-tee/black/S', 'qty=3', 'po=PO-2'], { root, ...quiet });
  const rows = readInventory(root);
  rows.find((x) => x.variant === 'black/S').stock = '7';
  writeInv(root, rows);
  await assert.rejects(cli(['check'], { root, ...quiet }), /stock 7 but the ledger replays to 3/);
  void rowsFor;
});
