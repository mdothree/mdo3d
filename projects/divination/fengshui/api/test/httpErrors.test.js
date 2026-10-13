// Identical copy in every projects/divination/<name>/api/test/ (same reason as
// src/httpErrors.js: each API is its own Vercel project).
//
// C7-002 / C7-003 / C7-017: one JSON error contract for every divination API,
// fully offline (placeholder keys, Stripe client stubbed, localhost port).
//   malformed JSON body -> 400 JSON, no parser text
//   oversized body      -> 413 JSON
//   unknown path        -> 404 JSON (incl. "/" and "/health", via vercel.json)
//   wrong method        -> 405 JSON + Allow header
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

process.env.DIVINATION_API_NO_LISTEN = '1';
process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder_offline';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_placeholder_offline';
process.env.ANTHROPIC_API_KEY = 'placeholder-offline';
process.env.FRONTEND_URL = 'https://frontend.invalid';

const { default: app, stripeService } = await import('../src/server.js');

const offline = async () => { throw new Error('offline test: no Stripe calls'); };
stripeService.stripe = {
  checkout: { sessions: { create: offline, retrieve: offline, update: offline } },
  events: { retrieve: offline },
  webhooks: { constructEvent: () => { throw new Error('offline test: bad signature'); } }
};

// Every JSON POST route this API serves (the raw-body Stripe webhook excluded).
const postRoutes = app._router.stack
  .filter(l => l.route && l.route.methods.post && l.route.path !== '/api/webhook/stripe')
  .map(l => l.route.path);

let server, base;
before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise(r => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise(r => server.close(r)));

async function call(path, { method = 'POST', body, type = 'application/json' } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: body === undefined ? {} : { 'Content-Type': type },
    body
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  return { status: res.status, text, json, headers: res.headers };
}

test('every JSON POST route is covered', () => {
  assert.ok(postRoutes.length >= 4, `found ${postRoutes.join(', ')}`);
});

test('malformed JSON -> 400 JSON on every POST route, parser text not echoed (C7-002)', async () => {
  for (const path of postRoutes) {
    const r = await call(path, { body: '{bad json' });
    assert.equal(r.status, 400, path);
    assert.deepEqual(r.json, { success: false, error: 'Malformed JSON in request body' }, path);
    assert.doesNotMatch(r.text, /position|property name|SyntaxError/i, path);
  }
});

test('oversized body -> 413 JSON (C7-003)', async () => {
  const big = JSON.stringify({ question: 'x'.repeat(1024 * 1024) });
  for (const path of postRoutes) {
    const r = await call(path, { body: big });
    assert.equal(r.status, 413, path);
    assert.deepEqual(r.json, { success: false, error: 'Request body too large' }, path);
  }
});

test('unknown paths -> 404 JSON, never Express HTML (C7-017)', async () => {
  for (const [method, path] of [['GET', '/api/nope'], ['POST', '/api/nope'], ['GET', '/'], ['GET', '/health']]) {
    const r = await call(path, { method, body: method === 'POST' ? '{}' : undefined });
    assert.equal(r.status, 404, `${method} ${path}`);
    assert.deepEqual(r.json, { success: false, error: 'Not found' }, `${method} ${path}`);
    assert.match(r.headers.get('content-type') || '', /application\/json/);
    assert.doesNotMatch(r.text, /Cannot (GET|POST)|<pre>/);
  }
});

test('wrong method on a real route -> 405 JSON with Allow (C7-017)', async () => {
  for (const path of postRoutes) {
    const r = await call(path, { method: 'GET' });
    assert.equal(r.status, 405, path);
    assert.deepEqual(r.json, { success: false, error: 'Method GET not allowed' }, path);
    assert.match(r.headers.get('allow') || '', /\bPOST\b/, path);
  }
  const h = await call('/api/health', { method: 'DELETE' });
  assert.equal(h.status, 405);
  assert.match(h.headers.get('allow') || '', /\bGET\b/);
});

test('health still 200; Stripe webhook keeps its raw body (bad signature -> 400, not a parse error)', async () => {
  const h = await call('/api/health', { method: 'GET' });
  assert.equal(h.status, 200);
  assert.equal(h.json.status, 'healthy');
  const w = await call('/api/webhook/stripe', { body: '{not json either' });
  assert.equal(w.status, 400);
  assert.notEqual(w.json && w.json.error, 'Malformed JSON in request body');
});

test('vercel.json sends every path to the Express app (JSON 404 for "/" and "/health" in production)', () => {
  const cfg = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  const last = cfg.routes[cfg.routes.length - 1];
  assert.equal(last.src, '/(.*)');
  assert.equal(last.dest, 'src/server.js');
});
