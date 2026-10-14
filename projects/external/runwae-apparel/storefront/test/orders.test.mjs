import './_cleanup.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import handler, { verifySignature, signPayload, processEvent } from '../api/stripe-webhook.mjs';
import { customerEmail, shopEmail, sampleOrder, shipRule, deliver, orderFromSession, ordersInbox, ordersFrom } from '../core/email.mjs';
import { receive, readLedger, replay } from '../core/stock.mjs';
import { loadBrand, ROOT, brandIds } from '../core/build.mjs';
import { templateRoot } from './_fixtures.mjs';

const SECRET = 'whsec_test_secret';
const fakeRes = () => ({ statusCode: 0, headers: {}, body: '', setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b; } });
const lineItem = (product, size, qty, extra = {}) => ({ description: `Example Tee, Black, ${size}`, quantity: qty, amount_total: 4800 * qty, price: { unit_amount: 4800, product: { metadata: { brand: 'demo', product, size, color: 'black', qty: String(qty), ...extra } } } });
const session = (id, items, extra = {}) => ({ id, object: 'checkout.session', created: 1793534400, livemode: false, payment_status: 'paid', currency: 'usd', amount_subtotal: 9600, amount_total: 10200,
  total_details: { amount_shipping: 600, amount_tax: 0 }, customer_details: { email: 'buyer@example.com', name: 'Ada Buyer' },
  shipping_details: { name: 'Ada Buyer', address: { line1: '1 Main St', city: 'Austin', state: 'TX', postal_code: '78701', country: 'US' } },
  metadata: { brand: 'demo', reservation: 'rsv_1' }, line_items: { data: items }, ...extra });
const event = (id, type, obj) => ({ id, type, data: { object: obj } });

test('webhook signature: valid, tampered, wrong secret, stale, missing', () => {
  const body = JSON.stringify({ id: 'evt_1' });
  const now = Date.now();
  const sig = signPayload(body, SECRET, Math.floor(now / 1000));
  assert.equal(verifySignature(body, sig, SECRET, { now }), true);
  assert.equal(verifySignature(`${body} `, sig, SECRET, { now }), false);
  assert.equal(verifySignature(body, sig, 'whsec_other', { now }), false);
  assert.equal(verifySignature(body, sig, SECRET, { now: now + 10 * 60 * 1000 }), false, 'outside the 5 min tolerance');
  assert.equal(verifySignature(body, undefined, SECRET, { now }), false);
  assert.equal(verifySignature(body, 't=1,v1=zz', SECRET, { now }), false);
});

test('webhook handler: 503 without a secret, 400 on a bad signature', async () => {
  const saved = process.env.STRIPE_WEBHOOK_SECRET;
  try {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    let res = fakeRes();
    await handler({ method: 'POST', body: '{}', headers: {} }, res);
    assert.equal(res.statusCode, 503);
    process.env.STRIPE_WEBHOOK_SECRET = SECRET;
    res = fakeRes();
    await handler({ method: 'POST', body: '{"id":"evt"}', headers: { 'stripe-signature': 't=1,v1=00' } }, res);
    assert.equal(res.statusCode, 400);
  } finally { if (saved === undefined) delete process.env.STRIPE_WEBHOOK_SECRET; else process.env.STRIPE_WEBHOOK_SECRET = saved; }
});

