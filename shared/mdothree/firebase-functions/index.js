/**
 * Firebase Cloud Functions — mdothree.com Stripe Integration
 *
 * Security hardening:
 *   - Every endpoint verifies the Firebase ID token (Authorization: Bearer <token>)
 *   - CORS is restricted to mdothree.com domains only
 *   - Simple in-memory rate limiting (upgrade to Redis/Firestore for production scale)
 *   - All inputs are validated and sanitized before touching Stripe
 *   - Stripe webhook signature is verified on every event
 *
 * Deploy:
 *   cd firebase-functions
 *   npm install
 *   firebase functions:config:set stripe.secret_key="sk_live_..." stripe.webhook_secret="whsec_..."
 *   firebase deploy --only functions
 */

'use strict';

const functions  = require('firebase-functions');
const admin      = require('firebase-admin');
const stripe     = require('stripe')(functions.config().stripe.secret_key);

admin.initializeApp();
const db = admin.firestore();

// ── CORS whitelist ────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = [
  'https://mdothree.com',
  'https://www.mdothree.com',
  'https://pdf.mdothree.com',
  'https://image.mdothree.com',
  'https://qr.mdothree.com',
  'https://text.mdothree.com',
  'https://json.mdothree.com',
  // Vercel preview deployments
  /^https:\/\/mdothree-.*\.vercel\.app$/,
];

function setCORS(req, res) {
  const origin = req.headers.origin || '';
  const allowed = ALLOWED_ORIGINS.some(o =>
    typeof o === 'string' ? o === origin : o.test(origin)
  );
  if (allowed) {
    res.set('Access-Control-Allow-Origin', origin);
  }
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '86400');
}

function handleCORS(req, res) {
  setCORS(req, res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return true; }
  if (req.method !== 'POST')    { res.status(405).json({ error: 'Method not allowed' }); return true; }
  return false;
}

// ── Auth verification ─────────────────────────────────────────────────────────

async function verifyAuth(req, res) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return null;
  }
  const idToken = authHeader.slice(7);
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    return decoded;
  } catch (e) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return null;
  }
}

// ── Rate limiting (in-memory — replace with Firestore for multi-instance) ────

const _rateLimits = new Map();  // uid → { count, resetAt }

