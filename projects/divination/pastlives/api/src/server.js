import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ClaudePastLifeService } from './services/claudePastLifeService.js';
import { StripeService } from './services/stripeService.js';
import { freeAiLimiter, checkoutLimiter, tooLong, checkPaidSession, rateLimit } from './security.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3009;

// Services
const claudeService = new ClaudePastLifeService();
const stripeService = new StripeService('Past Life Insights');

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
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
 * POST /api/reading/generate
 * Generate personalized past life reading
 */
app.post('/api/reading/generate', freeAiLimiter, async (req, res) => {
  try {
    const { birthData, question, premium } = req.body;

    if (!birthData || !birthData.birthDate) {
      return res.status(400).json({ error: 'Birth date required' });
    }

    const lengthError = tooLong({ 'Birth date': [birthData.birthDate, 40], 'Birth data': [birthData, 5000], Question: [question, 1000] });
    if (lengthError) {
      return res.status(413).json({ success: false, error: lengthError });
    }

    // For free tier, return basic glimpse
    if (!premium) {
      const quickInsight = await claudeService.generateQuickInsight(
        birthData.birthDate,
        question
      );

      return res.json({
        success: true,
        reading: {
          type: 'basic',
          glimpse: quickInsight,
          message: 'Unlock a full past life reading for deeper insights into your soul journey.'
        }
      });
    }

    // For premium, generate full AI reading
    // Premium requires a verified, paid Stripe session from this service — prevents
    // a free reading via premium:true. Every past life product covers a single reading.
    {
      const denied = await checkPaidSession(stripeService, req.body.sessionId, {
        allowedTypes: ['single-life', 'multiple-lives', 'deep-dive', 'monthly']
      });
      if (denied) return res.status(denied.status).json({ success: false, error: denied.error });
    }

    const reading = await claudeService.generatePastLifeReading(birthData, question);

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

/**
 * POST /api/reading/multiple-lives
 * Generate reading of multiple past lives
 */
app.post('/api/reading/multiple-lives', async (req, res) => {
  try {
    const { birthData, premium } = req.body;

    if (!birthData || !birthData.birthDate) {
      return res.status(400).json({ error: 'Birth date required' });
    }

    const lengthError = tooLong({ 'Birth data': [birthData, 5000] });
    if (lengthError) {
      return res.status(413).json({ success: false, error: lengthError });
    }

    if (!premium) {
      return res.status(402).json({
        success: false,
        error: 'Multiple lives reading requires premium access'
      });
    }

    // Same paid-session guard as /api/reading/generate — `premium: true` alone
    // must not unlock a paid reading — and the session must be for the $9.99
    // multiple-lives product or a tier above it (a $5.99 single-life session is refused).
    {
      const denied = await checkPaidSession(stripeService, req.body.sessionId, {
        allowedTypes: ['multiple-lives', 'deep-dive', 'monthly']
      });
      if (denied) return res.status(denied.status).json({ success: false, error: denied.error });
    }

    const reading = await claudeService.generateMultipleLives(birthData);

    res.json({
      success: true,
      reading: {
        type: 'premium',
        ...reading
      }
    });

  } catch (error) {
    console.error('Multiple lives reading error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate multiple lives reading'
    });
  }
});

// POST /api/reading/quick-insight was removed: it made unauthenticated Claude
// calls and no frontend used it. ClaudePastLifeService.generateQuickInsight
// still backs the free tier of /api/reading/generate.

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

    // Pricing configuration
    const pricingConfig = {
      'single-life': { price: 5.99, name: 'Single Past Life Reading', desc: 'Detailed exploration of one significant past life' },
      'multiple-lives': { price: 9.99, name: 'Multiple Lives Reading', desc: 'Glimpses into 3 past lives with soul theme' },
      'deep-dive': { price: 14.99, name: 'Deep Soul Journey', desc: 'Comprehensive past life exploration with healing guidance' },
      'monthly': { price: 12.99, name: 'Monthly Subscription', desc: 'Unlimited past life readings for 30 days' }
    };

    const config = pricingConfig[readingType];
    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Invalid reading type'
      });
    }

    const result = await stripeService.createCheckoutSession({
      productName: config.name,
      description: config.desc,
      priceUSD: config.price,
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
        price: config.price
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
    console.log('Saving past life reading for user:', userId);

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
    service: 'pastlives-api',
    timestamp: new Date().toISOString()
  });
});

// Error handling
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: error.message || 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Past Lives API running on port ${PORT}`);
  console.log(`Frontend: ${process.env.FRONTEND_URL}`);
});

export default app;
