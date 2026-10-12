#!/usr/bin/env node
// scripts/inject-config.js
// Replaces REPLACE_WITH_* placeholder values in all HTML files
// with actual environment variable values at build time.
//
// Usage:
//   node scripts/inject-config.js
//   (Vercel runs this automatically via the "build" script in package.json)
//
// Required environment variables (set in Vercel project settings):
//   FIREBASE_API_KEY
//   FIREBASE_AUTH_DOMAIN
//   FIREBASE_PROJECT_ID
//   FIREBASE_STORAGE_BUCKET
//   FIREBASE_MESSAGING_SENDER_ID
//   FIREBASE_APP_ID
//   STRIPE_PUBLISHABLE_KEY
//   STRIPE_PRICE_ID_MONTHLY
//   STRIPE_PRICE_ID_YEARLY
//   STRIPE_CUSTOMER_PORTAL_URL

const fs   = require('fs');
const path = require('path');

// ── Collect env vars ──────────────────────────────────────────
const required = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID',
  'STRIPE_PUBLISHABLE_KEY',
  'STRIPE_PRICE_ID_MONTHLY',
  'STRIPE_PRICE_ID_YEARLY',
  'STRIPE_CUSTOMER_PORTAL_URL',
];

const missing = required.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.warn(`[inject-config] WARNING: missing env vars: ${missing.join(', ')}`);
  console.warn('[inject-config] Unset FIREBASE_* keeps the committed public web config; unset STRIPE_PUBLISHABLE_KEY leaves checkout failing closed.');
}

// Firebase web config is public by design (it ships to every browser). The committed meta in public/*.html
// already holds the shared mdo3d-utilities web config used by every mdothree tool, so it is only overridden
// when ALL FIREBASE_* vars are set — a missing var never writes placeholders into the page.
const fbKeys = required.filter(k => k.startsWith('FIREBASE_'));
const firebaseConfig = fbKeys.every(k => process.env[k]) ? JSON.stringify({
  apiKey:            process.env.FIREBASE_API_KEY,
  authDomain:        process.env.FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.FIREBASE_PROJECT_ID,
  storageBucket:     process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.FIREBASE_APP_ID,
}) : null;

// Publishable key only (never a secret key). Empty when unset: Stripe() then fails and checkout fails closed.
const stripeConfig = JSON.stringify({
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY       || '',
  paymentLinkMonthly: process.env.STRIPE_PAYMENT_LINK_MONTHLY || 'https://buy.stripe.com/3cIbJ05gY1LP1hWfwn8k80v',
  paymentLinkYearly: process.env.STRIPE_PAYMENT_LINK_YEARLY || 'https://buy.stripe.com/dRmeVcgZGdux9Os97Z8k80w',
  portalUrl:      process.env.STRIPE_CUSTOMER_PORTAL_URL   || '',
  // #66b: Pro checkout stays closed (coming-soon copy, no payment link) unless this is exactly 'true'.
  PRO_CHECKOUT_ENABLED: process.env.PRO_CHECKOUT_ENABLED === 'true',
});

// ── Find all HTML files in public/ ───────────────────────────
function findHTML(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findHTML(full));
    else if (entry.name.endsWith('.html')) results.push(full);
  }
  return results;
}

const publicDir = path.resolve(__dirname, '..', 'public');
const htmlFiles = findHTML(publicDir);

// ── Inject config into each HTML file ────────────────────────
let injected = 0;
for (const file of htmlFiles) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // Replace firebase-config meta tag content
  if (firebaseConfig) content = content.replace(
    /(<meta name="firebase-config" content=')[^']*(')/g,
    `$1${firebaseConfig.replace(/'/g, '&apos;')}$2`
  );

  // Replace stripe-config meta tag content
  content = content.replace(
    /(<meta name="stripe-config" content=')[^']*(')/g,
    `$1${stripeConfig.replace(/'/g, '&apos;')}$2`
  );

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    injected++;
    console.log(`[inject-config] ✓ ${path.relative(publicDir, file)}`);
  }
}

console.log(`[inject-config] Done — ${injected}/${htmlFiles.length} HTML files updated.`);
