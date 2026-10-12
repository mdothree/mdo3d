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
  assert.match(html, /og:image" content="https:\/\/runwaeapparel\.com\/photos\//);
  assert.match(html, /rel="canonical" href="https:\/\/runwaeapparel\.com\/"/);
  const vj = JSON.parse(readFileSync(join(out, 'vercel.json'), 'utf8'));
  assert.match(JSON.stringify(vj), /script-src 'none'/);
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

test('digital shop: digital catalog, proposed prices in preview only, delivery/license terms, no buy path', () => {
  const out = mkdtempSync(join(tmpdir(), 'sf-dshop-'));
  buildBrand('runwae', out, new Date('2026-10-12'), undefined, 'digital');
  const idx = readFileSync(join(out, 'index.html'), 'utf8');
  assert.match(idx, /<h1>Runwae Apparel<\/h1>/);
  assert.match(idx, /The Little Things, Digital Editions/);
  assert.match(idx, /proposed \$30\.00/);
  assert.doesNotMatch(idx, /Fall &#39;21<\/h2>/); // the physical lines aren't in the digital shop
  const pol = readFileSync(join(out, 'policies.html'), 'utf8');
  assert.match(pol, /personal-use license/);
  assert.doesNotMatch(pol, /ships-by/);
  const ed = readFileSync(join(out, 'products', 'edition-rwa.html'), 'utf8');
  assert.match(ed, /Edition of 50/);
  assert.match(ed, /Instant download/);
  assert.doesNotMatch(ed, /id="buy"|<select/);
  for (const f of ['p-edition-rwa', 'p-lookbook-issue-2', 'p-first-drop-bundle']) assert.ok(existsSync(join(out, 'digital', `${f}.jpg`)));
  assert.match(readFileSync(join(out, 'taste.html'), 'utf8'), /href="physical\/index\.html"/);
  // live mode hides proposed prices
  const real = loadBrand('runwae');
  assert.equal(real.brand.mode, 'preview');
});

test('digital catalog: every item draft, unpriced, LB-only, editions capped', () => {
  const { dir } = loadBrand('runwae');
  const cat = JSON.parse(readFileSync(join(dir, 'catalog-digital.json'), 'utf8')).products;
  for (const p of cat) {
    assert.equal(p.status, 'draft'); assert.equal(p.price_cents, null); assert.equal(p.format, 'digital');
    if (p.kind.startsWith('edition')) assert.ok(Number.isInteger(p.edition_cap) && p.edition_cap > 0, p.id);
    for (const i of p.images) assert.ok(existsSync(join(dir, i)), i);
  }
});
