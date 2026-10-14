// Dependency-free tests: `node --test test/`. No network: Stripe and Resend are fakes.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  signToken, verifyToken, resolvePrivateFile, handleFulfilment, handleDownload, loadCatalog, _resetSeen
} from '../src/fulfilment/index.js';
import { buildRouteIndex, resolveService } from '../src/router.js';

const catalog = loadCatalog();
const routes = JSON.parse(fs.readFileSync(new URL('../routes.json', import.meta.url), 'utf8'));
const LL_MONTHLY = catalog.products['layoffleads-pro-monthly'].paymentLink;
const PACK = catalog.products['pfb-linkedin-week'].paymentLink;

const ENV = {
  STRIPE_SECRET_KEY_FULFIL: 'sk_test_fake',
  FULFIL_DOWNLOAD_SECRET: 'test-download-secret',
  FULFIL_PUBLIC_URL: 'https://hub.example.test',
  FULFIL_EMAIL_API_KEY: 're_fake',
  FULFIL_FROM_LAYOFFLEADS: 'LayoffLeads <orders@layoffleads.com>',
  FULFIL_FROM_PFB: 'Prompts for Business <orders@promptsforbusiness.com>',
  FULFIL_ALERT_TO: 'alerts@example.test',
};

function session(over = {}) {
  return {
    id: 'cs_test_1', object: 'checkout.session', payment_status: 'paid', payment_link: 'plink_ll',
    subscription: 'sub_1', amount_total: 4900, currency: 'usd',
    customer_details: { email: 'buyer@example.test' }, ...over,
  };
}

function fakeStripe({ ev, links = { plink_ll: LL_MONTHLY, plink_pack: PACK, plink_other: 'https://buy.stripe.com/other' } }) {
  const meta = {};
  const calls = { updates: 0 };
  const obj = (kind) => ({
    retrieve: async (id) => ({ id, metadata: meta[`${kind}:${id}`] || {} }),
    update: async (id, { metadata }) => { calls.updates++; meta[`${kind}:${id}`] = { ...(meta[`${kind}:${id}`] || {}), ...metadata }; return {}; },
  });
  return {
    calls,
    events: { retrieve: async (id) => { if (id !== ev.id) throw Object.assign(new Error('nf'), { statusCode: 404 }); return ev; } },
    paymentLinks: { retrieve: async (id) => ({ id, url: links[id] }) },
    subscriptions: obj('sub'),
    paymentIntents: obj('pi'),
  };
}

function fakeFetch() {
  const sent = [];
  const f = async (url, init) => {
    assert.equal(url, 'https://api.resend.com/emails');
    sent.push({ body: JSON.parse(init.body), key: init.headers['Idempotency-Key'] });
    return { ok: true, status: 200 };
  };
  f.sent = sent;
  return f;
}

const quiet = () => {};

test('token round-trip, tamper and expiry', () => {
  const t = signToken({ f: 'pfb/x.md', s: 'cs_1', exp: 2000 }, 'k');
  assert.equal(verifyToken(t, 'k', 1000).f, 'pfb/x.md');
  assert.equal(verifyToken(t, 'k', 3000), null);
  assert.equal(verifyToken(t, 'other', 1000), null);
  assert.equal(verifyToken(t.slice(0, -2) + 'AA', 'k', 1000), null);
});

test('private file resolution blocks traversal', () => {
  assert.equal(resolvePrivateFile('../routes.json', '/tmp/p'), null);
  assert.equal(resolvePrivateFile('/etc/passwd', '/tmp/p'), null);
  assert.equal(resolvePrivateFile('pfb/a.md', '/tmp/p'), '/tmp/p/pfb/a.md');
});

