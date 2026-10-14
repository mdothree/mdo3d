import './_cleanup.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, cpSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { productView, validateCatalog, soldOutBacked, publicCatalog } from '../core/catalog.mjs';
import { buildBrand, loadBrand, ROOT } from '../core/build.mjs';
import { templateRoot, rowsFor, writeInv } from './_fixtures.mjs';

const base = { id: 'x', name: 'X', sizes: ['M'], channel: 'preorder', price_cents: null };
const drops = [{ id: 'd', products: ['x'], window: { open: '2026-11-01T00:00:00Z', close: '2026-11-15T00:00:00Z' }, schedule: {} }];

test('status views: available / preorder / next_drop / in_development / archive', () => {
  const av = productView({ ...base, status: 'available', price_cents: 3000 }, []);
  assert.equal(av.canAdd, true); assert.equal(av.priceText, '$30.00'); assert.equal(av.label, 'Available');
  const pre = productView({ ...base, status: 'preorder' }, drops, new Date('2026-11-05'));
  assert.equal(pre.canAdd, true); assert.equal(pre.preorder, true); assert.equal(pre.ship_by, '2027-01-03');
  assert.equal(pre.priceText, 'Price TBA'); assert.equal(pre.checkoutReady, false, 'no price -> checkout off');
  assert.match(pre.note, /Ships by January 3, 2027/);
  const preUnsched = productView({ ...base, status: 'preorder' }, [{ ...drops[0], window: { open: null, close: null } }]);
  assert.equal(preUnsched.canAdd, true); assert.equal(preUnsched.ship_by, null); assert.match(preUnsched.note, /set when the window opens/);
  const up = productView({ ...base, status: 'preorder' }, drops, new Date('2026-10-20'));
  assert.equal(up.canAdd, false); assert.equal(up.notify, true); assert.match(up.label, /Pre-order opens November 1, 2026/);
  const nd = productView({ ...base, status: 'next_drop', opens: '2027-02-01' }, []);
  assert.equal(nd.label, 'Opens February 1, 2027'); assert.equal(nd.notify, true); assert.equal(nd.canAdd, false);
  assert.equal(productView({ ...base, status: 'next_drop' }, []).label, 'Next drop');
  const dev = productView({ ...base, status: 'in_development' }, []);
  assert.equal(dev.label, 'Concept · not yet available'); assert.equal(dev.canAdd, false); assert.equal(dev.notify, false);
  assert.equal(productView({ ...base, status: 'archive', archive_year: 2021 }, []).label, 'Archive · 2021');
});

test('sold out renders only with a real sales_record or sold_count >= stock; otherwise the build fails', () => {
  assert.equal(soldOutBacked({ status: 'sold_out' }), false);
  assert.equal(soldOutBacked({ sales_record: { channel: '' } }), false);
  assert.equal(soldOutBacked({ sales_record: { channel: '2021 Shopify', note: 'internal' } }), true);
  assert.equal(soldOutBacked({ stock: 10, sold_count: 9 }), false);
  assert.equal(soldOutBacked({ stock: 10, sold_count: 10 }), true);
  assert.throws(() => validateCatalog([{ ...base, status: 'sold_out' }]), /sold_out needs a sales_record/);
  assert.throws(() => productView({ ...base, status: 'sold_out' }, []), /sold_out without/);
  const ok = productView({ ...base, status: 'sold_out', sales_record: { channel: 'in person', note: 'secret' } }, []);
  assert.equal(ok.label, 'Sold out'); assert.equal(ok.notify, true);
  // the internal record never reaches public data
  const pub = publicCatalog([{ ...base, status: 'sold_out', sales_record: { channel: 'in person', note: 'secret' }, stock: 3, sold_count: 3 }], [], new Date(), { imageFor: () => '', urlFor: () => '' });
  assert.doesNotMatch(JSON.stringify(pub), /secret|in person|sales_record|sold_count|stock/);
  assert.throws(() => validateCatalog([{ ...base, status: 'archive' }]), /archive_year/);
  assert.throws(() => validateCatalog([{ ...base, status: 'preorder' }], []), /needs a drop/);
  assert.throws(() => validateCatalog([{ ...base, status: 'bogus' }]), /unknown status/);
});

test('no shop renders "sold out" without backing data (all four built brands)', async () => {
  for (const id of ['buttsstudios', 'runwae', 'glb', 'ridgefield']) {
    const out = mkdtempSync(join(tmpdir(), `sf-so-${id}-`));
    await buildBrand(id, out, { now: new Date('2026-10-14') });
    const cat = loadBrand(id).catalog;
    const backed = cat.some((p) => p.status === 'sold_out' && soldOutBacked(p));
    const files = ['index.html', 'shop.html', ...readdirSync(join(out, 'products')).map((f) => `products/${f}`)];
    for (const f of files) {
      const html = readFileSync(join(out, f), 'utf8');
      if (!backed) assert.doesNotMatch(html, /sold[ -]?out/i, `${id}/${f}`);
      assert.doesNotMatch(html, /sales_record/, `${id}/${f}`);
    }
  }
});

