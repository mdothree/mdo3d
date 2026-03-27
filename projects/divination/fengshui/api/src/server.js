import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ClaudeFengShuiService } from './services/claudeFengShuiService.js';
import { StripeService } from '../../../shared/services/stripeService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3008;

// Services
const claudeService = new ClaudeFengShuiService();
const stripeService = new StripeService('Feng Shui Analyzer');

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true
}));
app.use(express.json());

// Routes

/**
 * POST /api/analysis/generate
 * Generate personalized Feng Shui space analysis
 */
app.post('/api/analysis/generate', async (req, res) => {
  try {
    const { spaceData, goals, premium } = req.body;

    if (!spaceData) {
      return res.status(400).json({ error: 'Space data required' });
    }

    // For free tier, return basic analysis
    if (!premium) {
      return res.json({
        success: true,
        analysis: {
          type: 'basic',
          spaceType: spaceData.spaceType,
          roomType: spaceData.roomType,
          basicTips: [
            'Ensure clear pathways for energy flow',
            'Remove clutter from corners',
            'Add plants for Wood element energy',
            'Use mirrors to expand small spaces'
          ]
        }
      });
    }

    // For premium, generate AI analysis
    const analysis = await claudeService.generateSpaceAnalysis(spaceData, goals);

    res.json({
      success: true,
      analysis: {
        type: 'premium',
        ...analysis
      }
    });

  } catch (error) {
    console.error('Analysis generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate analysis'
    });
  }
});

/**
 * POST /api/analysis/quick-tip
 * Generate quick Feng Shui tip
 */
app.post('/api/analysis/quick-tip', async (req, res) => {
  try {
    const { spaceType, issue } = req.body;

    const tip = await claudeService.generateQuickTip(spaceType, issue);

    res.json({
      success: true,
      tip
    });

  } catch (error) {
    console.error('Quick tip error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate tip'
    });
  }
});

/**
 * POST /api/payment/create-checkout
 * Create Stripe checkout for premium analysis
 */
app.post('/api/payment/create-checkout', async (req, res) => {
  try {
    const { analysisType, email, userId } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Pricing configuration
    const pricingConfig = {
      'single-room': { price: 4.99, name: 'Single Room Analysis', desc: 'Detailed Feng Shui analysis for one room' },
      'full-home': { price: 12.99, name: 'Full Home Analysis', desc: 'Comprehensive analysis of your entire home' },
      'office': { price: 9.99, name: 'Office/Workspace Analysis', desc: 'Optimize your workspace for success' },
      'monthly': { price: 14.99, name: 'Monthly Subscription', desc: 'Unlimited analyses for 30 days' }
    };

    const config = pricingConfig[analysisType];
    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Invalid analysis type'
      });
    }

    const result = await stripeService.createCheckoutSession({
      productName: config.name,
      description: config.desc,
      priceUSD: config.price,
      email: email,
      userId: userId,
      metadata: {
        analysisType: analysisType,
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
 * POST /api/analysis/save
 * Save analysis to user's history
 */
app.post('/api/analysis/save', async (req, res) => {
  try {
    const { userId, analysis } = req.body;

    // TODO: Save to Firebase
    console.log('Saving Feng Shui analysis for user:', userId);

    res.json({
      success: true,
      message: 'Analysis saved'
    });

  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save analysis'
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
    service: 'fengshui-api',
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
  console.log(`Feng Shui API running on port ${PORT}`);
  console.log(`Frontend: ${process.env.FRONTEND_URL}`);
});

export default app;
