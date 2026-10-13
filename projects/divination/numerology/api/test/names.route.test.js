// Route tests for /api/names/* with a STUBBED Stripe client (no network, no keys).
// Run: node --test test/names.*.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createNamesRouter } from '../src/routes/namesReport.js';
import { sessionProblem } from '../src/names/verify.js';
import { jsonErrorHandler } from '../src/httpErrors.js';

const PLINK = 'plink_TESTnames123';
const id = n => `cs_test_${String(n).padEnd(24, 'a')}`;

function session(over = {}) {
  return {
    id: id('paid'), object: 'checkout.session', mode: 'payment', status: 'complete',
    payment_status: 'paid', currency: 'usd', amount_subtotal: 299, amount_total: 299,
    total_details: { amount_discount: 0 }, payment_link: PLINK, created: 1760000000,
    customer_details: { email: 'buyer@example.com' },
    line_items: { data: [{ description: 'Premium Name Report' }] },
    payment_intent: { latest_charge: { payment_method_details: { card: { last4: '4242' } } } },
    ...over,
  };
}

const SESSIONS = {
  [id('paid')]: session(),
  [id('unpaid')]: session({ id: id('unpaid'), payment_status: 'unpaid', status: 'open' }),
  [id('wronglink')]: session({ id: id('wronglink'), payment_link: 'plink_other' }),
  [id('promo50')]: session({ id: id('promo50'), amount_total: 150, total_details: { amount_discount: 149 } }),
  [id('cheap')]: session({ id: id('cheap'), amount_subtotal: 100, amount_total: 100 }),
  [id('eur')]: session({ id: id('eur'), currency: 'eur' }),
};

function stubStripe(calls) {
  return {
    checkout: {
      sessions: {
        async retrieve(sid, params) {
          calls.push(['retrieve', sid, params]);
          if (sid === id('boom')) { const e = new Error('network'); e.statusCode = 500; throw e; }
          if (!SESSIONS[sid]) { const e = new Error('No such checkout.session'); e.statusCode = 404; e.code = 'resource_missing'; throw e; }
          return SESSIONS[sid];
        },
        async list(params) {
          calls.push(['list', params]);
          const email = params.customer_details?.email;
          const data = Object.values(SESSIONS).filter(s => s.customer_details.email === email &&
            (!params.payment_link || s.payment_link === params.payment_link) && s.status === params.status);
          return { data };
        },
        // Any write would be a bug: make it loud.
        async update() { throw new Error('WRITE ATTEMPTED'); },
        async create() { throw new Error('WRITE ATTEMPTED'); },
      },
    },
  };
}

