// POST /api/stripe-webhook  (Stripe -> us). Shared by every shop; the brand comes from session metadata.
//
//   checkout.session.completed  verify signature -> skip if this event id was seen -> commit the stock hold as a sale
//                               (ledger; idempotent per order) -> append the order to orders/orders.jsonl ->
//                               (a) "New order" email to the shop inbox, (b) confirmation to the customer.
//   checkout.session.expired    release the stock hold.
// Emails never fail the order (core/email.mjs deliver). Customer emails stay in test mode until EMAIL_LIVE=true.
// Env: STRIPE_WEBHOOK_SECRET (required), STRIPE_SECRET_KEY (test key: fetches line items), INVENTORY_ROOT /
//      ORDERS_ROOT (default: the working directory), ADMIN_URL, RESEND_API_KEY, EMAIL_TEST_TO, EMAIL_LIVE.
// PAYMENTS CODE: deploying this is gated on the Principal's OK, like api/checkout.mjs.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { readFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { commitSale, release } from '../core/stock.mjs';
import { orderFromSession, customerEmail, shopEmail, deliver } from '../core/email.mjs';
import { keyAllowed } from './checkout.mjs';

export const config = { api: { bodyParser: false } };

/** Stripe-Signature: t=<unix>,v1=<hex hmac sha256 of "t.payload">. Constant-time compare, 5 min tolerance. */
export function verifySignature(payload, header, secret, { toleranceSec = 300, now = Date.now() } = {}) {
  if (!secret || !header || typeof payload !== 'string') return false;
  const parts = Object.fromEntries(String(header).split(',').map((kv) => kv.split('=')).filter((x) => x.length === 2).map(([k, v]) => [k.trim(), v.trim()]));
  const sigs = String(header).split(',').filter((kv) => kv.trim().startsWith('v1=')).map((kv) => kv.trim().slice(3));
  const t = Number(parts.t);
  if (!Number.isFinite(t) || !sigs.length) return false;
  if (Math.abs(now / 1000 - t) > toleranceSec) return false;
  const want = Buffer.from(createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex'));
  return sigs.some((s) => { const b = Buffer.from(s); return b.length === want.length && timingSafeEqual(b, want); });
}
export const signPayload = (payload, secret, t = Math.floor(Date.now() / 1000)) => `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex')}`;

const ordersDir = (root) => join(root, 'orders');
function seen(root, id) {
  const f = join(ordersDir(root), 'events.jsonl');
  return existsSync(f) && readFileSync(f, 'utf8').split('\n').some((l) => l && JSON.parse(l).id === id);
}
function record(root, file, obj) { mkdirSync(ordersDir(root), { recursive: true }); appendFileSync(join(ordersDir(root), file), `${JSON.stringify(obj)}\n`); }

async function lineItemsFor(session, env, fetchImpl) {
  if (Array.isArray(session.line_items?.data)) return session.line_items.data;
  if (!keyAllowed(env.STRIPE_SECRET_KEY, env)) throw new Error('line items not in the event and no allowed Stripe key to fetch them');
  const r = await fetchImpl(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(session.id)}/line_items?limit=100&expand[]=data.price.product`, { headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } });
  if (!r.ok) throw new Error(`Stripe line items ${r.status}`);
  return (await r.json()).data;
}

/** Handle one verified event. Returns {status, body}. */
export async function processEvent(event, { root = process.cwd(), env = process.env, now = new Date(), fetchImpl = globalThis.fetch } = {}) {
  const ordersRoot = env.ORDERS_ROOT ?? root;
  if (!event?.id || !event.type) return { status: 400, body: { error: 'bad event' } };
  if (seen(ordersRoot, event.id)) return { status: 200, body: { received: true, duplicate: true } };
  const s = event.data?.object ?? {};
  const brandId = s.metadata?.brand;
  if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
    if (s.metadata?.reservation) await release(root, { ref: s.metadata.reservation, reason: event.type, now });
    record(ordersRoot, 'events.jsonl', { id: event.id, type: event.type, at: now.toISOString() });
    return { status: 200, body: { received: true, released: !!s.metadata?.reservation } };
  }
  if (event.type !== 'checkout.session.completed') return { status: 200, body: { received: true, ignored: event.type } };
  if (!/^[a-z0-9-]+$/.test(brandId ?? '') || !existsSync(join(root, 'brands', brandId, 'brand.json'))) return { status: 400, body: { error: 'unknown brand' } };
  if (s.payment_status && !['paid', 'no_payment_required'].includes(s.payment_status)) {
    record(ordersRoot, 'events.jsonl', { id: event.id, type: event.type, at: now.toISOString(), note: `payment ${s.payment_status}` });
    return { status: 200, body: { received: true, pending: s.payment_status } };
  }
  const brand = JSON.parse(readFileSync(join(root, 'brands', brandId, 'brand.json'), 'utf8'));
  const items = await lineItemsFor(s, env, fetchImpl);
  const order = orderFromSession(s, items, brand, now);
  const sale = await commitSale(root, { order: order.number, ref: order.reservation, lines: order.lines.map((l) => ({ sku: l.sku, qty: l.qty })), now });
  const emails = [];
  if (!sale.duplicate) {
    record(ordersRoot, 'orders.jsonl', { ...order, status: 'confirmed', low_alerts: sale.lowAlerts });
    const opts = { env, outbox: join(ordersRoot, 'outbox'), livemode: order.livemode, fetchImpl, tag: order.number };
    emails.push(await deliver(shopEmail(order, brand, { adminUrl: env.ADMIN_URL, lowAlerts: sale.lowAlerts }), opts));
    emails.push(await deliver(customerEmail(order, brand, { siteUrl: env.SITE_URL ?? `https://${brand.domain}` }), opts));
  }
  record(ordersRoot, 'events.jsonl', { id: event.id, type: event.type, at: now.toISOString(), order: order.number });
  return { status: 200, body: { received: true, order: order.number, duplicate: sale.duplicate, emails: emails.map((e) => ({ sent: e.sent, reason: e.reason })) } };
}

async function rawBody(req) {
  if (typeof req.body === 'string') return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  const chunks = [];
  for await (const c of req) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(req, res) {
  const send = (status, obj) => { res.statusCode = status; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(obj)); };
  if (req.method !== 'POST') return send(405, { error: 'POST only' });
  const env = process.env;
  if (!env.STRIPE_WEBHOOK_SECRET) return send(503, { error: 'webhook not configured' });
  const payload = await rawBody(req);
  const sig = req.headers?.['stripe-signature'];
  if (!verifySignature(payload, sig, env.STRIPE_WEBHOOK_SECRET)) return send(400, { error: 'bad signature' });
  let event;
  try { event = JSON.parse(payload); } catch { return send(400, { error: 'bad JSON' }); }
  try {
    const r = await processEvent(event, { root: env.INVENTORY_ROOT ?? process.cwd(), env });
    return send(r.status, r.body);
  } catch (e) {
    console.error('[webhook]', e.message);
    return send(500, { error: 'not processed; Stripe will retry' });
  }
}
