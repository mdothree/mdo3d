import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shipBy, windowState, checkWindow, normaliseOrders, tally, purchaseOrder, landedCost, purchasable } from '../src/drop.mjs';

test('shipBy: default is 49 days after close (inside the playbook 5–8 weeks)', () => {
  const r = shipBy('2026-11-15');
  assert.equal(r.daysAfterClose, 49);
  assert.equal(r.shipBy, '2027-01-03');
  assert.equal(r.noticeBy, '2026-12-31');
  assert.ok(r.daysAfterClose >= 35 && r.daysAfterClose <= 56);
});

test('shipBy: schedule overrides', () => {
  assert.equal(shipBy('2026-11-15', { productionDays: 14, safetyDays: 0 }).daysAfterClose, 28);
});

test('windowState + checkWindow', () => {
  const d = { window: { open: '2026-11-01T00:00:00Z', close: '2026-11-15T00:00:00Z' } };
  assert.equal(windowState({ window: { open: null, close: null } }), 'unscheduled');
  assert.equal(windowState(d, '2026-10-31T23:59:59Z'), 'upcoming');
  assert.equal(windowState(d, '2026-11-01T00:00:00Z'), 'open');
  assert.equal(windowState(d, '2026-11-15T00:00:00Z'), 'closed');
  assert.deepEqual(checkWindow(d).warnings, []);
  assert.equal(checkWindow({ window: { open: '2026-11-01', close: '2026-12-15' } }).warnings.length, 1);
  assert.equal(checkWindow({ window: { open: '2026-11-15', close: '2026-11-01' } }).ok, false);
});

test('normaliseOrders: only paid, un-refunded Stripe sessions and paid rows', () => {
  const rows = [
    { object: 'checkout.session', id: 'cs_1', payment_status: 'paid', metadata: { product: 'a', size: 'M', qty: '2' } },
    { object: 'checkout.session', id: 'cs_2', payment_status: 'unpaid', metadata: { product: 'a', size: 'M', qty: '1' } },
    { object: 'checkout.session', id: 'cs_3', payment_status: 'paid', metadata: { product: 'a', size: 'L', qty: '1', refunded: 'true' } },
    { product: 'b', size: 'S', qty: '1', status: 'paid' },
    { product: 'b', size: 'S', qty: '1', status: 'refunded' },
  ];
  const n = normaliseOrders(rows);
  assert.equal(n.length, 2);
  assert.deepEqual(tally(n), { a: { M: 2 }, b: { S: 1 } });
  assert.throws(() => normaliseOrders([{ product: 'x', qty: 1 }]));
});

test('purchaseOrder: 10% buffer rounds up, min one spare, MOQ flag, size order', () => {
  const rows = purchaseOrder({ hood: { L: 10, S: 3, M: 20 }, tee: { M: 2 } }, { moq: { hood: 30, tee: 12 } });
  const hood = rows.find((r) => r.product === 'hood');
  assert.deepEqual(hood.sizes, { S: 4, M: 22, L: 11 });
  assert.deepEqual(Object.keys(hood.sizes), ['S', 'M', 'L']);
  assert.equal(hood.ordered, 37);
  assert.equal(hood.meetsMoq, true);
  const tee = rows.find((r) => r.product === 'tee');
  assert.equal(tee.ordered, 3); // 2 * 1.1 -> ceil 3
  assert.equal(tee.meetsMoq, false);
  assert.match(tee.action, /refund/);
  // a single unit gets a spare via ceil; buffer 0 still forces one spare
  assert.equal(purchaseOrder({ x: { M: 5 } }, { buffer: 0 })[0].ordered, 6);
});

test('landedCost: duty on goods only; price covers fees at target margin', () => {
  const r = landedCost({ unitCost: 12, qty: 60, freightTotal: 240, packagingPerUnit: 0.8, postagePerUnit: 5.5, sampleCostTotal: 90 });
  assert.equal(r.duty, 190.8); // 720 * 0.265
  assert.equal(r.landedPerUnit, 26.98);
  const p = r.suggestedPrice;
  const net = p - (p * 0.034 + 0.30) - r.landedPerUnit;
  assert.ok(Math.abs(net / p - 0.5) < 0.001);
  assert.equal(r.suggestedPriceRounded, 58.99);
  assert.throws(() => landedCost({ unitCost: 0, qty: 1 }));
});

test('purchasable: draft, unpriced, closed window are all blocked', () => {
  const drops = [{ id: 'd', products: ['h'], window: { open: '2026-11-01T00:00:00Z', close: '2026-11-15T00:00:00Z' } }];
  const base = { id: 'h', channel: 'preorder', status: 'live', price_cents: 6500 };
  assert.equal(purchasable({ ...base, status: 'draft' }, drops).reason, 'not released');
  assert.equal(purchasable({ ...base, price_cents: null }, drops).reason, 'no price');
  assert.equal(purchasable(base, drops, '2026-12-01').ok, false);
  const ok = purchasable(base, drops, '2026-11-05');
  assert.equal(ok.ok, true);
  assert.equal(ok.drop.id, 'd');
  assert.equal(purchasable({ ...base, id: 't', channel: 'printful' }, []).ok, true);
  assert.equal(purchasable({ ...base, rights_hold: 'third-party art' }, drops, '2026-11-05').reason, 'rights hold');
});
