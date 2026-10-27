import './_cleanup.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildBrand, loadBrand } from '../core/build.mjs';
import { listFor, releaseOf } from '../api/notify.mjs';
import { selectSignups } from '../tools/signups.mjs';

for (const brand of ['ridgefield', 'buttsstudios', 'glb', 'runwae']) {
  test(`${brand}: every current piece has a usable waitlist and no purchase control`, async () => {
    const root = mkdtempSync(join(tmpdir(), `shop-waitlist-${brand}-`));
    await buildBrand(brand, root, { env: {} });
    const data = loadBrand(brand);
    const candidates = data.catalog.filter(p => p.listed !== false && p.status !== 'archive');
    assert.ok(candidates.length, 'exercise actual current pieces');
    for (const product of candidates) {
      const html = readFileSync(join(root, data.brand.base_path?.replace(/^\//, '') || '', 'products', `${product.id}.html`), 'utf8');
      assert.ok(/form[^>]*data-notify/.test(html), `${product.id}: visitor can sign up`);
      assert.ok(/input[^>]*type="email"/.test(html), `${product.id}: email control`);
      assert.ok(/Not taking reservations yet|Reservations are not open yet|Not taking orders or reservations yet/.test(html), `${product.id}: honest reason`);
      assert.ok(!/<form[^>]*data-add/.test(html), `${product.id}: no order before checkout opens`);
      assert.deepEqual(listFor(releaseOf(brand, product.id)), { list: 'waitlist', reason: 'not_accepting' }, `${product.id}: API files the form on the waitlist`);
    }
  });
}

test('manufacturing demand excludes verification fixtures and preserves product filters', () => {
  const rows = [
    { seq: 1, brand: 'ridgefield', product: 'hoodie', email: 'first@customer.co', list: 'waitlist' },
    { seq: 2, brand: 'ridgefield', product: 'hoodie', email: 'codex-browser-fixture@example.invalid', list: 'waitlist' },
    { seq: 3, brand: 'buttsstudios', product: 'table-lamp', email: 'second@customer.co', list: 'waitlist' },
  ];
  assert.deepEqual(selectSignups(rows).map(r => r.seq), [1, 3]);
  assert.deepEqual(selectSignups(rows, { brand: 'ridgefield', product: 'hoodie' }).map(r => r.seq), [1]);
  assert.equal(selectSignups(rows, { includeTest: true }).length, 3, 'fixtures remain available for audits');
});
