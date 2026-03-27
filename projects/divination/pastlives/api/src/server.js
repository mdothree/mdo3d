import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ClaudePastLifeService } from './services/claudePastLifeService.js';
import { StripeService } from '../../../shared/services/stripeService.js';

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
app.use(express.json());

// Routes

/**
 * POST /api/reading/generate
 * Generate personalized past life reading
 */
app.post('/api/reading/generate', async (req, res) => {
  try {
    const { birthData, question, premium } = req.body;

    if (!birthData || !birthData.birthDate) {
      return res.status(400).json({ error: 'Birth date required' });
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

    if (!premium) {
      return res.status(402).json({
        success: false,
        error: 'Multiple lives reading requires premium access'
      });
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

/**
 * POST /api/reading/quick-insight
 * Generate quick past life glimpse
 */
app.post('/api/reading/quick-insight', async (req, res) => {
  try {
    const { birthDate, question } = req.body;

    if (!birthDate) {
      return res.status(400).json({ error: 'Birth date required' });
    }

    const insight = await claudeService.generateQuickInsight(birthDate, question);

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
