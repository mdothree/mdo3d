import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeValue, attributionMetadata, mergeMetadata } from '../src/attribution.js';
import { buildCheckoutSessionParams } from '../src/services/checkoutParams.js';

test('sanitizeValue strips to [A-Za-z0-9._~-] and truncates to 100', () => {
  assert.equal(sanitizeValue('spring sale!<script>'), 'springsalescript');
  assert.equal(sanitizeValue('a.b_c~d-e'), 'a.b_c~d-e');
  assert.equal(sanitizeValue('x'.repeat(250)).length, 100);
  assert.equal(sanitizeValue(42), '42');
  assert.equal(sanitizeValue(undefined), '');
  assert.equal(sanitizeValue({ a: 1 }), '');
  assert.equal(sanitizeValue('user@example.com'), 'userexample.com');
});

test('attributionMetadata whitelists keys, omits absent values, sets attr_site', () => {
  const md = attributionMetadata({
    utm_source: 'tiktok',
    utm_medium: '',
    utm_campaign: 'oct launch',
    landing_path: '/index.html',
    email: 'someone@example.com',
    first_seen: '2026-10-11T00:00:00Z',
    evil: 'x'
  }, 'oracle');
  assert.deepEqual(md, {
    utm_source: 'tiktok',
    utm_campaign: 'octlaunch',
    attr_landing: 'index.html',
    attr_site: 'oracle'
  });
  assert.deepEqual(attributionMetadata(null, 'tarot'), { attr_site: 'tarot' });
  assert.deepEqual(attributionMetadata('garbage', 'tarot'), { attr_site: 'tarot' });
  assert.deepEqual(attributionMetadata(['utm_source'], 'tarot'), { attr_site: 'tarot' });
});

test('mergeMetadata never drops or overwrites existing keys', () => {
  const merged = mergeMetadata({ readingType: 'three', utm_source: 'kept' }, { utm_source: 'x', utm_term: 'y' });
  assert.deepEqual(merged, { utm_source: 'kept', utm_term: 'y', readingType: 'three' });
});

test('buildCheckoutSessionParams merges attribution into session + PI metadata, rest unchanged', () => {
  const attribution = attributionMetadata({ utm_source: 'ig', utm_campaign: 'c1' }, 'oracle');
  const p = buildCheckoutSessionParams({
    serviceName: 'BlackLabb Oracle',
    frontendUrl: 'https://oracle.mdo3d.com',
    productName: 'Three Card Spread Reading',
    description: 'desc',
    priceUSD: 4.99,
    email: 'buyer@example.com',
    userId: null,
    metadata: { readingType: 'three', timestamp: 't' },
    attribution,
    successPath: '/success',
    cancelPath: '/'
  });
  assert.equal(p.mode, 'payment');
  assert.equal(p.line_items[0].price_data.unit_amount, 499);
  assert.equal(p.success_url, 'https://oracle.mdo3d.com/success?session_id={CHECKOUT_SESSION_ID}');
  assert.equal(p.cancel_url, 'https://oracle.mdo3d.com/');
  assert.equal(p.customer_email, 'buyer@example.com');
  assert.equal(p.allow_promotion_codes, undefined);
  assert.deepEqual(p.metadata, {
    utm_source: 'ig', utm_campaign: 'c1', attr_site: 'oracle',
    serviceName: 'BlackLabb Oracle', userId: 'anonymous', readingType: 'three', timestamp: 't'
  });
  assert.deepEqual(p.payment_intent_data.metadata, {
    utm_source: 'ig', utm_campaign: 'c1', attr_site: 'oracle', serviceName: 'BlackLabb Oracle'
  });
  // No PII in metadata
  const all = JSON.stringify([p.metadata, p.payment_intent_data.metadata]);
  assert.ok(!all.includes('buyer@example.com'));
});

test('buildCheckoutSessionParams without attribution keeps legacy metadata exactly', () => {
  const p = buildCheckoutSessionParams({
    serviceName: 'S', frontendUrl: 'https://x', productName: 'P', description: 'd',
    priceUSD: 2.99, email: 'e@x.com', userId: 'u1', metadata: { readingType: 'single-premium' }
  });
  assert.deepEqual(p.metadata, { serviceName: 'S', userId: 'u1', readingType: 'single-premium' });
  assert.deepEqual(p.payment_intent_data.metadata, { serviceName: 'S' });
});
