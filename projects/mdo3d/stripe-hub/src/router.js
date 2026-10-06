/**
 * Routing logic for the Stripe hub: which service does an event belong to,
 * and how is it forwarded. Kept free of Express so it can be tested directly.
 */

/** Path segment -> env suffix: "mdo3" -> "MDO3", "ahl-labs" -> "AHL_LABS". */
export function accountEnvKey(account) {
  return String(account).toUpperCase().replace(/-/g, '_');
}

export const ACCOUNT_RE = /^[a-z0-9][a-z0-9_-]{0,31}$/i;

/** Builds a lookup from routes.json: lower-cased key/alias -> service key. */
export function buildRouteIndex(routesConfig) {
  const services = (routesConfig && routesConfig.services) || {};
  const byName = new Map();
  for (const [key, svc] of Object.entries(services)) {
    if (!svc || svc.enabled === false) continue;
    if (!Array.isArray(svc.targets) || svc.targets.length === 0) continue;
    byName.set(key.toLowerCase(), key);
    for (const alias of svc.aliases || []) byName.set(String(alias).toLowerCase(), key);
  }
  return { services, byName };
}

export function parsePriceMap(raw) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (e) {
    console.error(JSON.stringify({ msg: 'stripe_hub_config_error', error: 'ROUTE_PRICE_MAP is not valid JSON' }));
    return {};
  }
}

function lookupName(index, name) {
  if (!name || typeof name !== 'string') return null;
  return index.byName.get(name.trim().toLowerCase()) || null;
}

/** Candidate serviceName values carried on the event object itself (no API calls). */
function metadataCandidates(obj) {
  const out = [];
  const push = (where, md) => { if (md && md.serviceName) out.push([where, md.serviceName]); };
  push('metadata', obj.metadata);
  // Invoices: subscription metadata snapshot (older + newer API shapes).
  push('subscription_details.metadata', obj.subscription_details && obj.subscription_details.metadata);
  push('parent.subscription_details.metadata', obj.parent && obj.parent.subscription_details && obj.parent.subscription_details.metadata);
  const lines = obj.lines && Array.isArray(obj.lines.data) ? obj.lines.data : [];
  if (lines[0]) push('lines[0].metadata', lines[0].metadata);
  // payment_intent_data / subscription_data metadata are copied onto those objects by Stripe.
  return out;
}

/** Price ids visible on the event object (subscriptions, invoices). */
function pricesOnObject(obj) {
  const ids = [];
  const add = (p) => { if (typeof p === 'string') ids.push(p); else if (p && p.id) ids.push(p.id); };
  if (obj.items && Array.isArray(obj.items.data)) for (const it of obj.items.data) add(it.price);
  if (obj.lines && Array.isArray(obj.lines.data)) {
    for (const l of obj.lines.data) {
      add(l.price);
      if (l.pricing && l.pricing.price_details) add(l.pricing.price_details.price);
    }
  }
  if (obj.plan) add(obj.plan);
  return ids;
}

function subscriptionIdOf(obj) {
  const s = obj.subscription
    || (obj.parent && obj.parent.subscription_details && obj.parent.subscription_details.subscription);
  if (!s) return null;
  return typeof s === 'string' ? s : s.id || null;
}

/**
 * Resolves the target service for a verified event.
 * stripe: optional Stripe client with a secret key for this account (used only
 * for subscription / checkout line-item lookups when the event itself is silent).
 * Returns { service, routedBy } or { service: null, routedBy: null }.
 */
export async function resolveService(event, { index, priceMap = {}, stripe = null, account } = {}) {
  const obj = (event && event.data && event.data.object) || {};
  const allowed = (key) => {
    const svc = index.services[key];
    return !svc.accounts || svc.accounts.includes(account);
  };
  const hit = (key, routedBy) => (key && allowed(key) ? { service: key, routedBy } : null);

  for (const [where, name] of metadataCandidates(obj)) {
    const r = hit(lookupName(index, name), where);
    if (r) return r;
  }

  if (event.type && event.type.startsWith('checkout.session') && typeof obj.client_reference_id === 'string') {
    const m = /^([a-z0-9_-]+):/i.exec(obj.client_reference_id);
    const r = m && hit(lookupName(index, m[1]), 'client_reference_id');
    if (r) return r;
  }

  const subId = subscriptionIdOf(obj);
  const isSubEvent = typeof obj.id === 'string' && obj.id.startsWith('sub_');
  let subscription = null;
  if (stripe && subId && !isSubEvent) {
    try {
      subscription = await stripe.subscriptions.retrieve(subId);
      const r = hit(lookupName(index, subscription.metadata && subscription.metadata.serviceName), 'subscription.metadata');
      if (r) return r;
    } catch (e) {
      console.error(JSON.stringify({ msg: 'stripe_hub_lookup_error', eventId: event.id, lookup: 'subscription', error: e.message }));
    }
  }

  // Price-id fallback.
  if (priceMap && Object.keys(priceMap).length) {
    let prices = pricesOnObject(obj);
    if (subscription) prices = prices.concat(pricesOnObject(subscription));
    if (!prices.length && stripe && obj.object === 'checkout.session' && obj.id) {
      try {
        const items = await stripe.checkout.sessions.listLineItems(obj.id, { limit: 10 });
        prices = pricesOnObject({ lines: items });
      } catch (e) {
        console.error(JSON.stringify({ msg: 'stripe_hub_lookup_error', eventId: event.id, lookup: 'line_items', error: e.message }));
      }
    }
    for (const p of prices) {
      const key = priceMap[p];
      const r = key && index.services[key] && index.byName.get(key.toLowerCase()) ? hit(key, 'price_map') : null;
      if (r) return r;
    }
  }

  return { service: null, routedBy: null };
}

/** Amount fields differ per object type; first one present wins. */
export function amountOf(obj) {
  for (const k of ['amount_total', 'amount_paid', 'amount_received', 'amount']) {
    if (typeof obj[k] === 'number') return obj[k];
  }
  return null;
}

/**
 * POSTs {eventId, account, type} to each target. Returns per-target results.
 * retryable: true for 5xx, 429, timeouts and network errors (hub answers 500 so
 * Stripe redelivers); other 4xx are treated as final.
 */
export async function forwardEvent(targets, payload, { timeoutMs = 8000, fetchImpl = globalThis.fetch } = {}) {
  return Promise.all(targets.map(async (url) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const resp = await fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Stripe-Hub': '1' },
        body: JSON.stringify(payload),
        signal: ctrl.signal
      });
      const status = resp.status;
      return { url, status, ok: status >= 200 && status < 300, retryable: status >= 500 || status === 429 };
    } catch (e) {
      return { url, status: 0, ok: false, retryable: true, error: e.name === 'AbortError' ? 'timeout' : e.message };
    } finally {
      clearTimeout(timer);
    }
  }));
}
