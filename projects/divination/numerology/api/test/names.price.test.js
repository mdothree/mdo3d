// MDO-NAMES-PRICE (a), 2026-10-14: Baby Names $3 one-time on a NEW Payment Link; the original link stays active.
// Offline: stubbed Stripe client, no network, no keys. Run: node --test test/names.price.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sessionProblem, namesLinks, findPaidSessionByEmail, MIN_PRICE_CENTS } from '../src/names/verify.js';

const NEW = { id: 'plink_NEWnames300', amount_cents: 300, price_id: 'price_NEWnames300' };
const OLD = { id: 'plink_OLDnames299', amount_cents: 299, price_id: null };
const LINKS = [NEW, OLD];

function session(over = {}) {
  return {
    id: 'cs_test_' + 'p'.repeat(24), object: 'checkout.session', mode: 'payment', status: 'complete',
    payment_status: 'paid', currency: 'usd', amount_subtotal: 300, amount_total: 300,
    total_details: { amount_discount: 0 }, payment_link: NEW.id, created: 1760000000,
    customer_details: { email: 'buyer@example.com' },
    line_items: { data: [{ description: 'Premium Name Report', price: { id: NEW.price_id } }] },
    payment_intent: { latest_charge: { payment_method_details: { card: { last4: '4242' } } } },
    ...over,
  };
}

test('$3 session on the new link is accepted (300 >= 300)', () => {
  assert.equal(sessionProblem(session(), { links: LINKS }), null);
});

test('MDOEARLY50 on $3: total 150, subtotal 300 -> accepted (the old >= 299 total check would refuse 150)', () => {
  const s = session({ amount_total: 150, total_details: { amount_discount: 150 } });
  assert.ok(s.amount_total < 299);
  assert.equal(sessionProblem(s, { links: LINKS }), null);
});

test('100%-off promo on $3: no_payment_required with full subtotal + discount -> accepted; without discount -> not paid', () => {
  assert.equal(sessionProblem(session({ payment_status: 'no_payment_required', amount_total: 0, total_details: { amount_discount: 300 } }), { links: LINKS }), null);
  assert.equal(sessionProblem(session({ payment_status: 'no_payment_required', amount_total: 0 }), { links: LINKS }), 'not paid');
});

test('original link (left active, never paused): its 299 sessions still deliver', () => {
  const s = session({ payment_link: OLD.id, amount_subtotal: 299, amount_total: 299, line_items: { data: [{ description: 'Premium Name Report' }] } });
  assert.equal(sessionProblem(s, { links: LINKS }), null);
  assert.equal(sessionProblem({ ...s, amount_total: 150, total_details: { amount_discount: 149 } }, { links: LINKS }), null);
});

test('threshold is per link: 299 on the $3 link is too low; 100 on either link is too low', () => {
  assert.equal(sessionProblem(session({ amount_subtotal: 299, amount_total: 299 }), { links: LINKS }), 'amount too low');
  assert.equal(sessionProblem(session({ amount_subtotal: 100, amount_total: 100 }), { links: LINKS }), 'amount too low');
  assert.equal(sessionProblem(session({ payment_link: OLD.id, amount_subtotal: 100, amount_total: 100 }), { links: LINKS }), 'amount too low');
});

test('other links / other prices are refused', () => {
  assert.equal(sessionProblem(session({ payment_link: 'plink_tarot' }), { links: LINKS }), 'different product');
  assert.equal(sessionProblem(session({ line_items: { data: [{ description: 'x', price: { id: 'price_other' } }] } }), { links: LINKS }), 'different product');
  assert.equal(sessionProblem(session({ currency: 'eur' }), { links: LINKS }), 'wrong currency');
  assert.equal(sessionProblem(session({ mode: 'subscription' }), { links: LINKS }), 'not a one-time payment');
});

test('links.json as committed: placeholders are skipped (no link configured until the GO script fills it)', () => {
  const file = JSON.parse(readFileSync(new URL('../src/names/links.json', import.meta.url), 'utf8'));
  const filled = file.links.filter(l => /^plink_/.test(l.id));
  const placeholders = file.links.filter(l => /^__[A-Z_]+__$/.test(l.id));
  assert.equal(filled.length + placeholders.length, 2);
  const byKey = Object.fromEntries(file.links.map(l => [l.key, l]));
  assert.equal(byKey['names-3usd-2026-10-14'].amount_cents, 300);
  assert.equal(byKey['names-original'].amount_cents, 299);
});

test('namesLinks: filled entries + env ids, placeholders and junk ignored', () => {
  const save = { a: process.env.NAMES_PAYMENT_LINK_ID, b: process.env.NAMES_PAYMENT_LINK_IDS };
  try {
    delete process.env.NAMES_PAYMENT_LINK_ID; delete process.env.NAMES_PAYMENT_LINK_IDS;
    assert.deepEqual(namesLinks({ links: [{ id: '__NAMES_PAYMENT_LINK_ID__', amount_cents: 300 }] }), []);
    const filled = namesLinks({ links: [
      { id: 'plink_NEWnames300', price_id: 'price_NEWnames300', amount_cents: 300 },
      { id: 'plink_OLDnames299', amount_cents: 299 },
      { id: 'plink_bad', amount_cents: 0 },
    ] });
    assert.deepEqual(filled, LINKS);
    process.env.NAMES_PAYMENT_LINK_ID = 'plink_OLDnames299';
    process.env.NAMES_PAYMENT_LINK_IDS = 'plink_envonly, junk ,';
    const withEnv = namesLinks({ links: [{ id: 'plink_NEWnames300', amount_cents: 300 }] });
    assert.deepEqual(withEnv.map(l => [l.id, l.amount_cents]), [['plink_NEWnames300', 300], ['plink_OLDnames299', null], ['plink_envonly', null]]);
    // env-only link: amount unknown -> MIN_PRICE_CENTS floor
    assert.equal(sessionProblem(session({ payment_link: 'plink_envonly', amount_subtotal: MIN_PRICE_CENTS, line_items: { data: [] } }), { links: withEnv }), null);
  } finally {
    for (const [k, v] of [['NAMES_PAYMENT_LINK_ID', save.a], ['NAMES_PAYMENT_LINK_IDS', save.b]]) {
      if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
  }
});

test('email lookup lists each configured link (new + original) and never writes', async () => {
  const calls = [];
  const sessions = [
    session({ id: 'cs_test_' + 'n'.repeat(24), amount_total: 150, total_details: { amount_discount: 150 }, created: 1760000100 }),
    session({ id: 'cs_test_' + 'o'.repeat(24), payment_link: OLD.id, amount_subtotal: 299, amount_total: 299, line_items: { data: [] }, created: 1760000000 }),
  ];
  const stripe = { checkout: { sessions: {
    async list(params) { calls.push(params); return { data: sessions.filter(s => s.payment_link === params.payment_link) }; },
    async create() { throw new Error('WRITE ATTEMPTED'); }, async update() { throw new Error('WRITE ATTEMPTED'); },
  } } };
  const r = await findPaidSessionByEmail(stripe, 'buyer@example.com', '4242', { links: LINKS });
  assert.equal(r.ok, true);
  assert.equal(r.session.id, sessions[0].id);
  assert.deepEqual([...new Set(calls.map(c => c.payment_link))].sort(), [NEW.id, OLD.id].sort());
  const bad = await findPaidSessionByEmail(stripe, 'buyer@example.com', '0000', { links: LINKS });
  assert.equal(bad.ok, false);
});