test('checkout.session.completed: order recorded, stock decremented once, both emails to outbox without a key; idempotent', async () => {
  const { root } = templateRoot(ROOT, mkdtempSync(join(tmpdir(), 'sf-wh-')), 'demo', { 'example-tee': { status: 'available', fulfilment: 'stock', stock: 0, low: 3, price: '4800' } });
  await receive(root, { sku: 'demo/example-tee/black/M', qty: 5, ref: 'PO-1' });
  const ev = event('evt_A', 'checkout.session.completed', session('cs_test_a1b2c3d4e5', [lineItem('example-tee', 'M', 2)]));
  const env = { SITE_URL: 'https://shop.example.com' };
  const logs = [];
  const orig = console.log; console.log = (m) => logs.push(String(m));
  let r1, r2, r3;
  try {
    r1 = await processEvent(ev, { root, env });
    r2 = await processEvent(ev, { root, env });
    r3 = await processEvent({ ...ev, id: 'evt_B' }, { root, env }); // Stripe re-sent under a new id: same order
  } finally { console.log = orig; }
  assert.equal(r1.status, 200);
  assert.equal(r1.body.order, 'EX-B2C3D4E5');
  assert.equal(r2.body.duplicate, true, 'same event id');
  assert.equal(r3.body.duplicate, true, 'same order');
  const sales = readLedger(root).filter((m) => m.kind === 'sale');
  assert.equal(sales.length, 1);
  assert.equal(replay(readLedger(root)).get('demo/example-tee/black/M').on_hand, 3);
  const orders = readFileSync(join(root, 'orders', 'orders.jsonl'), 'utf8').trim().split('\n');
  assert.equal(orders.length, 1);
  assert.equal(JSON.parse(orders[0]).low_alerts[0].after, 3);
  const box = readdirSync(join(root, 'outbox'));
  assert.equal(box.filter((f) => f.endsWith('.html')).length, 2, 'shop + customer, once');
  assert.ok(logs.some((l) => /not sent \(no RESEND_API_KEY\)/.test(l)));
  const shop = readFileSync(join(root, 'outbox', box.find((f) => /_shop\.txt$/.test(f))), 'utf8');
  assert.match(shop, /To: orders@example\.com/);
  assert.match(shop, /LOW STOCK/);
  assert.match(shop, /1 Main St/);
});

test('checkout.session.expired releases the hold', async () => {
  const { root } = templateRoot(ROOT, mkdtempSync(join(tmpdir(), 'sf-whx-')), 'demo', { 'example-tee': { status: 'available', fulfilment: 'stock', stock: 0, price: '4800' } });
  const { reserve } = await import('../core/stock.mjs');
  await receive(root, { sku: 'demo/example-tee/black/S', qty: 1, ref: 'PO-1' });
  assert.equal((await reserve(root, { lines: [{ sku: 'demo/example-tee/black/S', qty: 1 }], ref: 'rsv_x' })).ok, true);
  const r = await processEvent(event('evt_X', 'checkout.session.expired', { id: 'cs_test_x', metadata: { brand: 'demo', reservation: 'rsv_x' } }), { root, env: {} });
  assert.equal(r.body.released, true);
  assert.equal(replay(readLedger(root)).get('demo/example-tee/black/S').reserved, 0);
});

test('customer emails stay in test mode: never to a real address without EMAIL_LIVE', async () => {
  const brand = loadBrand('runwae').brand;
  const msg = customerEmail(sampleOrder(brand, loadBrand('runwae').catalog), brand);
  const calls = [];
  const fetchImpl = async (url, init) => { calls.push(JSON.parse(init.body)); return { ok: true, status: 200 }; };
  const dir = mkdtempSync(join(tmpdir(), 'sf-out-'));
  const quiet = console.log; console.log = () => {};
  try {
    let r = await deliver(msg, { env: { RESEND_API_KEY: 're_test' }, outbox: dir, fetchImpl });
    assert.equal(r.sent, false); assert.equal(calls.length, 0, 'no send: no test inbox set');
    r = await deliver(msg, { env: { RESEND_API_KEY: 're_test', EMAIL_TEST_TO: 'qa@example.com' }, outbox: dir, fetchImpl });
    assert.equal(r.sent, true); assert.deepEqual(calls[0].to, ['qa@example.com']);
    r = await deliver(msg, { env: { RESEND_API_KEY: 're_test', EMAIL_LIVE: 'true' }, outbox: dir, fetchImpl });
    assert.deepEqual(calls[1].to, ['customer@example.com']);
    r = await deliver(msg, { env: {}, outbox: dir, fetchImpl });
    assert.equal(r.reason, 'no RESEND_API_KEY');
    r = await deliver(msg, { env: { RESEND_API_KEY: 're_test', EMAIL_LIVE: 'true' }, outbox: dir, fetchImpl: async () => { throw new Error('down'); } });
    assert.equal(r.sent, false, 'a send failure never throws');
  } finally { console.log = quiet; }
});

