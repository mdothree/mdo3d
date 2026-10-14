import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler, { sessionParams, keyAllowed, loadCatalog } from '../api/checkout.mjs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const cat = () => ({
  brand: { id: 'runwae', shipping: { flat_cents: 600 } },
  products: [
    { id: 'hood', name: 'Hood', description: 'd', sizes: ['M', 'L'], channel: 'preorder', status: 'live', price_cents: 6500 },
    { id: 'tee', name: 'Tee', description: 'd', sizes: ['M'], channel: 'printful', status: 'live', price_cents: 3200 },
    { id: 'draft', name: 'Draft', description: 'd', sizes: ['M'], channel: 'printful', status: 'draft', price_cents: 3200 },
  ],
  drops: [{ id: 'd1', products: ['hood'], window: { open: '2026-11-01T00:00:00Z', close: '2026-11-15T00:00:00Z' }, schedule: {} }],
});
const opts = { siteUrl: 'https://example.test', now: new Date('2026-11-05T00:00:00Z') };

test('keyAllowed: test keys only unless live is explicitly allowed', () => {
  assert.equal(keyAllowed('sk_test_x', {}), true);
  assert.equal(keyAllowed('rk_test_x', {}), true);
  assert.equal(keyAllowed('sk_live_x', {}), false);
  assert.equal(keyAllowed('sk_live_x', { ALLOW_LIVE_STRIPE: 'true' }), true);
  assert.equal(keyAllowed('pk_test_x', {}), false);
  assert.equal(keyAllowed(undefined, {}), false);
});

test('sessionParams: pre-order uses server price, ship-by and metadata', () => {
  const { params } = sessionParams(cat(), { product: 'hood', size: 'L', qty: 2, price_cents: 1 }, opts);
  assert.equal(params['line_items[0][price_data][unit_amount]'], '6500'); // client price ignored
  assert.equal(params['line_items[0][quantity]'], '2');
  assert.equal(params['metadata[ship_by]'], '2027-01-03');
  assert.equal(params['metadata[drop]'], 'd1');
  assert.equal(params['automatic_tax[enabled]'], 'true');
  assert.match(params['custom_text[submit][message]'], /ships by 2027-01-03.*exchanges only/);
  assert.equal(params.mode, 'payment');
});

test('sessionParams: rejections', () => {
  const c = cat();
  assert.equal(sessionParams(c, { product: 'nope', size: 'M' }, opts).status, 404);
  assert.equal(sessionParams(c, { product: 'hood', size: 'XS' }, opts).status, 400);
  assert.equal(sessionParams(c, { product: 'hood', size: 'M', qty: 9 }, opts).status, 400);
  assert.equal(sessionParams(c, { product: 'hood', size: 'M', qty: 1.5 }, opts).status, 400);
  assert.equal(sessionParams(c, { product: 'draft', size: 'M' }, opts).status, 409);
  assert.equal(sessionParams(c, { product: 'hood', size: 'M' }, { ...opts, now: new Date('2026-12-01') }).status, 409);
  assert.equal(sessionParams(c, { product: 'tee', size: 'M' }, { ...opts, siteUrl: '' }).status, 500);
  c.brand.shipping.flat_cents = null;
  assert.equal(sessionParams(c, { product: 'tee', size: 'M' }, opts).status, 500);
  assert.equal(sessionParams(c, null, opts).status, 400);
  c.products.push({ id: 'dig', name: 'D', description: 'd', format: 'digital', status: 'live', price_cents: 900, channel: 'printful' });
  assert.equal(sessionParams(c, { product: 'dig', size: 'M' }, opts).status, 409);
});

test('every real brand catalog has nothing purchasable (unpriced) and no Poison/Pave', () => {
  for (const id of ['runwae', 'glb', 'buttsstudios', 'ridgefield']) {
    const real = loadCatalog(id, ROOT);
    assert.ok(real.products.length >= 1, id);
    for (const p of real.products) {
      assert.equal(p.price_cents, null, `${id}/${p.id} must stay unpriced until the Principal sets a price`);
      assert.doesNotMatch(p.id, /poison|pave/);
      if (p.sizes?.length) assert.equal(sessionParams(real, { product: p.id, size: p.sizes[0], color: p.colors?.[0]?.id }, opts).status, 409, `${id}/${p.id}`);
    }
  }
  const rw = loadCatalog('runwae', ROOT);
  const w = rw.products.find((p) => p.id === 'wordmark-tee');
  assert.deepEqual(w.source_images, ['Fall 21/FB1_2048x2048.png'], 'wordmark tee is front-only (#82-d)');
  assert.ok(rw.products.every((p) => (p.source_images ?? []).every((i) => !/FB2/.test(i))), 'third-party birdcage art never ships');
  assert.ok(rw.drops.every((d) => d.products.every((x) => !/poison|pave/.test(x))));
});

