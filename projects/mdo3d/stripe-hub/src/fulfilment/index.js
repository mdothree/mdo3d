/**
 * Fulfilment for LayoffLeads Pro and Prompts for Business packs (Stripe Payment Links).
 *
 * Flow (in-process, called by server.js when routes.json resolves service "fulfilment"):
 *   1. Re-fetch the event from Stripe with STRIPE_SECRET_KEY_FULFIL (the hub body is never trusted).
 *   2. Only checkout.session.completed / async_payment_succeeded with payment_status === "paid".
 *   3. Live-mode guard: livemode events are ignored unless FULFIL_ALLOW_LIVE=1 (set only on the
 *      Principal's GO). With the flag unset a live key is refused outright.
 *   4. Product = the session's Payment Link, matched by URL against catalog.json (or FULFIL_LINK_MAP
 *      for test-mode links). Links that are not ours -> 200 ignored.
 *   5. Idempotency: in-memory set + a durable marker (metadata mdo_fulfilled_at on the PaymentIntent
 *      or Subscription, checked before sending) + Resend Idempotency-Key per session.
 *   6. Customer email with signed, expiring download link(s) + internal sale-alert email.
 *
 * Downloads: GET /api/fulfil/download?t=<token>, an HMAC-SHA256 token (FULFIL_DOWNLOAD_SECRET)
 * naming one file under private/ and an expiry. Files are built by scripts/build-fulfilment.mjs.
 *
 * No npm dependencies: the Stripe client is injected; email goes to Resend's REST API via fetch.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PRIVATE_DIR = path.join(ROOT, 'private');
const DEFAULT_TTL_DAYS = 7;
const HANDLED_TYPES = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded']);

export function loadCatalog() {
  return require('./catalog.json');
}

// ---------- signed download tokens ----------
const b64u = (buf) => Buffer.from(buf).toString('base64url');

export function signToken(payload, secret) {
  if (!secret) throw new Error('FULFIL_DOWNLOAD_SECRET not set');
  const body = b64u(JSON.stringify(payload));
  const sig = b64u(crypto.createHmac('sha256', secret).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyToken(token, secret, now = Date.now()) {
  if (!secret || typeof token !== 'string' || token.length > 2048) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const want = crypto.createHmac('sha256', secret).update(body).digest();
  let got;
  try { got = Buffer.from(sig, 'base64url'); } catch { return null; }
  if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) return null;
  let p;
  try { p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); } catch { return null; }
  if (!p || typeof p.f !== 'string' || typeof p.exp !== 'number' || p.exp < now) return null;
  return p;
}

/** Resolves a token's file to an absolute path inside PRIVATE_DIR, or null (no traversal). */
export function resolvePrivateFile(rel, privateDir = PRIVATE_DIR) {
  if (typeof rel !== 'string' || !/^[a-z0-9][a-z0-9/_.-]*$/i.test(rel) || rel.includes('..')) return null;
  const abs = path.resolve(privateDir, rel);
  if (!abs.startsWith(path.resolve(privateDir) + path.sep)) return null;
  return abs;
}

// ---------- product lookup ----------
function parseJsonEnv(raw, name, log) {
  if (!raw) return {};
  try { const v = JSON.parse(raw); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; }
  catch { log(JSON.stringify({ msg: 'fulfil_config_error', error: `${name} is not valid JSON` })); return {}; }
}

/**
 * Finds the catalog product for a session. linkMap (FULFIL_LINK_MAP) maps a plink_ id or a
 * Payment Link URL to a product key (used for test-mode links, whose URLs differ from live).
 */
export async function productForSession(session, { stripe, catalog, linkMap = {} }) {
  const plink = typeof session.payment_link === 'string' ? session.payment_link
    : session.payment_link && session.payment_link.id;
  if (!plink) return null;
  if (linkMap[plink] && catalog.products[linkMap[plink]]) return { key: linkMap[plink], ...catalog.products[linkMap[plink]] };
  const link = await stripe.paymentLinks.retrieve(plink);
  const url = link && link.url;
  if (url && linkMap[url] && catalog.products[linkMap[url]]) return { key: linkMap[url], ...catalog.products[linkMap[url]] };
  for (const [key, p] of Object.entries(catalog.products)) {
    if (url && p.paymentLink === url) return { key, ...p };
  }
  return null;
}

