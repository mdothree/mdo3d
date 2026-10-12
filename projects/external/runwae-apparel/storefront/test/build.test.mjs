import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildBrand, loadBrand } from '../src/build.mjs';

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