function checkRateLimit(uid, maxPerMinute = 5) {
  const now = Date.now();
  const entry = _rateLimits.get(uid);
  if (!entry || now > entry.resetAt) {
    _rateLimits.set(uid, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= maxPerMinute) return false;
  entry.count++;
  return true;
}

// ── Input sanitization ────────────────────────────────────────────────────────

function sanitizeString(val, maxLen = 200) {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLen).replace(/[<>"'`]/g, '');
}

function isValidPriceId(priceId) {
  // Stripe price IDs are always price_xxxxx
  return typeof priceId === 'string' && /^price_[a-zA-Z0-9]{14,}$/.test(priceId);
}

function isValidPaymentMethodId(pmId) {
  return typeof pmId === 'string' && /^pm_[a-zA-Z0-9]{14,}$/.test(pmId);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getOrCreateCustomer(uid, email) {
  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();

  if (userSnap.exists && userSnap.data().stripeCustomerId) {
    return userSnap.data().stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    metadata: { firebaseUID: uid },
    ...(email ? { email } : {}),
  });

  await userRef.set({ stripeCustomerId: customer.id }, { merge: true });
  return customer.id;
}

async function getUIDFromCustomer(customerId) {
  const snap = await db.collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1).get();
  return snap.empty ? null : snap.docs[0].id;
}

async function updateSubscription(uid, sub) {
  const active = ['active', 'trialing'].includes(sub.status);
  await db.collection('subscriptions').doc(uid).set({
    uid,
    stripeSubscriptionId:  sub.id,
    stripeCustomerId:      sub.customer,
    priceId:               sub.items?.data?.[0]?.price?.id || '',
    status:                active ? 'active' : sub.status,
    cancelAtPeriodEnd:     sub.cancel_at_period_end || false,
    trialEnd:              sub.trial_end
      ? admin.firestore.Timestamp.fromMillis(sub.trial_end * 1000) : null,
    expiresAt:             admin.firestore.Timestamp.fromMillis(sub.current_period_end * 1000),
    updatedAt:             admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINT: createSubscription
// ─────────────────────────────────────────────────────────────────────────────

exports.createSubscription = functions.https.onRequest(async (req, res) => {
  if (handleCORS(req, res)) return;

  // 1. Verify Firebase auth token
  const decoded = await verifyAuth(req, res);
  if (!decoded) return;

  // 2. Rate limit (max 3 subscription attempts per minute per user)
  if (!checkRateLimit(decoded.uid, 3)) {
    res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
    return;
  }

  // 3. Validate and sanitize inputs
  const { paymentMethodId, priceId, feature } = req.body;

  if (!isValidPaymentMethodId(paymentMethodId)) {
    res.status(400).json({ error: 'Invalid payment method ID' });
    return;
  }
  if (!isValidPriceId(priceId)) {
    res.status(400).json({ error: 'Invalid price ID' });
    return;
  }

  // 4. Confirm the UID from the verified token (never trust client-supplied uid)
  const uid = decoded.uid;
  const email = decoded.email || null;

  try {
    // 5. Check if already subscribed
    const existing = await db.collection('subscriptions').doc(uid).get();
    if (existing.exists) {
      const d = existing.data();
      if (d.status === 'active' && d.expiresAt?.toMillis() > Date.now()) {
        res.status(409).json({ error: 'Already subscribed', alreadySubscribed: true });
        return;
      }
    }

    const customerId = await getOrCreateCustomer(uid, email);

    // 6. Attach payment method
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    // 7. Create subscription with 7-day trial
    const subscription = await stripe.subscriptions.create({
      customer:           customerId,
      items:              [{ price: priceId }],
      trial_period_days:  7,
      payment_behavior:   'default_incomplete',
      payment_settings:   { save_default_payment_method: 'on_subscription' },
      expand:             ['latest_invoice.payment_intent'],
      metadata:           { firebaseUID: uid, feature: sanitizeString(feature || '', 50) },
    });

    // 8. Persist to Firestore
    await updateSubscription(uid, subscription);

    // 9. Log the feature that triggered the upgrade
    await db.collection('upgrade_events').add({
      uid,
      feature:   sanitizeString(feature || 'unknown', 50),
      priceId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 10. Handle 3DS if required
    const pi = subscription.latest_invoice?.payment_intent;
    if (pi?.status === 'requires_action') {
      res.json({ requiresAction: true, clientSecret: pi.client_secret, subscriptionId: subscription.id });
    } else {
      res.json({ requiresAction: false, subscriptionId: subscription.id, status: subscription.status });
    }

  } catch (err) {
    functions.logger.error('[createSubscription]', err);
    res.status(500).json({ error: err.message || 'Payment failed. Please try again.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINT: cancelSubscription
// ─────────────────────────────────────────────────────────────────────────────

exports.cancelSubscription = functions.https.onRequest(async (req, res) => {
  if (handleCORS(req, res)) return;

  const decoded = await verifyAuth(req, res);
  if (!decoded) return;

  if (!checkRateLimit(decoded.uid, 5)) {
    res.status(429).json({ error: 'Too many requests.' }); return;
  }

  const uid = decoded.uid;

  try {
    const subSnap = await db.collection('subscriptions').doc(uid).get();
    if (!subSnap.exists) {
      res.status(404).json({ error: 'No active subscription found' }); return;
    }

    const { stripeSubscriptionId } = subSnap.data();

    // Cancel at period end — user retains access until expiry
    const updated = await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    await db.collection('subscriptions').doc(uid).set({
      cancelAtPeriodEnd: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    res.json({
      success: true,
      message: 'Subscription will cancel at period end.',
      expiresAt: updated.current_period_end,
    });

  } catch (err) {
    functions.logger.error('[cancelSubscription]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINT: createBillingPortalSession (Stripe Customer Portal)
// ─────────────────────────────────────────────────────────────────────────────

exports.createBillingPortalSession = functions.https.onRequest(async (req, res) => {
  if (handleCORS(req, res)) return;

  const decoded = await verifyAuth(req, res);
  if (!decoded) return;

  if (!checkRateLimit(decoded.uid, 10)) {
    res.status(429).json({ error: 'Too many requests.' }); return;
  }

  const returnUrl = sanitizeString(req.body.returnUrl || 'https://mdothree.com', 300);
  // Validate return URL is an mdothree domain
  if (!returnUrl.startsWith('https://mdothree.com') &&
      !returnUrl.startsWith('https://www.mdothree.com') &&
      !/^https:\/\/mdothree-.*\.vercel\.app/.test(returnUrl)) {
    res.status(400).json({ error: 'Invalid return URL' }); return;
  }

  const uid = decoded.uid;

  try {
    const userSnap = await db.collection('users').doc(uid).get();
    if (!userSnap.exists || !userSnap.data().stripeCustomerId) {
      res.status(404).json({ error: 'No billing account found' }); return;
    }

    const session = await stripe.billingPortal.sessions.create({
      customer:   userSnap.data().stripeCustomerId,
      return_url: returnUrl,
    });

    res.json({ url: session.url });

  } catch (err) {
    functions.logger.error('[createBillingPortalSession]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINT: getSubscriptionStatus
// ─────────────────────────────────────────────────────────────────────────────

exports.getSubscriptionStatus = functions.https.onRequest(async (req, res) => {
  if (handleCORS(req, res)) return;

  const decoded = await verifyAuth(req, res);
  if (!decoded) return;

  try {
    const snap = await db.collection('subscriptions').doc(decoded.uid).get();
    if (!snap.exists) {
      res.json({ status: 'none', isPremium: false }); return;
    }
    const d = snap.data();
    const isPremium = d.status === 'active' && (d.expiresAt?.toMillis() || 0) > Date.now();
    res.json({
      status:            d.status,
      isPremium,
      cancelAtPeriodEnd: d.cancelAtPeriodEnd || false,
      expiresAt:         d.expiresAt?.toMillis() || null,
      trialEnd:          d.trialEnd?.toMillis() || null,
    });
  } catch (err) {
    functions.logger.error('[getSubscriptionStatus]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINT: stripeWebhook — keep Firestore in sync with Stripe events
// ─────────────────────────────────────────────────────────────────────────────

exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  // Webhook does NOT use Firebase auth — it's called by Stripe, not users
  // Security comes from the webhook signature verification below
  const sig    = req.headers['stripe-signature'];
  const secret = functions.config().stripe.webhook_secret;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, secret);
  } catch (err) {
    functions.logger.warn('[stripeWebhook] Signature verification failed:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  functions.logger.info('[stripeWebhook] Event:', event.type);
  const obj = event.data.object;

  try {
    switch (event.type) {

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const uid = await getUIDFromCustomer(obj.customer);
        if (uid) await updateSubscription(uid, obj);
        break;
      }

      case 'customer.subscription.deleted': {
        const uid = await getUIDFromCustomer(obj.customer);
        if (uid) {
          await db.collection('subscriptions').doc(uid).set({
            status:    'canceled',
            expiresAt: admin.firestore.Timestamp.fromMillis(obj.current_period_end * 1000),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        if (!obj.subscription) break;
        const sub = await stripe.subscriptions.retrieve(obj.subscription);
        const uid = await getUIDFromCustomer(obj.customer);
        if (uid) await updateSubscription(uid, sub);
        break;
      }

      case 'invoice.payment_failed': {
        const uid = await getUIDFromCustomer(obj.customer);
        if (uid) {
          await db.collection('subscriptions').doc(uid).set({
            status:    'past_due',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
        }
        break;
      }

      case 'customer.subscription.trial_will_end': {
        // Fired 3 days before trial ends — good place to send reminder email
        const uid = await getUIDFromCustomer(obj.customer);
        if (uid) {
          await db.collection('notifications').add({
            uid,
            type:      'trial_ending',
            trialEnd:  admin.firestore.Timestamp.fromMillis(obj.trial_end * 1000),
            sent:      false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
        break;
      }
    }

    res.json({ received: true });

  } catch (err) {
    functions.logger.error('[stripeWebhook] Handler error:', err);
    // Still return 200 so Stripe doesn't retry — log the error separately
    res.json({ received: true, warning: err.message });
  }
});