test('catalog covers the 15 Payment Links', () => {
  assert.equal(Object.keys(catalog.products).length, 15);
  for (const p of Object.values(catalog.products)) assert.match(p.paymentLink, /^https:\/\/buy\.stripe\.com\//);
});

test('test-mode paid session: customer email + alert, then idempotent replay', async () => {
  _resetSeen();
  const ev = { id: 'evt_1', type: 'checkout.session.completed', livemode: false, data: { object: session() } };
  const stripe = fakeStripe({ ev });
  const fetchImpl = fakeFetch();
  const r = await handleFulfilment('evt_1', { env: ENV, stripe, catalog, fetchImpl, log: quiet });
  assert.equal(r.status, 200);
  assert.equal(r.body.product, 'layoffleads-pro-monthly');
  assert.equal(fetchImpl.sent.length, 2);
  const [cust, alert] = fetchImpl.sent;
  assert.deepEqual(cust.body.to, ['buyer@example.test']);
  assert.equal(cust.key, 'fulfil-customer-cs_test_1');
  assert.match(cust.body.text, /https:\/\/hub\.example\.test\/api\/fulfil\/download\?t=/);
  assert.deepEqual(alert.body.to, ['alerts@example.test']);
  assert.match(alert.body.subject, /\[sale TEST\]/);
  assert.equal(stripe.calls.updates, 1);

  // Same event again (in-memory) and a new event id for the same session (durable marker).
  assert.equal((await handleFulfilment('evt_1', { env: ENV, stripe, catalog, fetchImpl, log: quiet })).body.duplicate, true);
  _resetSeen();
  ev.id = 'evt_2';
  assert.equal((await handleFulfilment('evt_2', { env: ENV, stripe, catalog, fetchImpl, log: quiet })).body.duplicate, true);
  assert.equal(fetchImpl.sent.length, 2);
});

test('pack link delivers the pack file; download link serves it', async () => {
  _resetSeen();
  const ev = { id: 'evt_3', type: 'checkout.session.completed', livemode: false,
    data: { object: session({ id: 'cs_test_3', payment_link: 'plink_pack', subscription: null, payment_intent: 'pi_3', amount_total: 1400 }) } };
  const fetchImpl = fakeFetch();
  const r = await handleFulfilment('evt_3', { env: ENV, stripe: fakeStripe({ ev }), catalog, fetchImpl, log: quiet });
  assert.equal(r.body.product, 'pfb-linkedin-week');
  const url = /(https:\/\/\S+)/.exec(fetchImpl.sent[0].body.text)[1];
  const token = new URL(url).searchParams.get('t');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fulfil-'));
  fs.mkdirSync(path.join(dir, 'pfb'));
  fs.writeFileSync(path.join(dir, 'pfb', 'linkedin-week.md'), '# pack');
  const d = handleDownload(token, { env: ENV, privateDir: dir });
  assert.equal(d.status, 200);
  assert.equal(d.file, path.join(dir, 'pfb', 'linkedin-week.md'));
  assert.equal(handleDownload(token + 'x', { env: ENV, privateDir: dir }).status, 403);
});

test('live mode is blocked without FULFIL_ALLOW_LIVE, and a live key is refused', async () => {
  _resetSeen();
  const ev = { id: 'evt_4', type: 'checkout.session.completed', livemode: true, data: { object: session() } };
  const fetchImpl = fakeFetch();
  const r = await handleFulfilment('evt_4', { env: ENV, stripe: fakeStripe({ ev }), catalog, fetchImpl, log: quiet });
  assert.deepEqual(r.body, { ignored: 'livemode' });
  const r2 = await handleFulfilment('evt_4', { env: { ...ENV, STRIPE_SECRET_KEY_FULFIL: 'sk_live_x' }, stripe: fakeStripe({ ev }), catalog, fetchImpl, log: quiet });
  assert.equal(r2.status, 503);
  assert.equal(fetchImpl.sent.length, 0);
});

test('unpaid, foreign links and other event types are ignored', async () => {
  _resetSeen();
  for (const [obj, type] of [
    [session({ payment_status: 'unpaid' }), 'checkout.session.completed'],
    [session({ payment_link: 'plink_other' }), 'checkout.session.completed'],
    [session(), 'checkout.session.expired'],
  ]) {
    const ev = { id: `evt_${Math.random().toString(36).slice(2)}`, type, livemode: false, data: { object: obj } };
    const fetchImpl = fakeFetch();
    const r = await handleFulfilment(ev.id, { env: ENV, stripe: fakeStripe({ ev }), catalog, fetchImpl, log: quiet });
    assert.equal(r.status, 200);
    assert.ok(r.body.ignored);
    assert.equal(fetchImpl.sent.length, 0);
  }
});

test('email provider 5xx asks Stripe to retry', async () => {
  _resetSeen();
  const ev = { id: 'evt_5', type: 'checkout.session.completed', livemode: false, data: { object: session({ id: 'cs_test_5' }) } };
  const fetchImpl = async () => ({ ok: false, status: 503 });
  const r = await handleFulfilment('evt_5', { env: ENV, stripe: fakeStripe({ ev }), catalog, fetchImpl, log: quiet });
  assert.equal(r.status, 502);
});

test('FULFIL_LINK_MAP maps a test-mode link', async () => {
  _resetSeen();
  const ev = { id: 'evt_6', type: 'checkout.session.completed', livemode: false, data: { object: session({ id: 'cs_test_6', payment_link: 'plink_testmode' }) } };
  const env = { ...ENV, FULFIL_LINK_MAP: JSON.stringify({ plink_testmode: 'pfb-all-access' }) };
  const r = await handleFulfilment('evt_6', { env, stripe: fakeStripe({ ev }), catalog, fetchImpl: fakeFetch(), log: quiet });
  assert.equal(r.body.product, 'pfb-all-access');
});

test('hub routes Payment Link sessions on the mdo3 account to fulfilment, last', async () => {
  const index = buildRouteIndex(routes);
  const ev = { id: 'evt_7', type: 'checkout.session.completed', data: { object: { object: 'checkout.session', payment_link: 'plink_x' } } };
  assert.deepEqual(await resolveService(ev, { index, account: 'mdo3' }), { service: 'fulfilment', routedBy: 'payment_link' });
  assert.equal((await resolveService(ev, { index, account: 'other' })).service, null);
  // A serviceName still wins over the payment_link fallback.
  const ev2 = { ...ev, data: { object: { ...ev.data.object, metadata: { serviceName: 'rigor' } } } };
  assert.equal((await resolveService(ev2, { index, account: 'mdo3' })).service, 'rigor');
});
