import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import notify, { notifyRecord } from '../api/notify.mjs';
import lookup, { lookupRequest } from '../api/order-lookup.mjs';

const fakeRes = () => ({ statusCode: 0, headers: {}, body: '', setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b; } });

test('notify: validates, then appends one JSON line to the local log (stub)', async () => {
  assert.equal(notifyRecord({ brand: 'glb', product: 'icon-tee', email: 'nope' }).status, 400);
  assert.equal(notifyRecord({ brand: 'GLB!', product: 'x', email: 'a@b.co' }).status, 400);
  assert.equal(notifyRecord({ brand: 'glb', product: 'icon-tee', email: ' A@B.co ' }).record.email, 'a@b.co');
  const log = join(mkdtempSync(join(tmpdir(), 'sf-notify-')), 'notify.jsonl');
  const saved = process.env.NOTIFY_LOG;
  process.env.NOTIFY_LOG = log;
  try {
    let res = fakeRes();
    await notify({ method: 'POST', body: JSON.stringify({ brand: 'glb', product: 'icon-tee', email: 'fan@example.com' }) }, res);
    assert.equal(res.statusCode, 200);
    res = fakeRes();
    await notify({ method: 'GET' }, res);
    assert.equal(res.statusCode, 405);
    const lines = readFileSync(log, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
    assert.equal(lines.length, 1);
    assert.equal(lines[0].product, 'icon-tee');
  } finally {
    if (saved === undefined) delete process.env.NOTIFY_LOG; else process.env.NOTIFY_LOG = saved;
  }
});

test('order lookup: validates and answers 503 until the order store exists', async () => {
  assert.equal(lookupRequest({ order: '', email: 'a@b.co' }).status, 400);
  assert.equal(lookupRequest({ order: 'RW-1042', email: 'x' }).status, 400);
  assert.deepEqual(lookupRequest({ order: 'rw-1042', email: 'A@B.co' }), { order: 'RW-1042', email: 'a@b.co' });
  const res = fakeRes();
  await lookup({ method: 'POST', body: { order: 'RW-1042', email: 'a@b.co' } }, res);
  assert.equal(res.statusCode, 503);
});
