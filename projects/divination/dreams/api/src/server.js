import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ClaudeDreamService } from './services/claudeDreamService.js';
import { StripeService } from './services/stripeService.js';
import { freeAiLimiter, checkoutLimiter, tooLong, checkPaidSession, rateLimit } from './security.js';
import { notFoundOrMethodNotAllowed, jsonErrorHandler } from './httpErrors.js';
import { priceFor } from './pricing.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;

// Services
const dreamService = new ClaudeDreamService();
const stripeService = new StripeService('BlackLabb Dreams');

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8083',
  credentials: true
}));
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
 * POST /api/dream/interpret
 * Generate dream interpretation
 */
app.post('/api/dream/interpret', freeAiLimiter, async (req, res) => {
  try {
    const { dreamText, detectedSymbols } = req.body;

    // Validation
    if (!dreamText || typeof dreamText !== 'string' || dreamText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Dream text is required'
      });
    }

    if (dreamText.length < 20) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a more detailed dream description (at least 20 characters)'
      });
    }

    const lengthError = tooLong({ 'Dream text': [dreamText, 5000], 'Detected symbols': [detectedSymbols, 2000] });
    if (lengthError) {
      return res.status(413).json({ success: false, error: lengthError });
    }

    // Generate interpretation
    // Paid from first use (JARVIS #94): every interpretation requires a verified,
    // paid Stripe session from this service (no session -> 402).
    {
      const denied = await checkPaidSession(stripeService, req.body.sessionId);
      if (denied) return res.status(denied.status).json({ success: false, error: denied.error });
    }

    const interpretation = await dreamService.interpretDream({
      dreamText,
      detectedSymbols: detectedSymbols || [],
      premium: true
    });

    if (interpretation.success) {
      res.json(interpretation);
    } else {
      res.status(500).json({
        success: false,
        error: interpretation.error || 'Failed to interpret dream'
      });
    }

  } catch (error) {
    console.error('Dream interpretation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to interpret dream'
    });
  }
});

// POST /api/symbol/meaning and POST /api/dream/patterns were removed: they made
// unauthenticated Claude calls and no frontend used them. The service methods
// (getSymbolMeaning, analyzeDreamPatterns) remain if a gated version is needed.

/**
 * POST /api/payment/create-checkout
 * Create Stripe checkout for premium dream analysis
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
    // shared/pricing.json (JARVIS #63); the old DREAM_ANALYSIS_PRICE env
    // override is gone so the shown price can't drift from the charged one.
    // Unknown (or missing) readingType -> 400, never a default.
    const config = priceFor(readingType);
    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Invalid reading type'
      });
    }

    // Create Stripe checkout session
    const result = await stripeService.createCheckoutSession({
      productName: config.label,
      description: config.description,
      amountCents: config.amount_cents,
      email: email,
      userId: userId,
      metadata: {
        analysisType: readingType,
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
 * POST /api/dream/save
 * Save dream to user's journal (future implementation)
 */
app.post('/api/dream/save', async (req, res) => {
  try {
    const { userId, dream } = req.body;

    // TODO: Save to Firebase
    console.log('Saving dream for user:', userId);

    res.json({
      success: true,
      message: 'Dream saved'
    });

  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save dream'
    });
  }
});

/**
 * GET /api/health
 * Health check
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'dream-interpreter-api',
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
    console.log(`Dream Interpreter API running on port ${PORT}`);
    console.log(`Frontend: ${process.env.FRONTEND_URL}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

export default app;
// Exposed for tests (stub the Stripe client; no network).
export { stripeService };