// ---------- email ----------
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function customerEmail({ product, site, links, ttlDays }) {
  const list = links.map((l) => `- ${l.label}: ${l.url}`).join('\n');
  const htmlList = links.map((l) => `<li><a href="${esc(l.url)}">${esc(l.label)}</a></li>`).join('');
  const extra = site.afterDownload ? `\n\n${site.afterDownload}` : '';
  const text = `Thank you for buying ${product.title}.\n\nYour download${links.length > 1 ? 's' : ''}:\n${list}\n\n`
    + `The link${links.length > 1 ? 's work' : ' works'} for ${ttlDays} days. If it expires, reply to this email with the address you paid with and we'll send a new one.${extra}\n\n`
    + `Questions: ${site.contactEmail}\n${site.name} · ${site.url}`;
  const html = `<p>Thank you for buying <strong>${esc(product.title)}</strong>.</p><ul>${htmlList}</ul>`
    + `<p>The link${links.length > 1 ? 's work' : ' works'} for ${ttlDays} days. If it expires, reply to this email with the address you paid with and we'll send a new one.</p>`
    + (site.afterDownload ? `<p>${esc(site.afterDownload)}</p>` : '')
    + `<p>Questions: <a href="mailto:${esc(site.contactEmail)}">${esc(site.contactEmail)}</a><br>${esc(site.name)} · <a href="${esc(site.url)}">${esc(site.url)}</a></p>`;
  return { subject: `Your ${product.title} download`, text, html };
}

export function alertEmail({ product, session, event, delivered }) {
  const amt = typeof session.amount_total === 'number' ? `${(session.amount_total / 100).toFixed(2)} ${String(session.currency || '').toUpperCase()}` : 'n/a';
  const lines = [
    `Sale: ${product.title} (${product.key})`,
    `Amount: ${amt}`,
    `Buyer: ${(session.customer_details && session.customer_details.email) || 'unknown'}`,
    `Mode: ${event.livemode ? 'LIVE' : 'test'}`,
    `Session: ${session.id}`,
    `Event: ${event.id}`,
    `Customer email: ${delivered ? 'sent' : 'NOT sent (see logs)'}`,
  ];
  if (product.followUp) lines.push(`Follow-up: ${product.followUp}`);
  return { subject: `[sale${event.livemode ? '' : ' TEST'}] ${product.title} ${amt}`, text: lines.join('\n') };
}

export async function sendEmail({ apiKey, from, to, subject, text, html, idempotencyKey, fetchImpl = globalThis.fetch }) {
  if (!apiKey) throw new Error('FULFIL_EMAIL_API_KEY not set');
  const resp = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    body: JSON.stringify({ from, to: [to], subject, text, ...(html ? { html } : {}) }),
  });
  if (!resp.ok) {
    const err = new Error(`email send failed: HTTP ${resp.status}`);
    err.retryable = resp.status >= 500 || resp.status === 429;
    throw err;
  }
  return true;
}

// ---------- durable marker ----------
function markerTarget(session) {
  const id = (x) => (typeof x === 'string' ? x : x && x.id);
  if (session.subscription) return { kind: 'subscriptions', id: id(session.subscription) };
  if (session.payment_intent) return { kind: 'paymentIntents', id: id(session.payment_intent) };
  return null;
}

async function alreadyFulfilled(stripe, session) {
  const t = markerTarget(session);
  if (!t || !t.id) return false;
  const obj = await stripe[t.kind].retrieve(t.id);
  return Boolean(obj && obj.metadata && obj.metadata.mdo_fulfilled_at);
}

async function markFulfilled(stripe, session, productKey) {
  const t = markerTarget(session);
  if (!t || !t.id) return;
  await stripe[t.kind].update(t.id, { metadata: { mdo_fulfilled_at: new Date().toISOString(), mdo_fulfilled_product: productKey } });
}

// ---------- handler ----------
const seen = new Set();
export function _resetSeen() { seen.clear(); }

/**
 * Returns { status, body }. 5xx only for failures worth a Stripe retry.
 * deps: { env, stripe (client built with STRIPE_SECRET_KEY_FULFIL), catalog, fetchImpl, log, now }
 */
