/**
 * MDO3D Leads - search / export / account client (v1 contract)
 *
 * Framework-agnostic typed client for the per-state business-filings API
 * (https://leadsapi.mdo3d.com). Search/export/coverage/verticals match the
 * backend as pushed in 7c11b41 (web/backend/api.py). Account, promo redeem,
 * checkout and saved searches are PROPOSED paths the backend has not built yet;
 * see web/frontend/README.md ("API contract").
 *
 * Rules this client keeps:
 *  - Never fabricates data: every failure is returned as a typed error, never
 *    as sample rows.
 *  - Access is decided by the backend (401 = not signed in, 402/403 = no active
 *    plan). The client does not guess entitlement.
 *  - Checkout fails closed: it only follows an https://checkout.stripe.com URL
 *    returned by the backend, and only when the backend reports checkout as
 *    available.
 */

// ---------------------------------------------------------------- schema

export interface Address {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
}

/** A verified contact. Unverified data is never sent by the backend. */
export interface Contact {
  kind: 'website' | 'phone' | 'email';
  value: string;
  /** URL or feed the value was read from. */
  source: string;
  verified: true;
}

/** Row as GET /filings returns it (db.PUBLIC_FILING_FIELDS: flat address). */
export interface FilingRow {
  state: string;
  source_id: string;
  entity: string;
  filing_type: string | null;
  entity_kind: EntityKind;
  filed_date: string | null;
  status: string | null;
  county: string | null;
  registered_agent: string | null;
  address_1: string | null;
  address_2: string | null;
  city: string | null;
  address_state: string | null;
  zip_code: string | null;
  naics_guess: string | null;
  naics_basis: string | null;
  contacts: Contact[];
  source_date: string | null;
}

export type EntityKind = 'llc' | 'corporation' | 'nonprofit' | 'partnership' | 'cooperative' | 'trade_name' | 'other';

/** Mirrors src/adapters/base.py `Filing` (minus `raw`); what the UI renders. */
export interface Filing {
  state: string;               // "FL"
  source_id: string;           // the state's document number
  entity: string;
  entity_kind?: EntityKind;
  filing_type: string | null;  // as the state labels it, e.g. "FLAL"
  filed_date: string | null;   // ISO date YYYY-MM-DD
  status: string | null;
  county: string | null;
  registered_agent: string | null;
  principal_address: Address;
  naics_guess: string | null;
  naics_basis: string | null;
  contacts: Contact[];         // verified only
  source_date: string | null;  // YYYYMMDD feed date
}

/** GET /coverage row (public). A state is searchable when filings > 0. */
export interface StateCoverage {
  state: string;               // "FL"
  filings: number;
  latest_filed_date: string | null;   // YYYY-MM-DD
  latest_source_date: string | null;  // YYYYMMDD
  last_ingest_at: string | null;
}

/** GET /verticals row (public). Matches the entity NAME only, not an industry. */
export interface Vertical {
  id: string;
  label: string;
  match: 'name contains' | 'entity type';
}

export interface FilingQuery {
  state?: string;              // comma-separated codes; default = all entitled states
  county?: string;
  filing_type?: string;        // comma-separated state codes
  entity_kind?: string;        // comma-separated EntityKind
  vertical?: string;           // Vertical.id
  q?: string;                  // entity name contains
  date_from?: string;          // YYYY-MM-DD inclusive (filed_date)
  date_to?: string;            // YYYY-MM-DD inclusive
  include_inactive?: boolean;
  limit?: number;              // default 50, max 500
  offset?: number;
}

export interface FilingPage {
  filings: Filing[];
  total: number;
  limit: number;
  offset: number;
  states: string[];
}

export interface CsvExport {
  blob: Blob;
  /** From X-Total-Count / X-Truncated; null unless the API exposes them via CORS. */
  total: number | null;
  truncated: boolean;
}

export interface Account {
  email: string | null;
  plan: {
    active: boolean;
    name: string | null;
    /** "stripe" | "promo" | null */
    source: string | null;
    renews_at: string | null;
  };
  /** Feature switches the backend controls. The UI hides what is false. */
  features: {
    checkout: boolean;
    saved_searches: boolean;
    promo_codes: boolean;
  };
}

export interface SavedSearch {
  id: string;
  name: string;
  query: FilingQuery;
  cadence: 'weekly';
  created_at: string;
  last_sent_at: string | null;
}

// ---------------------------------------------------------------- errors

export type ApiErrorKind =
  | 'unauthenticated'   // 401
  | 'plan_required'     // 402 no paid profile; 403 state not in the user's bundle
  | 'not_found'         // 404 (endpoint or resource missing)
  | 'invalid'           // 400 / 422
  | 'unavailable'       // 5xx, network failure, timeout, bad JSON
  | 'unsupported';      // the backend does not offer this (feature off)

export class ApiError extends Error {
  kind: ApiErrorKind;
  status: number;
  constructor(kind: ApiErrorKind, message: string, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
  }
}

export function errorKindForStatus(status: number): ApiErrorKind {
  if (status === 401) return 'unauthenticated';
  if (status === 402 || status === 403) return 'plan_required';
  if (status === 404) return 'not_found';
  if (status === 400 || status === 422) return 'invalid';
  return 'unavailable';
}

// ---------------------------------------------------------------- client

