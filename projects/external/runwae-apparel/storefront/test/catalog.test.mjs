import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, cpSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { productView, validateCatalog, soldOutBacked, publicCatalog } from '../core/catalog.mjs';
import { buildBrand, ROOT } from '../core/build.mjs';

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
    const cat = JSON.parse(readFileSync(join(ROOT, 'brands', id, 'catalog.json'), 'utf8')).products;
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
  const root = mkdtempSync(join(tmpdir(), 'sf-soroot-'));
  mkdirSync(join(root, 'brands'), { recursive: true });
  cpSync(join(ROOT, 'brands', '_template'), join(root, 'brands', 'demo'), { recursive: true });
  const cat = JSON.parse(readFileSync(join(root, 'brands', 'demo', 'catalog.json'), 'utf8'));
  cat.products.push({ ...cat.products[0], id: 'old-tee', status: 'sold_out', sales_record: { channel: '2021 Shopify', note: 'internal only' } });
  writeFileSync(join(root, 'brands', 'demo', 'catalog.json'), JSON.stringify(cat));
  const out = join(root, 'out');
  await buildBrand('demo', out, { root });
  const html = readFileSync(join(out, 'products', 'old-tee.html'), 'utf8');
  assert.match(html, /Sold out/);
  assert.match(html, /data-notify/);
  assert.doesNotMatch(html + readFileSync(join(out, 'catalog.js'), 'utf8'), /2021 Shopify|internal only/);
  cat.products.at(-1).sales_record = null;
  writeFileSync(join(root, 'brands', 'demo', 'catalog.json'), JSON.stringify(cat));
  await assert.rejects(buildBrand('demo', join(root, 'out2'), { root }), /sold_out needs a sales_record/);
});
