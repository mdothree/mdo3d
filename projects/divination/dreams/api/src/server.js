import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ClaudeDreamService } from './services/claudeDreamService.js';
import { StripeService } from '../../../shared/services/stripeService.js';

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
app.use(express.json());

// Routes

/**
 * POST /api/dream/interpret
 * Generate dream interpretation
 */
app.post('/api/dream/interpret', async (req, res) => {
  try {
    const { dreamText, detectedSymbols, premium } = req.body;

    // Validation
    if (!dreamText || dreamText.trim().length === 0) {
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

    // Generate interpretation
    const interpretation = await dreamService.interpretDream({
      dreamText,
      detectedSymbols: detectedSymbols || [],
      premium: premium || false
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

/**
 * POST /api/symbol/meaning
 * Get meaning for a specific symbol
 */
app.post('/api/symbol/meaning', async (req, res) => {
  try {
    const { symbolName } = req.body;

    if (!symbolName) {
      return res.status(400).json({
        success: false,
        error: 'Symbol name is required'
      });
    }

    const meaning = await dreamService.getSymbolMeaning(symbolName);

    if (meaning.success) {
      res.json(meaning);
    } else {
      res.status(500).json({
        success: false,
        error: meaning.error || 'Failed to get symbol meaning'
      });
    }

  } catch (error) {
    console.error('Symbol meaning error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get symbol meaning'
    });
  }
});

/**
 * POST /api/dream/patterns
 * Analyze patterns across multiple dreams
 */
app.post('/api/dream/patterns', async (req, res) => {
  try {
    const { dreams } = req.body;

    if (!dreams || !Array.isArray(dreams) || dreams.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'At least 2 dreams are required for pattern analysis'
      });
    }

    const analysis = await dreamService.analyzeDreamPatterns(dreams);

    if (analysis.success) {
      res.json(analysis);
    } else {
      res.status(500).json({
        success: false,
        error: analysis.error || 'Failed to analyze patterns'
      });
    }

  } catch (error) {
    console.error('Pattern analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze patterns'
    });
  }
});

/**
 * POST /api/payment/create-checkout
 * Create Stripe checkout for premium dream analysis
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
    const price = parseFloat(process.env.DREAM_ANALYSIS_PRICE) || 4.99;

    // Create Stripe checkout session
    const result = await stripeService.createCheckoutSession({
      productName: 'Premium Dream Analysis',
      description: 'AI-powered deep dream interpretation with psychological and spiritual insights',
      priceUSD: price,
      email: email,
      userId: userId,
      metadata: {
        analysisType: readingType || 'dream-analysis',
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
        price: price
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
  console.log(`Dream Interpreter API running on port ${PORT}`);
  console.log(`Frontend: ${process.env.FRONTEND_URL}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