export interface LeadsClientOptions {
  baseUrl: string;                              // e.g. https://leadsapi.mdo3d.com
  getToken: () => Promise<string | null>;       // Firebase ID token or null
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export const PATHS = {
  // live (backend 7c11b41)
  coverage: '/coverage',                        // public
  verticals: '/verticals',                      // public
  filings: '/filings',                          // ?FilingQuery (auth + paid)
  filingsCsv: '/filings/export.csv',            // ?FilingQuery minus limit/offset, <= 10k rows
  profiles: '/profiles',
  // proposed (not built yet; 404 is treated as "not available yet")
  account: '/v1/account',
  redeem: '/v1/access/redeem',                  // POST {code}
  checkout: '/v1/checkout',                     // POST {success_url, cancel_url}
  savedSearches: '/v1/saved-searches',          // GET, POST {name, query}
  savedSearch: (id: string) => `/v1/saved-searches/${encodeURIComponent(id)}`, // DELETE
} as const;

export function queryString(q: object): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q as Record<string, unknown>)) {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

export function normalizeFiling(r: FilingRow | Filing): Filing {
  if ('principal_address' in r && r.principal_address) return r as Filing;
  const f = r as FilingRow;
  return {
    state: f.state, source_id: f.source_id, entity: f.entity, entity_kind: f.entity_kind,
    filing_type: f.filing_type, filed_date: f.filed_date, status: f.status, county: f.county,
    registered_agent: f.registered_agent,
    principal_address: { line1: f.address_1, line2: f.address_2, city: f.city, state: f.address_state, zip_code: f.zip_code },
    naics_guess: f.naics_guess, naics_basis: f.naics_basis,
    contacts: Array.isArray(f.contacts) ? f.contacts : [],
    source_date: f.source_date,
  };
}

export function isStripeCheckoutUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname === 'checkout.stripe.com';
  } catch {
    return false;
  }
}

export function createLeadsClient(opts: LeadsClientOptions) {
  const f = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 20000;

  async function raw(path: string, init: RequestInit = {}): Promise<Response> {
    const token = await opts.getToken().catch(() => null);
    const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (init.body) headers['Content-Type'] = 'application/json';
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    let res: Response;
    try {
      res = await f(`${opts.baseUrl}${path}`, { ...init, headers, signal: ctrl.signal });
    } catch {
      throw new ApiError('unavailable', 'Service unavailable');
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({} as { detail?: unknown }));
      const detail = typeof body.detail === 'string' ? body.detail : `HTTP ${res.status}`;
      throw new ApiError(errorKindForStatus(res.status), detail, res.status);
    }
    return res;
  }

  async function json<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await raw(path, init);
    try {
      return (await res.json()) as T;
    } catch {
      throw new ApiError('unavailable', 'Invalid response from service', res.status);
    }
  }

  return {
    getCoverage: () => json<{ states: StateCoverage[] }>(PATHS.coverage),
    listVerticals: () => json<{ verticals: Vertical[] }>(PATHS.verticals),
    searchFilings: async (q: FilingQuery): Promise<FilingPage> => {
      const page = await json<Omit<FilingPage, 'filings'> & { filings: FilingRow[] }>(`${PATHS.filings}${queryString(q)}`);
      return { ...page, filings: (page.filings || []).map(normalizeFiling) };
    },
    /** Returns the CSV as a Blob; the caller triggers the download. */
    exportCsv: async (q: FilingQuery): Promise<CsvExport> => {
      const { limit: _l, offset: _o, ...rest } = q;
      const res = await raw(`${PATHS.filingsCsv}${queryString(rest)}`, { headers: { Accept: 'text/csv' } });
      return {
        blob: await res.blob(),
        total: Number(res.headers.get('X-Total-Count')) || null,
        truncated: res.headers.get('X-Truncated') === '1',
      };
    },
    listProfiles: () => json<{ profiles: Array<{ id: string; paid: boolean; active: boolean }> }>(PATHS.profiles),
    getAccount: () => json<Account>(PATHS.account),
    redeemPromo: (code: string) =>
      json<{ ok: boolean; message: string }>(PATHS.redeem, { method: 'POST', body: JSON.stringify({ code }) }),
    /**
     * Fail-closed checkout: returns the Stripe URL only when the backend
     * produced a checkout.stripe.com URL. Never talks to Stripe directly.
     */
    createCheckout: async (successUrl: string, cancelUrl: string): Promise<string> => {
      const r = await json<{ checkout_url?: string }>(PATHS.checkout, {
        method: 'POST',
        body: JSON.stringify({ success_url: successUrl, cancel_url: cancelUrl }),
      });
      if (!isStripeCheckoutUrl(r.checkout_url)) {
        throw new ApiError('unsupported', 'Checkout is not available yet');
      }
      return r.checkout_url;
    },
    listSavedSearches: () => json<{ saved_searches: SavedSearch[] }>(PATHS.savedSearches),
    createSavedSearch: (name: string, query: FilingQuery) =>
      json<SavedSearch>(PATHS.savedSearches, { method: 'POST', body: JSON.stringify({ name, query, cadence: 'weekly' }) }),
    deleteSavedSearch: (id: string) =>
      json<{ ok: boolean }>(PATHS.savedSearch(id), { method: 'DELETE' }),
  };
}

export type LeadsClient = ReturnType<typeof createLeadsClient>;
