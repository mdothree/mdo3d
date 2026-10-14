import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ClaudeIChingService } from './services/claudeIChingService.js';
import { StripeService } from './services/stripeService.js';
import { checkoutLimiter, tooLong, checkPaidSession, rateLimit } from './security.js';
import { notFoundOrMethodNotAllowed, jsonErrorHandler } from './httpErrors.js';
import { priceFor } from './pricing.js';

dotenv.config();

const app = express();
app.disable('x-powered-by'); // SURF-011: no framework banner
const PORT = process.env.PORT || 3005;

// Services
const claudeService = new ClaudeIChingService();
const stripeService = new StripeService('I Ching Oracle');

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  // SURF-011: the frontend never sends cookies or credentials (no credentials:'include'), so
  // no Access-Control-Allow-Credentials; only the methods the routes use.
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: false
}));
// SURF-011: a coarse per-IP cap on every POST except the Stripe webhooks (the direct one is
// signature-verified; the forwarded one has its own limiter). It bounds the Stripe lookups behind
// /api/payment/verify and the paid-session checks, and the save stubs. Best-effort, per warm
// instance, like every limiter in security.js. Paid AI routes also have a per-session use cap.
app.use(rateLimit({ max: 60, skip: req => req.method !== 'POST' || req.path.startsWith('/api/webhook/') }));
// Parse JSON for every route EXCEPT the Stripe webhook: Stripe signature
// verification (stripe.webhooks.constructEvent) needs the exact raw bytes, which
// the route-level express.raw() below provides. If express.json() ran first it
// would consume the stream and express.raw() would be skipped.
const jsonParser = express.json();
app.use((req, res, next) => {
  if (req.path === '/api/webhook/stripe') return next();
  return jsonParser(req, res, next);
});

// Routes

/**
 * POST /api/reading/generate
 * Generate personalized I Ching hexagram reading
 */
app.post('/api/reading/generate', async (req, res) => {
  try {
    const { hexagram, question, changingLines } = req.body;

    if (!hexagram) {
      return res.status(400).json({ error: 'Hexagram data required' });
    }

    // Paid from first use (JARVIS #94): there is no unpaid reading tier, so every
    // request goes through the paid-session check below (no session -> 402).

    const lengthError = tooLong({ Question: [question, 1000], Hexagram: [hexagram, 5000], 'Changing lines': [changingLines, 200] });
    if (lengthError) {
      return res.status(413).json({ success: false, error: lengthError });
    }

    // Premium requires a verified, paid Stripe session from this service — prevents
    // anyone from getting a paid reading for free by sending premium:true.
    // Any I Ching product covers this reading: the app only sells single-premium
    // and that reading already includes the changing lines.
    const denied = await checkPaidSession(stripeService, req.body.sessionId, {
      allowedTypes: ['single-premium', 'changing-lines']
    });
    if (denied) {
      return res.status(denied.status).json({ success: false, error: denied.error });
    }

    // For premium, generate AI reading
    const reading = await claudeService.generateHexagramReading(
      hexagram,
      question,
      changingLines || []
    );

    res.json({
      success: true,
      reading: {
        type: 'premium',
        ...reading
      }
    });

  } catch (error) {
    console.error('Reading generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate reading'
    });
  }
});

// POST /api/reading/quick-insight was removed: it made unauthenticated Claude
// calls and no frontend used it. ClaudeIChingService.generateQuickInsight remains.

/**
 * POST /api/payment/create-checkout
 * Create Stripe checkout for premium reading
 */
app.post('/api/payment/create-checkout', checkoutLimiter, async (req, res) => {
  try {
    const { readingType, email, userId } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // The amount comes only from ./pricing.json, a synced slice of
    // shared/pricing.json (JARVIS #63). Unknown type -> 400 below, never a default.
    const config = priceFor(readingType);
    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Invalid reading type'
      });
    }

    const result = await stripeService.createCheckoutSession({
      productName: config.label,
      description: config.description,
      amountCents: config.amount_cents,
      email: email,
      userId: userId,
      metadata: {
        readingType: readingType,
        timestamp: new Date().toISOString()
      },
      successPath: '/success',
      cancelPath: '/'
    });

    if (result.success) {
      res.json({
        success: true,
        sessionId: result.sessionId,
        checkoutUrl: result.url,
        price: config.amount_cents / 100,
        amount_cents: config.amount_cents
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create checkout'
    });
  }
});

