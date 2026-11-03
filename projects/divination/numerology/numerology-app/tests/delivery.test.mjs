import test from 'node:test';
import assert from 'node:assert/strict';
import { settleDelivery } from '../public/js/delivery.js';

const banner = (connected = true) => ({ isConnected: connected, removed: false, remove() { this.removed = true; this.isConnected = false; } });

test('current reading with a live banner consumes the credit', () => {
  let used = 0; const b = banner();
  assert.equal(settleDelivery({ isCurrent: () => true, banner: b, consume: () => used++ }), true);
  assert.equal(used, 1);
  assert.equal(b.removed, false);
});

test('superseded reading does not consume the credit', () => {
  let used = 0; const b = banner();
  assert.equal(settleDelivery({ isCurrent: () => false, banner: b, consume: () => used++ }), false);
  assert.equal(used, 0);
  assert.equal(b.removed, true);
});

test('detached banner does not consume the credit', () => {
  let used = 0;
  assert.equal(settleDelivery({ isCurrent: () => true, banner: banner(false), consume: () => used++ }), false);
  assert.equal(used, 0);
});