test('multi-line cart: one line_item per line, per-line metadata, latest ship-by wins', () => {
  const c = cat();
  c.products.push({ id: 'cap2', name: 'Late Hood', description: 'd', sizes: ['M'], channel: 'preorder', status: 'preorder', price_cents: 7000, colors: [{ id: 'ink', name: 'Ink', hex: '#000' }] });
  c.drops.push({ id: 'd2', products: ['cap2'], window: { open: '2026-11-01T00:00:00Z', close: '2026-11-25T00:00:00Z' }, schedule: {} });
  const r = sessionParams(c, { lines: [
    { product: 'tee', size: 'M', qty: 2 },
    { product: 'hood', size: 'L', qty: 1 },
    { product: 'cap2', size: 'M', color: 'ink', qty: 1, price_cents: 1 },
  ] }, opts);
  const p = r.params;
  assert.equal(p['line_items[0][quantity]'], '2');
  assert.equal(p['line_items[0][price_data][unit_amount]'], '3200');
  assert.equal(p['line_items[0][price_data][product_data][metadata][product]'], 'tee');
  assert.equal(p['line_items[0][price_data][product_data][metadata][ship_by]'], undefined, 'in-stock line has no ship_by');
  assert.equal(p['line_items[1][price_data][product_data][metadata][drop]'], 'd1');
  assert.equal(p['line_items[1][price_data][product_data][metadata][ship_by]'], '2027-01-03');
  assert.equal(p['line_items[2][price_data][unit_amount]'], '7000', 'client price ignored');
  assert.equal(p['line_items[2][price_data][product_data][metadata][color]'], 'ink');
  assert.equal(p['line_items[2][price_data][product_data][metadata][ship_by]'], '2027-01-13');
  assert.equal(p['line_items[2][price_data][product_data][metadata][brand]'], 'runwae');
  assert.equal(p['metadata[ship_by]'], '2027-01-13', 'order ships when its latest item is ready');
  assert.equal(p['metadata[drop]'], 'd1,d2');
  assert.equal(p['metadata[lines]'], '3');
  assert.match(p['custom_text[submit][message]'], /ships by 2027-01-13 \(the whole order ships together when its latest item is ready\)/);
  assert.equal(p['shipping_options[0][shipping_rate_data][display_name]'], 'Ships by 2027-01-13');
  assert.equal(r.mixed, true);
  assert.equal(p.cancel_url, 'https://example.test/cart.html');
});

test('multi-line cart: rejections', () => {
  const c = cat();
  assert.equal(sessionParams(c, { lines: [] }, opts).status, 400);
  assert.equal(sessionParams(c, { lines: Array.from({ length: 11 }, () => ({ product: 'tee', size: 'M' })) }, opts).status, 400);
  assert.equal(sessionParams(c, { lines: [{ product: 'tee', size: 'M' }, { product: 'tee', size: 'M' }] }, opts).status, 400, 'duplicate lines');
  assert.equal(sessionParams(c, { lines: [{ product: 'tee', size: 'M' }, { product: 'draft', size: 'M' }] }, opts).status, 409, 'one bad line rejects the order');
  c.products[1].colors = [{ id: 'a', name: 'A', hex: '#000' }, { id: 'b', name: 'B', hex: '#fff' }];
  assert.equal(sessionParams(c, { lines: [{ product: 'tee', size: 'M', color: 'z' }] }, opts).status, 400);
  assert.equal(sessionParams(c, { lines: [{ product: 'tee', size: 'M', color: 'b' }] }, opts).params['line_items[0][price_data][product_data][name]'], 'Tee, B, M');
});

function fakeRes() {
  return { statusCode: 0, headers: {}, body: '', setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b; } };
}

test('handler: off by default, refuses live keys, never calls Stripe when disabled', async () => {
  const saved = { ...process.env };
  const realFetch = globalThis.fetch;
  let called = 0;
  globalThis.fetch = async () => { called++; return { ok: false, json: async () => ({}) }; };
  try {
    delete process.env.CHECKOUT_ENABLED;
    let res = fakeRes();
    await handler({ method: 'POST', body: { product: 'tee', size: 'M' } }, res);
    assert.equal(res.statusCode, 503);

    process.env.CHECKOUT_ENABLED = 'true';
    process.env.STRIPE_SECRET_KEY = 'sk_live_abc';
    res = fakeRes();
    await handler({ method: 'POST', body: {} }, res);
    assert.equal(res.statusCode, 503);

    res = fakeRes();
    await handler({ method: 'GET' }, res);
    assert.equal(res.statusCode, 405);
    assert.equal(called, 0);
  } finally {
    process.env = saved;
    globalThis.fetch = realFetch;
  }
});

test('handler: valid request posts form params to Stripe with the test key', async () => {
  const saved = { ...process.env };
  const realFetch = globalThis.fetch;
  const realCwd = process.cwd();
  let seen;
  globalThis.fetch = async (url, init) => { seen = { url, init }; return { ok: true, json: async () => ({ url: 'https://checkout.stripe.test/s' }) }; };
  try {
    Object.assign(process.env, { CHECKOUT_ENABLED: 'true', STRIPE_SECRET_KEY: 'sk_test_abc', BRAND: 'runwae', SITE_URL: 'https://x.test' });
    process.chdir(ROOT);
    const res = fakeRes();
    await handler({ method: 'POST', body: JSON.stringify({ product: 'tlt-face-hoodie', size: 'M' }) }, res);
    // the real catalog is all draft -> 409, and Stripe is never called
    assert.equal(res.statusCode, 409);
    assert.equal(seen, undefined);
  } finally {
    process.chdir(realCwd);
    process.env = saved;
    globalThis.fetch = realFetch;
  }
});
