import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addLine, setQty, removeLine, cartCount, normaliseCart, lineKey, summarise, shipNotice, checkoutBody, CART_LIMITS } from '../core/cart.mjs';
import { clientBundle } from '../core/build.mjs';

const P = {
  tee: { name: 'Tee', url: 'products/tee.html', price_cents: 3000, canAdd: true, preorder: false, ship_by: null, drop: null, colors: [{ id: 'ink', name: 'Ink' }] },
  hood: { name: 'Hood', url: 'products/hood.html', price_cents: 6500, canAdd: true, preorder: true, ship_by: '2027-01-03', drop: 'd1' },
  late: { name: 'Late', url: 'products/late.html', price_cents: 7000, canAdd: true, preorder: true, ship_by: '2027-01-20', drop: 'd2' },
  tba: { name: 'TBA', url: 'products/tba.html', price_cents: null, canAdd: true, preorder: true, ship_by: null, drop: 'd3' },
};

test('cart: add merges same product+size+colour, caps qty and lines, never mutates', () => {
  const empty = [];
  let r = addLine(empty, { product: 'tee', size: 'M', color: 'ink' });
  assert.equal(empty.length, 0);
  r = addLine(r.cart, { product: 'tee', size: 'M', color: 'ink', qty: 2 });
  assert.deepEqual(r.cart, [{ product: 'tee', size: 'M', color: 'ink', qty: 3 }]);
  r = addLine(r.cart, { product: 'tee', size: 'L', color: 'ink' });
  assert.equal(r.cart.length, 2);
  let c = r.cart;
  for (let i = 0; i < 9; i++) c = addLine(c, { product: 'tee', size: 'M', color: 'ink' }).cart;
  assert.equal(c[0].qty, CART_LIMITS.maxQty);
  assert.equal(addLine(c, { product: 'tee', size: 'M', color: 'ink' }).ok, false);
  let full = [];
  for (let i = 0; i < CART_LIMITS.maxLines; i++) full = addLine(full, { product: `p${i}`, size: 'M' }).cart;
  assert.equal(addLine(full, { product: 'one-more', size: 'M' }).ok, false);
  assert.equal(cartCount(c), 6);
});

test('cart: setQty / remove / junk from storage', () => {
  const c = [{ product: 'tee', size: 'M', color: '', qty: 2 }, { product: 'hood', size: 'L', color: '', qty: 1 }];
  assert.deepEqual(setQty(c, lineKey(c[0]), 4)[0].qty, 4);
  assert.equal(setQty(c, lineKey(c[0]), 0).length, 1, 'qty 0 removes the line');
  assert.equal(removeLine(c, lineKey(c[1])).length, 1);
  assert.deepEqual(normaliseCart([null, { product: '' }, { product: 'x', qty: -1 }, { product: 'x', size: 'M', qty: '2' }, 'junk']), [{ product: 'x', size: 'M', color: '', qty: 2 }]);
  assert.deepEqual(normaliseCart('not an array'), []);
});

test('mixed pre-order carts ship when the latest item is ready', () => {
  assert.equal(shipNotice([{ preorder: false }]), null, 'in-stock only: no notice');
  const one = shipNotice([{ preorder: true, ship_by: '2027-01-03', drop: 'd1' }]);
  assert.equal(one.mixed, false);
  assert.match(one.text, /^Pre-order\. Ships by January 3, 2027\.$/);
  const mixed = shipNotice([{ preorder: false }, { preorder: true, ship_by: '2027-01-03', drop: 'd1' }]);
  assert.equal(mixed.mixed, true);
  assert.match(mixed.text, /mixes in-stock and pre-order pieces\. Everything ships together by January 3, 2027, when the latest item is ready/);
  const drops = shipNotice([{ preorder: true, ship_by: '2027-01-20', drop: 'd2' }, { preorder: true, ship_by: '2027-01-03', drop: 'd1' }]);
  assert.equal(drops.latest, '2027-01-20');
  assert.match(drops.text, /more than one drop\. Everything ships together by January 20, 2027/);
  const pending = shipNotice([{ preorder: true, ship_by: '2027-01-03', drop: 'd1' }, { preorder: true, ship_by: null, drop: 'd3' }]);
  assert.equal(pending.pending, true);
  assert.match(pending.text, /ships together when its latest item is ready/);
});

test('summarise: subtotal only when every price is known; unknown products flagged; checkout body has no prices', () => {
  const cart = [{ product: 'tee', size: 'M', color: 'ink', qty: 2 }, { product: 'late', size: 'L', qty: 1 }, { product: 'hood', size: 'M', qty: 1 }];
  const s = summarise(cart, P);
  assert.equal(s.subtotal_cents, 3000 * 2 + 7000 + 6500);
  assert.equal(s.count, 4);
  assert.equal(s.lines[0].colorName, 'Ink');
  assert.equal(s.notice.latest, '2027-01-20');
  assert.equal(s.notice.mixed, true);
  assert.equal(summarise([...cart, { product: 'tba', size: 'M', qty: 1 }], P).subtotal_cents, null, 'Price TBA anywhere -> no subtotal');
  assert.equal(summarise([{ product: 'gone', size: 'M', qty: 1 }], P).lines[0].unavailable, true);
  const body = checkoutBody('runwae', cart);
  assert.deepEqual(body, { brand: 'runwae', lines: [{ product: 'tee', size: 'M', color: 'ink', qty: 2 }, { product: 'late', size: 'L', color: '', qty: 1 }, { product: 'hood', size: 'M', color: '', qty: 1 }] });
  assert.doesNotMatch(JSON.stringify(body), /price/);
});

test('browser bundle: cart.mjs + ui is one valid classic script with no exports', () => {
  const src = clientBundle();
  assert.doesNotMatch(src, /^\s*export\s/m);
  assert.doesNotThrow(() => new Function(src));
});