test('a sold_out item with a sales_record builds, shows "Sold out" and hides the record', async () => {
  const { root, catalogPath } = templateRoot(ROOT, mkdtempSync(join(tmpdir(), 'sf-soroot-')));
  const cat = JSON.parse(readFileSync(catalogPath, 'utf8'));
  cat.products.push({ ...cat.products[0], id: 'old-tee' });
  writeFileSync(catalogPath, JSON.stringify(cat));
  const rows = rowsFor('demo', cat.products, { 'example-tee': { status: 'preorder', drop: 'first-drop' }, 'old-tee': { status: 'sold_out', channel: '2021 Shopify', notes: 'internal only' } });
  writeInv(root, rows);
  const out = join(root, 'out');
  await buildBrand('demo', out, { root });
  const html = readFileSync(join(out, 'products', 'old-tee.html'), 'utf8');
  assert.match(html, /Sold out/);
  assert.match(html, /data-notify/);
  assert.doesNotMatch(html + readFileSync(join(out, 'catalog.js'), 'utf8'), /2021 Shopify|internal only/);
  rows.find((r) => r.product_id === 'old-tee').sales_record_channel = '';
  writeInv(root, rows);
  await assert.rejects(buildBrand('demo', join(root, 'out2'), { root }), /sold_out needs sales_record_channel/);
});

import { printErrors, printLabel } from '../core/catalog.mjs';

test('design rules: chest marks are medium for every brand; shirt-sized art on the back is GLB-only (print_rules); specs render as a Print line', () => {
  const it = (print, extra = {}) => ({ id: 'x', status: 'next_drop', print, ...extra });
  const glb = { large_art: 'back_only' };
  assert.deepEqual(printErrors(it([{ placement: 'back', size: 'full_back' }, { placement: 'front_chest', size: 'chest_medium' }]), glb), []);
  assert.match(printErrors(it({ placement: 'front_panel', size: 'full_front' }), glb).join(), /shirt-sized art must be on the back/);
  assert.deepEqual(printErrors(it({ placement: 'front_panel', size: 'full_front' })), [], 'other brands may carry large front art');
  assert.match(printErrors(it({ placement: 'front_chest', size: 'full_front' })).join(), /belongs on the front_panel/);
  assert.match(printErrors(it({ placement: 'front_panel', size: 'full_back' })).join(), /full_back belongs on the back/);
  assert.match(printErrors(it({ placement: 'front_chest', size: 'chest_large' })).join(), /chest marks must be chest_medium/);
  assert.match(printErrors(it({ placement: 'front_chest', size: 'chest_large' }), glb).join(), /chest marks must be chest_medium/);
  assert.match(printErrors(it(undefined)).join(), /print spec missing/);
  assert.deepEqual(printErrors(it(undefined, { status: 'archive' })), [], 'archive pieces are historical');
  assert.equal(printLabel({ placement: 'back', size: 'full_back' }), 'Back print · full size');
  assert.equal(printLabel({ placement: 'front_panel', size: 'full_front' }), 'Front panel print · full size');
  assert.equal(printLabel({ placement: 'front_chest', size: 'chest_medium' }), 'Chest mark · medium');
  assert.throws(() => validateCatalog([{ ...base, status: 'next_drop', print: { placement: 'front_panel', size: 'full_front' } }], [], null, glb), /must be on the back/);
  assert.doesNotThrow(() => validateCatalog([{ ...base, status: 'next_drop', print: { placement: 'front_panel', size: 'full_front' } }]));
});

test('every real catalog follows its print rules (GLB back-only) and every product page shows its Print line', async () => {
  for (const id of ['buttsstudios', 'runwae', 'glb', 'ridgefield']) {
    const { brand, catalog: cat } = loadBrand(id);
    if (id === 'glb') assert.equal(brand.print_rules?.large_art, 'back_only');
    else assert.notEqual(brand.print_rules?.large_art, 'back_only', `${id}: back-only is GLB-only`);
    for (const p of cat) assert.deepEqual(printErrors(p, brand.print_rules ?? {}), [], `${id}/${p.id}`);
    const out = mkdtempSync(join(tmpdir(), `sf-pr-${id}-`));
    await buildBrand(id, out, { now: new Date('2026-10-14') });
    for (const p of cat.filter((x) => x.listed !== false && x.status !== 'archive' && (x.print ?? []).length)) {
      assert.match(readFileSync(join(out, 'products', `${p.id}.html`), 'utf8'), /class="seed-print"/, `${id}/${p.id}`);
    }
  }
});
