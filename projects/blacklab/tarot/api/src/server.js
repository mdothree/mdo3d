import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ClaudeReadingService } from './services/claudeReadingService.js';
import { StripeService } from '../../../shared/services/stripeService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

// Services
const claudeService = new ClaudeReadingService();
const stripeService = new StripeService('JarvisBee Tarot');

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8081',
  credentials: true
}));
app.use(express.json());

// Routes

/**
 * POST /api/reading/generate
 * Generate personalized tarot reading
 */
app.post('/api/reading/generate', async (req, res) => {
  try {
    const { cards, question, spreadType, premium } = req.body;

    // Validation
    if (!cards || !Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Cards array is required'
      });
    }

    // Validate spread type matches card count
    const expectedCounts = {
      'single': 1,
      'three': 3,
      'celtic': 10
    };

    if (expectedCounts[spreadType] !== cards.length) {
      return res.status(400).json({
        success: false,
        error: `Invalid card count for ${spreadType} spread. Expected ${expectedCounts[spreadType]}, got ${cards.length}`
      });
    }

    // Generate reading
    const reading = await claudeService.generateReading({
      cards,
      question,
      spreadType,
      premium: premium || false
    });

    if (reading.success) {
      res.json(reading);
    } else {
      res.status(500).json({
        success: false,
        error: reading.error || 'Failed to generate reading'
      });
    }

  } catch (error) {
    console.error('Generate reading error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate reading'
    });
  }
});

/**
 * POST /api/card/meaning
 * Get quick meaning for a single card
 */
app.post('/api/card/meaning', async (req, res) => {
  try {
    const { cardName, reversed } = req.body;

    if (!cardName) {
      return res.status(400).json({
        success: false,
        error: 'Card name is required'
      });
    }

    const meaning = await claudeService.getCardMeaning(cardName, reversed);

    if (meaning.success) {
      res.json(meaning);
    } else {
      res.status(500).json({
        success: false,
        error: meaning.error || 'Failed to get card meaning'
      });
    }

  } catch (error) {
    console.error('Card meaning error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get card meaning'
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
      'single': { price: 2.99, name: 'Premium Single Card Reading', desc: 'Detailed AI-powered tarot card reading' },
      'three': { price: 4.99, name: 'Three Card Spread Reading', desc: 'Past, Present, Future spread with deep insights' },
      'celtic': { price: 9.99, name: 'Celtic Cross Reading', desc: 'Complete 10-card Celtic Cross spread with comprehensive analysis' }
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
 * POST /api/reading/save
 * Save reading to user's history (future implementation)
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
 * GET /api/health
 * Health check
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'tarot-cards-api',
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
  console.log(`Tarot Cards API running on port ${PORT}`);
  console.log(`Frontend: ${process.env.FRONTEND_URL}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
