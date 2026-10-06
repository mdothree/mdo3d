import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ClaudeIChingService } from './services/claudeIChingService.js';
import { StripeService } from './services/stripeService.js';
import { checkoutLimiter, tooLong, checkPaidSession, rateLimit } from './security.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;

// Services
const claudeService = new ClaudeIChingService();
const stripeService = new StripeService('I Ching Oracle');

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
 * Generate personalized I Ching hexagram reading
 */
app.post('/api/reading/generate', async (req, res) => {
  try {
    const { hexagram, question, changingLines, premium } = req.body;

    if (!hexagram) {
      return res.status(400).json({ error: 'Hexagram data required' });
    }

    // For free tier, return basic reading
    if (!premium) {
      return res.json({
        success: true,
        reading: {
          type: 'basic',
          hexagram: {
            id: hexagram.id,
            name: hexagram.name,
            chinese: hexagram.chinese,
            meaning: hexagram.upper?.meaning || hexagram.meaning,
            guidance: hexagram.upper?.guidance || hexagram.guidance
          }
        }
      });
    }

    const lengthError = tooLong({ Question: [question, 1000], Hexagram: [hexagram, 5000], 'Changing lines': [changingLines, 200] });
    if (lengthError) {
      return res.status(413).json({ success: false, error: lengthError });
    }

    // Premium requires a verified, paid Stripe session from this service — prevents
    // anyone from getting a paid reading for free by sending premium:true.
    // Any I Ching product covers this reading: the app only sells single-premium
    // and that reading already includes the changing lines.
    const denied = await checkPaidSession(stripeService, req.body.sessionId, {
      allowedTypes: ['single-premium', 'changing-lines', 'monthly']
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

    // Pricing configuration
    const pricingConfig = {
      'single-premium': { price: 2.99, name: 'Premium Hexagram Reading', desc: 'Detailed AI-powered I Ching interpretation' },
      'changing-lines': { price: 4.99, name: 'Changing Lines Reading', desc: 'Full reading with changing lines analysis' },
      'monthly': { price: 9.99, name: 'Monthly Subscription', desc: 'Unlimited premium readings for 30 days' }
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
  console.log(`I Ching API running on port ${PORT}`);
  console.log(`Frontend: ${process.env.FRONTEND_URL}`);
});

export default app;
