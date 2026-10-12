/**
 * Frontend API client.
 *
 * Mirrors the typed contract in web/client/search.ts (the canonical source; the
 * frontend Docker build context is web/frontend only, so it cannot import
 * ../client directly). Keep the two in step; paths are documented in
 * web/frontend/README.md under "API contract".
 *
 * No mock data lives here or anywhere in the app: every failure surfaces as an
 * ApiError and the UI shows an honest state.
 */

import { getIdToken } from './firebase.js';

export const API_URL = (import.meta.env.VITE_API_URL || 'https://leadsapi.mdo3d.com').replace(/\/$/, '');

export const PATHS = {
  // live on the backend (web/backend/api.py, 7c11b41)
  coverage: '/coverage',
  verticals: '/verticals',
  filings: '/filings',
  filingsCsv: '/filings/export.csv',
  profiles: '/profiles',
  // account level (live on the backend; a 404 from an older backend still reads as "not available yet")
  account: '/v1/account',
  redeem: '/v1/access/redeem',
  checkout: '/v1/checkout',
  savedSearches: '/v1/saved-searches',
  savedSearch: (id) => `/v1/saved-searches/${encodeURIComponent(id)}`,
};

export class ApiError extends Error {
  constructor(kind, message, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind; // unauthenticated | plan_required | not_found | invalid | unavailable | unsupported
    this.status = status;
  }
}

export function errorKindForStatus(status) {
  if (status === 401) return 'unauthenticated';
  if (status === 402 || status === 403) return 'plan_required';
  if (status === 404) return 'not_found';
  if (status === 400 || status === 422) return 'invalid';
  return 'unavailable';
}

export function queryString(q) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q || {})) {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

export function isStripeCheckoutUrl(url) {
  if (typeof url !== 'string') return false;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname === 'checkout.stripe.com';
  } catch {
    return false;
  }
}

async function raw(path, init = {}) {
  const token = await getIdToken().catch(() => null);
  const headers = { ...(init.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (init.body) headers['Content-Type'] = 'application/json';
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers, signal: ctrl.signal });
  } catch {
    throw new ApiError('unavailable', 'Service unavailable');
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = typeof body.detail === 'string' ? body.detail : `HTTP ${res.status}`;
    throw new ApiError(errorKindForStatus(res.status), detail, res.status);
  }
  return res;
}

async function json(path, init) {
  const res = await raw(path, init);
  try {
    return await res.json();
  } catch {
    throw new ApiError('unavailable', 'Invalid response from service', res.status);
  }
}

export const getCoverage = () => json(PATHS.coverage);
export const listVerticals = () => json(PATHS.verticals);

/** Backend rows are flat (address_1, city, ...); shape them as the Filing contract. */
export function normalizeFiling(r) {
  if (r.principal_address) return r;
  return {
    ...r,
    principal_address: {
      line1: r.address_1 ?? null, line2: r.address_2 ?? null, city: r.city ?? null,
      state: r.address_state ?? null, zip_code: r.zip_code ?? null,
    },
    contacts: Array.isArray(r.contacts) ? r.contacts : [],
  };
}

export async function searchFilings(q) {
  const page = await json(`${PATHS.filings}${queryString(q)}`);
  return { ...page, filings: (page.filings || []).map(normalizeFiling) };
}

export async function exportCsv(q) {
  const { limit, offset, ...rest } = q; // eslint-disable-line no-unused-vars
  const res = await raw(`${PATHS.filingsCsv}${queryString(rest)}`, { headers: { Accept: 'text/csv' } });
  return {
    blob: await res.blob(),
    total: Number(res.headers.get('X-Total-Count')) || null,
    truncated: res.headers.get('X-Truncated') === '1',
  };
}

export const getAccount = () => json(PATHS.account);
export const listProfiles = () => json(PATHS.profiles);
export const redeemPromo = (code) => json(PATHS.redeem, { method: 'POST', body: JSON.stringify({ code }) });

/** Fail closed: only a backend-issued checkout.stripe.com URL is ever followed. */
export async function createCheckout() {
  const origin = window.location.origin;
  const r = await json(PATHS.checkout, {
    method: 'POST',
    body: JSON.stringify({ success_url: `${origin}/account?checkout=success`, cancel_url: `${origin}/account?checkout=cancelled` }),
  });
  if (!isStripeCheckoutUrl(r?.checkout_url)) throw new ApiError('unsupported', 'Checkout is not available yet');
  return r.checkout_url;
}

export const listSavedSearches = () => json(PATHS.savedSearches);
export const createSavedSearch = (name, query) =>
  json(PATHS.savedSearches, { method: 'POST', body: JSON.stringify({ name, query, cadence: 'weekly' }) });
export const deleteSavedSearch = (id) => json(PATHS.savedSearch(id), { method: 'DELETE' });