export async function handleFulfilment(eventId, deps) {
  const { env = process.env, stripe, catalog = loadCatalog(), fetchImpl = globalThis.fetch, log = console.log, now = Date.now } = deps;
  const allowLive = env.FULFIL_ALLOW_LIVE === '1';
  const key = env.STRIPE_SECRET_KEY_FULFIL || '';
  if (!stripe || !key) { log(JSON.stringify({ msg: 'fulfil_not_configured' })); return { status: 503, body: { error: 'fulfilment not configured' } }; }
  if (!allowLive && !/^(sk|rk)_test_/.test(key)) {
    log(JSON.stringify({ msg: 'fulfil_live_key_refused' }));
    return { status: 503, body: { error: 'live key refused (FULFIL_ALLOW_LIVE not set)' } };
  }
  if (typeof eventId !== 'string' || !eventId.startsWith('evt_')) return { status: 400, body: { error: 'bad event id' } };
  if (seen.has(eventId)) return { status: 200, body: { duplicate: true } };

  let event;
  try { event = await stripe.events.retrieve(eventId); }
  catch (e) {
    const code = e && e.statusCode;
    log(JSON.stringify({ msg: 'fulfil_event_fetch_error', eventId, status: code || 0 }));
    return code === 404 ? { status: 404, body: { error: 'event not in this account' } } : { status: 502, body: { error: 'event fetch failed' } };
  }
  if (event.livemode && !allowLive) {
    log(JSON.stringify({ msg: 'fulfil_live_blocked', eventId }));
    return { status: 200, body: { ignored: 'livemode' } };
  }
  if (!HANDLED_TYPES.has(event.type)) return { status: 200, body: { ignored: event.type } };
  const session = event.data && event.data.object;
  if (!session || session.object !== 'checkout.session') return { status: 200, body: { ignored: 'not a session' } };
  if (session.payment_status !== 'paid') return { status: 200, body: { ignored: `payment_status ${session.payment_status}` } };

  let product;
  try { product = await productForSession(session, { stripe, catalog, linkMap: parseJsonEnv(env.FULFIL_LINK_MAP, 'FULFIL_LINK_MAP', log) }); }
  catch (e) { log(JSON.stringify({ msg: 'fulfil_link_lookup_error', eventId, error: e.message })); return { status: 502, body: { error: 'link lookup failed' } }; }
  if (!product) { log(JSON.stringify({ msg: 'fulfil_not_ours', eventId, session: session.id })); return { status: 200, body: { ignored: 'not a fulfilment product' } }; }

  try {
    if (await alreadyFulfilled(stripe, session)) { seen.add(eventId); return { status: 200, body: { duplicate: true, product: product.key } }; }
  } catch (e) { log(JSON.stringify({ msg: 'fulfil_marker_read_error', eventId, error: e.message })); return { status: 502, body: { error: 'marker read failed' } }; }

  const site = catalog.sites[product.site];
  const to = session.customer_details && session.customer_details.email;
  const secret = env.FULFIL_DOWNLOAD_SECRET;
  const base = (env.FULFIL_PUBLIC_URL || '').replace(/\/$/, '');
  const ttlDays = parseInt(env.FULFIL_LINK_TTL_DAYS || String(DEFAULT_TTL_DAYS), 10);
  if (!secret || !base || !site) { log(JSON.stringify({ msg: 'fulfil_not_configured', missing: !secret ? 'FULFIL_DOWNLOAD_SECRET' : !base ? 'FULFIL_PUBLIC_URL' : 'site' })); return { status: 503, body: { error: 'fulfilment not configured' } }; }

  const exp = now() + ttlDays * 86400000;
  const links = product.files.map((f) => ({
    label: f.label,
    url: `${base}/api/fulfil/download?t=${signToken({ f: f.path, s: session.id, exp }, secret)}`,
  }));
  const apiKey = env.FULFIL_EMAIL_API_KEY;
  let delivered = false;
  try {
    if (!to) throw Object.assign(new Error('session has no customer email'), { retryable: false });
    const m = customerEmail({ product, site, links, ttlDays });
    await sendEmail({ apiKey, from: env[site.fromEnv], to, ...m, idempotencyKey: `fulfil-customer-${session.id}`, fetchImpl });
    delivered = true;
  } catch (e) {
    log(JSON.stringify({ msg: 'fulfil_customer_email_error', eventId, error: e.message }));
    if (e.retryable) return { status: 502, body: { error: 'email send failed, retry' } };
  }
  try {
    const a = alertEmail({ product, session, event, delivered });
    await sendEmail({ apiKey, from: env[site.fromEnv], to: env.FULFIL_ALERT_TO, ...a, idempotencyKey: `fulfil-alert-${session.id}`, fetchImpl });
  } catch (e) {
    log(JSON.stringify({ msg: 'fulfil_alert_email_error', eventId, error: e.message }));
  }
  if (delivered) {
    try { await markFulfilled(stripe, session, product.key); }
    catch (e) { log(JSON.stringify({ msg: 'fulfil_marker_write_error', eventId, error: e.message })); }
  }
  seen.add(eventId);
  log(JSON.stringify({ msg: 'fulfil_done', eventId, session: session.id, product: product.key, delivered, livemode: Boolean(event.livemode) }));
  return { status: 200, body: { fulfilled: delivered, product: product.key } };
}

/** Express-agnostic download handler: returns { status, headers, file } or { status, body }. */
export function handleDownload(token, { env = process.env, privateDir = PRIVATE_DIR, now = Date.now } = {}) {
  const p = verifyToken(token, env.FULFIL_DOWNLOAD_SECRET, now());
  if (!p) return { status: 403, body: 'This download link is invalid or has expired. Reply to your purchase email for a new one.' };
  const abs = resolvePrivateFile(p.f, privateDir);
  if (!abs || !fs.existsSync(abs)) return { status: 404, body: 'File not found. Reply to your purchase email and we will send it.' };
  const name = path.basename(abs);
  const type = name.endsWith('.csv') ? 'text/csv; charset=utf-8' : 'text/markdown; charset=utf-8';
  return { status: 200, headers: { 'Content-Type': type, 'Content-Disposition': `attachment; filename="${name}"`, 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' }, file: abs };
}