test('both emails render for every brand: branded, accessible, small corners, with the right links', () => {
  for (const id of brandIds()) {
    const { brand, catalog } = loadBrand(id);
    const o = sampleOrder(brand, catalog);
    const c = customerEmail(o, brand);
    const s = shopEmail(o, brand, { adminUrl: 'http://localhost/_admin/' });
    assert.equal(c.from, `${brand.from_name} <${ordersFrom(brand)}>`);
    assert.match(ordersFrom(brand), new RegExp(`^orders@${brand.domain.replace(/^store\./, '').replace(/\./g, '\\.')}$`), id);
    assert.equal(s.to, ordersInbox(brand));
    for (const m of [c, s]) {
      assert.match(m.html, /<html lang="en">/);
      assert.match(m.html, new RegExp(brand.tokens.colors.bg));
      for (const r of m.html.matchAll(/border-radius:(\d+)px/g)) assert.ok(Number(r[1]) <= 4, `${id}: radius ${r[1]}`);
      assert.ok(m.text.length > 50 && !/<[a-z]/.test(m.text), 'plain-text version');
      assert.doesNotMatch(m.html + m.text, /\bAHL\b|Anne Huntington|digital only/i);
    }
    assert.match(c.text, new RegExp(`https://${brand.domain.replace(/\./g, '\\.')}/orders\\.html`));
    assert.match(c.html, /policies\.html/);
    assert.match(c.text, new RegExp(o.number));
    assert.match(s.html, /localhost\/_admin/);
    assert.match(s.text, /Ship to:\n.*Sample Customer/);
    assert.match(s.text, /sample-drop/);
  }
});

test('mixed pre-order orders: "Everything ships together by <latest date>"', () => {
  const lines = [{ preorder: true, ship_by: '2027-01-03', drop: 'a' }, { preorder: true, ship_by: '2027-01-20', drop: 'b' }, { preorder: false }];
  assert.match(shipRule(lines).ship_text, /mixes in-stock and pre-order pieces\. Everything ships together by January 20, 2027/);
  assert.equal(shipRule(lines).ship_by, '2027-01-20');
  assert.match(shipRule(lines.slice(0, 2)).ship_text, /more than one drop\. Everything ships together by January 20, 2027/);
  assert.equal(shipRule([{ preorder: true, ship_by: '2027-01-03', drop: 'a' }]).ship_text, 'Pre-order. Ships by January 3, 2027.');
  const brand = loadBrand('glb').brand;
  const o = orderFromSession(session('cs_test_mix12345', [lineItem('icon-tee', 'M', 1, { drop: 'first-drop', ship_by: '2027-01-03' }), lineItem('crew-love-tee', 'L', 1)]), [lineItem('icon-tee', 'M', 1, { drop: 'first-drop', ship_by: '2027-01-03' }), lineItem('crew-love-tee', 'L', 1)], brand);
  const c = customerEmail(o, brand);
  assert.match(c.text, /Everything ships together by January 3, 2027/);
  assert.match(c.html, /Pre-order, ships by January 3, 2027/);
});

test('admin email previews are linked from the admin page (all-brands build output)', () => {
  const idx = join(ROOT, 'dist', '_admin', 'index.html');
  if (!existsSync(idx)) return; // built by `node src/build.mjs`; the build tests cover buildAdmin directly
  const html = readFileSync(idx, 'utf8');
  for (const id of brandIds()) for (const k of ['shop', 'customer']) assert.match(html, new RegExp(`emails/${id}-${k}\\.html`));
});
