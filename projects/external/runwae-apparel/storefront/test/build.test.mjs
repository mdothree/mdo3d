import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildBrand, buildHolding, loadBrand } from '../src/build.mjs';

for (const id of ['runwae', 'glb']) {
  test(`build ${id}: preview mode is noindex and shows no buy buttons`, () => {
    const out = mkdtempSync(join(tmpdir(), `sf-${id}-`));
    buildBrand(id, out, new Date('2026-10-12'));
    const idx = readFileSync(join(out, 'index.html'), 'utf8');
    assert.match(idx, /noindex/);
    assert.match(idx, /Preview: not open for orders/);
    assert.match(readFileSync(join(out, 'robots.txt'), 'utf8'), /Disallow: \//);
    assert.ok(existsSync(join(out, 'policies.html')) && existsSync(join(out, 'thanks.html')));
    const pol = readFileSync(join(out, 'policies.html'), 'utf8');
    assert.match(pol, /ships-by date/);
    assert.match(pol, /full refund/);
    for (const f of readdirSync(join(out, 'products'))) {
      const html = readFileSync(join(out, 'products', f), 'utf8');
      assert.doesNotMatch(html, /id="buy"/, `${f} must not be purchasable`);
      assert.equal((html.match(/name="viewport"/g) ?? []).length, 1);
    }
  });
}

test('every Runwae product image referenced by the build exists', () => {
  const { dir, catalog } = loadBrand('runwae');
  for (const p of catalog) p.images.forEach((_, i) => assert.ok(existsSync(join(dir, 'assets', `${p.id}-${i + 1}.jpg`)), `${p.id}-${i + 1}.jpg`));
});

test('product pages escape catalog text', () => {
  const out = mkdtempSync(join(tmpdir(), 'sf-esc-'));
  buildBrand('runwae', out);
  const html = readFileSync(join(out, 'products', 'crafting-tee.html'), 'utf8');
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /Fall &#39;21/);
});

test('Runwae Apparel: hero names the brand in full; styled photos + taste page', () => {
  const out = mkdtempSync(join(tmpdir(), 'sf-look-'));
  buildBrand('runwae', out, new Date('2026-10-12'));
  const idx = readFileSync(join(out, 'index.html'), 'utf8');
  assert.match(idx, /<h1>Runwae Apparel<\/h1>/);
  assert.doesNotMatch(idx, /<h1>Runwae<\/h1>/);
  assert.match(idx, /photos\/pave-hoodie-gallery\.jpg/);
  assert.ok(existsSync(join(out, 'taste.html')));
  const pdp = readFileSync(join(out, 'products', 'pave-hoodie.html'), 'utf8');
  assert.match(pdp, /photos\/pave-hoodie-gallery\.jpg/);
  assert.match(pdp, /assets\/pave-hoodie-1\.jpg/); // flat mockup still shown after the styled shot
  const sk = mkdtempSync(join(tmpdir(), 'sf-sk-'));
  buildBrand('runwae', sk, new Date('2026-10-12'), 'sketchbook');
  assert.match(readFileSync(join(sk, 'index.html'), 'utf8'), /photos\/pave-hoodie-sketchbook\.jpg/);
});

test('every Runwae product has both styled looks', () => {
  const { dir, catalog } = loadBrand('runwae');
  for (const p of catalog) for (const l of ['gallery', 'sketchbook']) assert.ok(existsSync(join(dir, 'photos', `${p.id}-${l}.jpg`)), `${p.id}-${l}`);
});

test('holding page: Runwae Apparel in full, drop coming, no forms/prices/emails, indexable', () => {
  const out = mkdtempSync(join(tmpdir(), 'sf-hold-'));
  const r = buildHolding('runwae', out);
  const html = readFileSync(join(out, 'index.html'), 'utf8');
  assert.match(html, /<h1>Runwae Apparel<\/h1>/);
  assert.match(html, /first drop is coming/);
  assert.doesNotMatch(html, /<form|\$\d|@[a-z]+\.(com|net)|noindex/i);
  assert.ok(r.shots >= 1 && existsSync(join(out, 'emblem.png')) && existsSync(join(out, '404.html')));
  assert.match(readFileSync(join(out, 'robots.txt'), 'utf8'), /Allow: \//);
});

test('digital offers page: mocks shipped, no buy path, no inline styles anywhere', () => {
  const out = mkdtempSync(join(tmpdir(), 'sf-dig-'));
  buildBrand('runwae', out, new Date('2026-10-12'));
  const html = readFileSync(join(out, 'digital.html'), 'utf8');
  for (const m of ['a-lookbook', 'b-design-drops', 'c-tlt-editions']) assert.ok(existsSync(join(out, 'digital', `${m}.jpg`)), m);
  assert.match(html, /Nothing is for sale/);
  assert.doesNotMatch(html, /id="buy"|<form/);
  for (const f of ['index.html', 'taste.html', 'digital.html']) assert.doesNotMatch(readFileSync(join(out, f), 'utf8'), / style="/, f);
});