async function withServer(routerOpts, fn) {
  const calls = [];
  const app = express();
  app.use('/api/names', createNamesRouter({ stripe: stubStripe(calls), plinkId: PLINK, limits: { report: 1000, email: 1000 }, ...routerOpts }));
  app.use(jsonErrorHandler);
  const server = app.listen(0);
  await new Promise(r => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}/api/names`;
  const post = async (path, body, headers = {}) => {
    const res = await fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
    return { status: res.status, headers: res.headers, json: await res.json().catch(() => null) };
  };
  try { await fn({ post, base, calls }); } finally { server.close(); }
}

test('paid session on the right Payment Link -> 200 with report + text', async () => {
  await withServer({}, async ({ post, calls }) => {
    const r = await post('/report', { session_id: id('paid'), name: 'olivia', surname: 'Butts', siblings: ['Mia'] });
    assert.equal(r.status, 200);
    assert.equal(r.json.success, true);
    assert.equal(r.json.report.fullName, 'Olivia Butts');
    assert.equal(r.json.report.popularity.ranks[0].rank, 1);
    assert.match(r.json.text, /NUMEROLOGY/);
    assert.deepEqual(calls[0][2], { expand: ['line_items'] });
    assert.ok(calls.every(c => c[0] === 'retrieve' || c[0] === 'list'), 'read-only Stripe calls');
  });
});

test('MDOEARLY50 (50% promo) session is accepted: subtotal is full price', async () => {
  await withServer({}, async ({ post }) => {
    const r = await post('/report', { session_id: id('promo50'), name: 'Ava' });
    assert.equal(r.status, 200);
  });
});

test('unpaid / unknown / malformed / wrong link / cheap / non-USD -> 402', async () => {
  await withServer({}, async ({ post }) => {
    for (const sid of [id('unpaid'), id('nosuch'), 'garbage', undefined, id('wronglink'), id('cheap'), id('eur')]) {
      const r = await post('/report', { session_id: sid, name: 'Ava' });
      assert.equal(r.status, 402, `session ${sid}`);
      assert.equal(r.json.success, false);
      assert.equal(r.json.reason, undefined, 'internal reason not leaked');
    }
  });
});

test('Stripe outage -> 502, bad input -> 400 (before any Stripe call)', async () => {
  await withServer({}, async ({ post, calls }) => {
    assert.equal((await post('/report', { session_id: id('boom'), name: 'Ava' })).status, 502);
    const n = calls.length;
    assert.equal((await post('/report', { session_id: id('paid'), name: '<b>' })).status, 400);
    assert.equal((await post('/report', '{bad json')).status, 400);
    assert.equal(calls.length, n);
  });
});

test('use cap: 5 distinct names per purchase; repeating a name is free', async () => {
  await withServer({ maxReports: 5 }, async ({ post }) => {
    for (const n of ['Ava', 'Mia', 'Emma', 'Noah', 'Liam']) {
      assert.equal((await post('/report', { session_id: id('paid'), name: n })).status, 200);
    }
    assert.equal((await post('/report', { session_id: id('paid'), name: 'ava' })).status, 200);
    const r = await post('/report', { session_id: id('paid'), name: 'Henry' });
    assert.equal(r.status, 402);
    assert.match(r.json.error, /already been used/);
  });
});

test('report-by-email: email + card last4 finds the purchase; anything else -> 402', async () => {
  await withServer({}, async ({ post, calls }) => {
    const ok = await post('/report-by-email', { email: 'Buyer@Example.com', card_last4: '4242', name: 'Theodore' });
    assert.equal(ok.status, 200);
    assert.equal(ok.json.report.name, 'Theodore');
    assert.equal(ok.json.session_id, undefined, 'session id not exposed');
    const listCall = calls.find(c => c[0] === 'list');
    assert.equal(listCall[1].payment_link, PLINK);
    assert.equal(listCall[1].status, 'complete');
    for (const body of [
      { email: 'buyer@example.com', card_last4: '0000', name: 'Ava' },
      { email: 'nobody@example.com', card_last4: '4242', name: 'Ava' },
      { email: 'not-an-email', card_last4: '4242', name: 'Ava' },
      { email: 'buyer@example.com', name: 'Ava' },
    ]) {
      const r = await post('/report-by-email', body);
      assert.equal(r.status, 402, JSON.stringify(body));
    }
  });
});

test('CORS: only https://names.mdo3d.com is allowed', async () => {
  await withServer({}, async ({ base }) => {
    const pre = await fetch(base + '/report', { method: 'OPTIONS', headers: { Origin: 'https://names.mdo3d.com', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' } });
    assert.equal(pre.headers.get('access-control-allow-origin'), 'https://names.mdo3d.com');
    const evil = await fetch(base + '/report', { method: 'OPTIONS', headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'POST' } });
    assert.notEqual(evil.headers.get('access-control-allow-origin'), 'https://evil.example');
  });
});

test('rate limit -> 429', async () => {
  await withServer({ limits: { report: 2, email: 1 } }, async ({ post }) => {
    await post('/report', { session_id: id('paid'), name: 'Ava' });
    await post('/report', { session_id: id('paid'), name: 'Ava' });
    assert.equal((await post('/report', { session_id: id('paid'), name: 'Ava' })).status, 429);
    await post('/report-by-email', { email: 'buyer@example.com', card_last4: '4242', name: 'Ava' });
    assert.equal((await post('/report-by-email', { email: 'buyer@example.com', card_last4: '4242', name: 'Ava' })).status, 429);
  });
});

test('without a plink id, sessions match by line-item name', () => {
  assert.equal(sessionProblem(session({ payment_link: 'plink_x' }), { plinkId: '' }), null);
  assert.equal(sessionProblem(session({ line_items: { data: [{ description: 'Tarot Reading' }] } }), { plinkId: '' }), 'different product');
  // 100%-off promotion: accepted only with a discount and full subtotal
  assert.equal(sessionProblem(session({ payment_status: 'no_payment_required', amount_total: 0, total_details: { amount_discount: 299 } }), { plinkId: PLINK }), null);
  assert.equal(sessionProblem(session({ payment_status: 'no_payment_required', amount_total: 0 }), { plinkId: PLINK }), 'not paid');
});
