/**
 * UTM -> Stripe attribution (first-touch).
 *
 * The frontend (public/js/attribution.js) stores the first-touch UTM params and
 * sends them as `attribution` in the checkout request body. This module turns
 * that untrusted object into Stripe metadata:
 *   - whitelist: utm_source, utm_medium, utm_campaign, utm_content, utm_term, landing_path
 *   - values stripped to [A-Za-z0-9._~-] and truncated to 100 chars
 *   - absent/empty values omitted (never sent as "")
 *   - output keys: utm_*, attr_landing, attr_site (project slug)
 * No PII: email/userId are never read from the attribution object.
 *
 * Contract: latarence/coordination/dispatch/2026-10-08_CONVERSION_utm_stripe_join.md
 */

export const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
export const MAX_LEN = 100;

/** Strip to [A-Za-z0-9._~-] and truncate. Non-string/number input -> ''. */
export function sanitizeValue(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  return String(value).replace(/[^A-Za-z0-9._~-]/g, '').slice(0, MAX_LEN);
}

/**
 * Untrusted `attribution` object -> Stripe metadata (utm_*, attr_landing, attr_site).
 * Unknown keys are dropped. attr_site is always set when a site slug is given.
 */
export function attributionMetadata(raw, site) {
  const out = {};
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  for (const key of UTM_KEYS) {
    const v = sanitizeValue(src[key]);
    if (v) out[key] = v;
  }
  const landing = sanitizeValue(src.landing_path);
  if (landing) out.attr_landing = landing;
  const siteSlug = sanitizeValue(site);
  if (siteSlug) out.attr_site = siteSlug;
  return out;
}

/**
 * Merge attribution metadata under existing metadata. Existing keys always win,
 * so readingType/serviceName/etc. are never dropped or overwritten.
 */
export function mergeMetadata(existing, attribution) {
  return { ...(attribution || {}), ...(existing || {}) };
}
