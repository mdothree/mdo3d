/**
 * MDO3D Stripe hub — one Stripe webhook endpoint per Stripe account.
 *
 *   POST /api/stripe/webhook/:account
 *
 * Verifies the Stripe signature with STRIPE_WEBHOOK_SECRET_<ACCOUNT>, resolves
 * the owning service (see router.js), and forwards {eventId, account, type} to
 * that service's /stripe-forwarded receiver. Receivers re-fetch the event from
 * Stripe with their own key, so the forwarded body is never trusted.
 *
 * Response policy to Stripe:
 *   - 404 unknown account (no webhook secret configured), 400 bad signature
 *   - 200 unrouted event (logged), or all targets answered 2xx / non-retryable 4xx
 *   - 500 if any target returned 5xx / 429 / timed out -> Stripe retries the whole
 *     event, so every target must be idempotent per event id.
 */
import express from 'express';
import Stripe from 'stripe';
import { createRequire } from 'module';
import {
  ACCOUNT_RE, accountEnvKey, buildRouteIndex, parsePriceMap, resolveService, amountOf, forwardEvent
} from './router.js';

const require = createRequire(import.meta.url);

function loadRoutes(env) {
  if (env.ROUTES_JSON) return JSON.parse(env.ROUTES_JSON);
  return require('../routes.json');
}

export function createApp({ env = process.env, routes, fetchImpl, StripeCtor = Stripe, log = console.log } = {}) {
  const index = buildRouteIndex(routes || loadRoutes(env));
  const priceMap = parsePriceMap(env.ROUTE_PRICE_MAP);
  const timeoutMs = parseInt(env.HUB_FORWARD_TIMEOUT_MS || '8000', 10);
  const clients = new Map(); // account -> { verifier, api }

  function clientsFor(account) {
    if (clients.has(account)) return clients.get(account);
    const key = env[`STRIPE_SECRET_KEY_${accountEnvKey(account)}`];
    // constructEvent is local HMAC verification and needs no API key; the
    // placeholder is never sent anywhere. `api` is only built when a real key exists.
    const c = { verifier: new StripeCtor(key || 'sk_hub_verify_only'), api: key ? new StripeCtor(key) : null };
    clients.set(account, c);
    return c;
  }

  const app = express();

  app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', service: 'mdo3d-stripe-hub', services: [...new Set(index.byName.values())] });
  });

  app.post('/api/stripe/webhook/:account', express.raw({ type: '*/*', limit: '1mb' }), async (req, res) => {
    const account = String(req.params.account || '').toLowerCase();
    const secret = ACCOUNT_RE.test(account) ? env[`STRIPE_WEBHOOK_SECRET_${accountEnvKey(account)}`] : null;
    if (!secret) return res.status(404).json({ error: 'Unknown account' });

    const { verifier, api } = clientsFor(account);
    let event;
    try {
      event = verifier.webhooks.constructEvent(req.body, req.headers['stripe-signature'], secret);
    } catch (e) {
      log(JSON.stringify({ msg: 'stripe_hub_bad_signature', account, error: e.message }));
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const obj = (event.data && event.data.object) || {};
    const { service, routedBy } = await resolveService(event, { index, priceMap, stripe: api, account });
    const line = {
      msg: 'stripe_hub_event',
      id: event.id,
      type: event.type,
      account,
      service,
      routedBy,
      amount: amountOf(obj),
      currency: obj.currency || null,
      livemode: Boolean(event.livemode)
    };

    if (!service) {
      log(JSON.stringify({ ...line, outcome: 'unrouted' }));
      return res.json({ received: true, routed: false });
    }

    const targets = index.services[service].targets;
    const results = await forwardEvent(targets, { eventId: event.id, account, type: event.type }, { timeoutMs, fetchImpl });
    const retry = results.some(r => r.retryable);
    log(JSON.stringify({
      ...line,
      outcome: retry ? 'target_failed_retry' : 'forwarded',
      targets: results.map(r => ({ url: r.url, status: r.status, ...(r.error ? { error: r.error } : {}) }))
    }));
    if (retry) return res.status(500).json({ received: true, routed: true, retry: true });
    return res.json({ received: true, routed: true, service });
  });

  return app;
}

const app = createApp();

if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3090;
  app.listen(PORT, () => console.log(`stripe-hub listening on ${PORT}`));
}

export default app;
