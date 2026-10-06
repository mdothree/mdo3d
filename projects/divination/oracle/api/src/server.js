import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ClaudeReadingService } from './services/claudeReadingService.js';
import { StripeService } from './services/stripeService.js';
import { freeAiLimiter, checkoutLimiter, tooLong, checkPaidSession } from './security.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Services
const claudeService = new ClaudeReadingService();
const stripeService = new StripeService('BlackLabb Oracle');

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true
}));
app.use(express.json());

// Checkout readingTypes that may redeem a premium reading of each spread size.
const SPREAD_ORDER = ['single', 'three', 'celtic'];
const SPREAD_ENTITLEMENTS = {
  single: ['single-premium', 'three', 'celtic', 'monthly'],
  three: ['three', 'celtic', 'monthly'],
  celtic: ['celtic', 'monthly']
};

// Routes

/**
 * POST /api/reading/generate
 * Generate personalized oracle card reading
 */
app.post('/api/reading/generate', async (req, res) => {
  try {
    const { cards, question, spreadType, premium } = req.body;

    if (!Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({ error: 'Cards required' });
    }
    if (cards.length > 10) {
      return res.status(400).json({ error: 'Too many cards' });
    }

    // For free tier, return basic reading
    if (!premium) {
      return res.json({
        success: true,
        reading: {
          type: 'basic',
          cards: cards.map(card => ({
            name: card.name,
            meaning: card.upright.brief,
            guidance: card.upright.guidance
          }))
        }
      });
    }

    const lengthError = tooLong({ Question: [question, 1000], Cards: [cards, 20000] });
    if (lengthError) {
      return res.status(413).json({ success: false, error: lengthError });
    }

    // For premium, generate AI reading
    // Premium requires a verified, paid Stripe session from this service, bought
    // for this spread size or larger (a $2.99 single session can't unlock Celtic Cross).
    {
      let tier = cards.length > 3 ? 'celtic' : cards.length > 1 ? 'three' : 'single';
      if (SPREAD_ORDER.indexOf(spreadType) > SPREAD_ORDER.indexOf(tier)) tier = spreadType;
      const denied = await checkPaidSession(stripeService, req.body.sessionId, {
        allowedTypes: SPREAD_ENTITLEMENTS[tier]
      });
      if (denied) return res.status(denied.status).json({ success: false, error: denied.error });
    }

    const reading = await claudeService.generatePersonalizedReading(
      cards,
      question,
      spreadType
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

/**
 * POST /api/reading/quick-insight
 * Generate quick AI insight for a single card
 */
app.post('/api/reading/quick-insight', freeAiLimiter, async (req, res) => {
  try {
    const { card, question } = req.body;

    if (!card) {
      return res.status(400).json({ error: 'Card required' });
    }

    const lengthError = tooLong({ Question: [question, 1000], Card: [card, 4000] });
    if (lengthError) {
      return res.status(413).json({ success: false, error: lengthError });
    }

    const insight = await claudeService.generateQuickInsight(card, question);

    res.json({
      success: true,
      insight
    });

  } catch (error) {
    console.error('Quick insight error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate insight' 
    });
  }
});

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
      'single-premium': { price: 2.99, name: 'Premium Single Card Reading', desc: 'Detailed AI-powered oracle card reading' },
      'three': { price: 4.99, name: 'Three Card Spread Reading', desc: 'Past, Present, Future spread with AI insights' },
      'celtic': { price: 9.99, name: 'Celtic Cross Reading', desc: 'Complete 10-card Celtic Cross spread with deep analysis' },
      'monthly': { price: 9.99, name: 'Monthly Subscription', desc: 'Unlimited premium readings for 30 days' }
    };

    const config = pricingConfig[readingType];
    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Invalid reading type'
      });
    }

    // Create Stripe checkout session
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
    console.log('Saving reading for user:', userId);

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

/**
 * GET /api/health
 * Health check
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'oracle-cards-api',
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
  console.log(`Oracle Cards API running on port ${PORT}`);
  console.log(`Frontend: ${process.env.FRONTEND_URL}`);
});

export default app;
