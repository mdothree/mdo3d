/**
 * Stripe webhook signature handling (no network; dummy keys; the real stripe
 * library is used only to sign and verify payloads locally).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';

process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_dummy';

const { StripeService, WebhookSignatureError } = await import('../src/services/stripeService.js');
const { stripeWebhookRoute } = await import('../src/routes/stripeWebhook.js');

const signer = new Stripe('sk_test_dummy');
const event = { id: 'evt_test_1', object: 'event', type: 'payment_intent.succeeded', data: { object: { id: 'pi_test_1' } } };
const raw = Buffer.from(JSON.stringify(event));
const goodSig = () => signer.webhooks.generateTestHeaderString({ payload: raw.toString(), secret: process.env.STRIPE_WEBHOOK_SECRET });

function mockRes() {
  return {
    statusCode: 200, body: undefined,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; }
  };
}
async function call(route, body, sig) {
  const res = mockRes();
  await route({ body, headers: sig === undefined ? {} : { 'stripe-signature': sig } }, res);
  return res;
}

test('bad signature -> 400 (was 200 {success:false})', async () => {
  const route = stripeWebhookRoute(new StripeService());
  const res = await call(route, raw, 't=1,v1=deadbeef');
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.ok(!/deadbeef|whsec/.test(JSON.stringify(res.body)), 'no internals echoed');
});

test('missing signature header -> 400', async () => {
  const res = await call(stripeWebhookRoute(new StripeService()), raw, undefined);
  assert.equal(res.statusCode, 400);
});

test('signed with a different secret -> 400', async () => {
  const sig = signer.webhooks.generateTestHeaderString({ payload: raw.toString(), secret: 'whsec_other' });
  const res = await call(stripeWebhookRoute(new StripeService()), raw, sig);
  assert.equal(res.statusCode, 400);
});

test('tampered body with a valid signature for the original -> 400', async () => {
  const sig = goodSig();
  const tampered = Buffer.from(raw.toString().replace('pi_test_1', 'pi_test_2'));
  const res = await call(stripeWebhookRoute(new StripeService()), tampered, sig);
  assert.equal(res.statusCode, 400);
});

test('valid signature on the raw body -> 200', async () => {
  const res = await call(stripeWebhookRoute(new StripeService()), raw, goodSig());
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
});

test('service throws WebhookSignatureError (status 400) on a bad signature', async () => {
  await assert.rejects(() => new StripeService().handleWebhook(raw, 't=1,v1=00'), e => e instanceof WebhookSignatureError && e.statusCode === 400);
});

test('handler failure on a verified event -> 500, not 200 or 400', async () => {
  const svc = new StripeService();
  svc.handlePaymentSuccess = async () => { throw new Error('db down'); };
  const res = await call(stripeWebhookRoute(svc), raw, goodSig());
  assert.equal(res.statusCode, 500);
  assert.ok(!JSON.stringify(res.body).includes('db down'));
});
