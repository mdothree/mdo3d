import './_cleanup.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildBrand, loadBrand } from '../core/build.mjs';
import { listFor, releaseOf } from '../api/notify.mjs';

for (const brand of ['ridgefield', 'buttsstudios']) {
  test(`${brand}: unopened apparel has a usable waitlist and no purchase control`, async () => {
    const root = mkdtempSync(join(tmpdir(), `shop-waitlist-${brand}-`));
    await buildBrand(brand, root, { env: {} });
    const data = loadBrand(brand);
    // Image-free unapproved directions (the Studio Bag in rework) stay unavailable.
    const candidates = data.catalog.filter(p => p.listed !== false && p.status === 'unavailable' && p.channel === 'preorder' && p.images?.length);
    assert.ok(candidates.length, 'exercise actual unopened apparel');
    for (const product of candidates) {
      const html = readFileSync(join(root, 'shop', 'products', `${product.id}.html`), 'utf8');
      assert.ok(/form[^>]*data-notify/.test(html), `${product.id}: visitor can sign up`);
      assert.ok(/input[^>]*type="email"/.test(html), `${product.id}: email control`);
      assert.ok(/Not taking reservations yet|Reservations are not open yet/.test(html), `${product.id}: honest reason`);
      assert.ok(!/<form[^>]*data-add/.test(html), `${product.id}: no order before checkout opens`);
      assert.deepEqual(listFor(releaseOf(brand, product.id)), { list: 'waitlist', reason: 'not_accepting' }, `${product.id}: API files the form on the waitlist`);
    }
  });
}
