import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ClaudeRunesService } from './services/claudeRunesService.js';
import { StripeService } from '../../../shared/services/stripeService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3006;

// Services
const claudeService = new ClaudeRunesService();
const stripeService = new StripeService('Runes Oracle');

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true
}));
app.use(express.json());

// Routes

/**
 * POST /api/reading/generate
 * Generate personalized rune reading
 */
app.post('/api/reading/generate', async (req, res) => {
  try {
    const { runes, question, spreadType, premium } = req.body;

    if (!runes || runes.length === 0) {
      return res.status(400).json({ error: 'Runes required' });
    }

    // Validate spread type matches rune count
    const expectedCounts = { single: 1, three: 3, five: 5 };
    if (spreadType && expectedCounts[spreadType] && runes.length !== expectedCounts[spreadType]) {
      return res.status(400).json({
        error: `${spreadType} spread requires ${expectedCounts[spreadType]} runes`
      });
    }

    // For free tier, return basic reading
    if (!premium) {
      return res.json({
        success: true,
        reading: {
          type: 'basic',
          runes: runes.map(rune => ({
            name: rune.name,
            symbol: rune.symbol,
            meaning: rune.meaning,
            guidance: rune.upright?.guidance || rune.guidance
          }))
        }
      });
    }

    // For premium, generate AI reading
    const reading = await claudeService.generateRuneReading(
      runes,
      question,
      spreadType || 'single'
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
 * Generate quick AI insight for a single rune
 */
app.post('/api/reading/quick-insight', async (req, res) => {
  try {
    const { rune, question } = req.body;

    if (!rune) {
      return res.status(400).json({ error: 'Rune required' });
    }

    const insight = await claudeService.generateQuickInsight(rune, question);

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
app.post('/api/payment/create-checkout', async (req, res) => {
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
      'single-premium': { price: 2.99, name: 'Premium Single Rune Reading', desc: 'Detailed AI-powered rune interpretation' },
      'three': { price: 4.99, name: 'Three Rune Spread', desc: 'Past, Present, Future spread with AI insights' },
      'five': { price: 7.99, name: 'Five Rune Spread', desc: 'Comprehensive spread with higher guidance' },
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
    console.log('Saving rune reading for user:', userId);

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
    service: 'runes-api',
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
  console.log(`Runes API running on port ${PORT}`);
  console.log(`Frontend: ${process.env.FRONTEND_URL}`);
});

export default app;