/**
 * POST /api/reading/save
 * Save reading to user's history
 */
app.post('/api/reading/save', async (req, res) => {
  try {
    const { userId, reading } = req.body;

    // TODO: Save to Firebase
    console.log('Saving I Ching reading for user:', userId);

    res.json({
      success: true,
      message: 'Reading saved'
    });

  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save reading'
    });
  }
});

/**
 * POST /api/payment/verify
 * Verify payment completion
 */
app.post('/api/payment/verify', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required'
      });
    }

    const result = await stripeService.verifyPayment(sessionId);

    if (result.success) {
      res.json({
        success: true,
        paid: result.paid,
        metadata: result.metadata,
        amount: result.amount
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify payment'
    });
  }
});

/**
 * POST /api/webhook/stripe
 * Stripe webhook handler
 */
app.post('/api/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    const result = await stripeService.handleWebhook(req.body, signature);

    if (result.success) {
      res.json({ received: true });
    } else {
      res.status(400).json({ error: result.error });
    }

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: error.message });
  }
});

// stripe-hub forwards {eventId} here (one Stripe endpoint per account instead of
// one per app). Generous limit: the hub calls from a small set of Vercel IPs.
const forwardedWebhookLimiter = rateLimit({ max: 300 });

/**
 * POST /api/webhook/stripe-forwarded
 * Event forwarded by projects/mdo3d/stripe-hub. The body is NOT trusted: the event
 * is re-fetched from Stripe with this service's key, and only events whose
 * metadata.serviceName is this service are handled (same logic as the direct route).
 */
app.post('/api/webhook/stripe-forwarded', forwardedWebhookLimiter, async (req, res) => {
  const eventId = req.body && req.body.eventId;
  if (typeof eventId !== 'string' || !/^evt_[A-Za-z0-9_]{1,250}$/.test(eventId)) {
    return res.status(400).json({ error: 'eventId is required' });
  }

  let event;
  try {
    event = await stripeService.retrieveEvent(eventId);
  } catch (error) {
    // Unknown id (wrong Stripe account / forged): final. Anything else: let the hub retry.
    const status = error.statusCode === 404 || error.statusCode === 400 ? 404 : 502;
    console.error('Forwarded webhook retrieve error:', error.message);
    return res.status(status).json({ error: 'Could not retrieve event' });
  }

  const serviceName = event?.data?.object?.metadata?.serviceName;
  if (serviceName !== stripeService.serviceName) {
    return res.json({ received: true, ignored: true });
  }

  try {
    const result = await stripeService.handleEvent(event);
    if (result.success) {
      res.json({ received: true, duplicate: Boolean(result.duplicate) });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Forwarded webhook error:', error);
    res.status(500).json({ error: 'Webhook handling failed' });
  }
});

/**
 * GET /api/health
 * Health check
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'iching-api',
    timestamp: new Date().toISOString()
  });
});

// JSON 404/405 for unmatched routes, then JSON error mapping (malformed JSON
// -> 400, oversized body -> 413, everything else -> generic 500). Must stay last.
app.use(notFoundOrMethodNotAllowed(app));
app.use(jsonErrorHandler);

// Start server
// Tests import the app without binding a port (DIVINATION_API_NO_LISTEN=1).
if (process.env.DIVINATION_API_NO_LISTEN !== '1') {
  app.listen(PORT, () => {
    console.log(`I Ching API running on port ${PORT}`);
    console.log(`Frontend: ${process.env.FRONTEND_URL}`);
  });
}

export default app;
// Exposed for tests (stub the Stripe client; no network).
export { stripeService };
