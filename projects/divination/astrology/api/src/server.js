import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ClaudeAstrologyService } from './services/claudeAstrologyService.js';
import { StripeService } from '../../../shared/services/stripeService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3007;

// Services
const claudeService = new ClaudeAstrologyService();
const stripeService = new StripeService('Astrology Chart');

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true
}));
app.use(express.json());

// Routes

/**
 * POST /api/chart/interpret
 * Generate personalized birth chart interpretation
 */
app.post('/api/chart/interpret', async (req, res) => {
  try {
    const { chart, question, premium } = req.body;

    if (!chart || !chart.sun || !chart.moon || !chart.rising) {
      return res.status(400).json({ error: 'Complete chart data required (sun, moon, rising)' });
    }

    // For free tier, return basic reading
    if (!premium) {
      return res.json({
        success: true,
        reading: {
          type: 'basic',
          sun: {
            sign: chart.sun.sign.name,
            element: chart.sun.sign.element,
            quality: chart.sun.sign.quality
          },
          moon: {
            sign: chart.moon.sign.name,
            element: chart.moon.sign.element,
            quality: chart.moon.sign.quality
          },
          rising: {
            sign: chart.rising.sign.name,
            element: chart.rising.sign.element,
            quality: chart.rising.sign.quality
          }
        }
      });
    }

    // For premium, generate AI reading
    const reading = await claudeService.generateChartReading(chart, question);

    res.json({
      success: true,
      reading: {
        type: 'premium',
        ...reading
      }
    });

  } catch (error) {
    console.error('Chart interpretation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate chart interpretation'
    });
  }
});

/**
 * POST /api/chart/quick-insight
 * Generate quick AI insight for a chart
 */
app.post('/api/chart/quick-insight', async (req, res) => {
  try {
    const { chart, question } = req.body;

    if (!chart) {
      return res.status(400).json({ error: 'Chart data required' });
    }

    const insight = await claudeService.generateQuickInsight(chart, question);

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
 * POST /api/chart/compatibility
 * Generate compatibility reading between two charts
 */
app.post('/api/chart/compatibility', async (req, res) => {
  try {
    const { chart1, chart2, premium } = req.body;

    if (!chart1 || !chart2) {
      return res.status(400).json({ error: 'Two charts required for compatibility' });
    }

    if (!premium) {
      return res.status(402).json({
        success: false,
        error: 'Compatibility readings require premium access'
      });
    }

    const reading = await claudeService.generateCompatibilityReading(chart1, chart2);

    res.json({
      success: true,
      reading: {
        type: 'premium',
        ...reading
      }
    });

  } catch (error) {
    console.error('Compatibility reading error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate compatibility reading'
    });
  }
});

/**
 * POST /api/payment/create-checkout
 * Create Stripe checkout for premium features
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
      'birth-chart': { price: 4.99, name: 'Premium Birth Chart Reading', desc: 'Detailed AI-powered natal chart interpretation' },
      'compatibility': { price: 7.99, name: 'Compatibility Reading', desc: 'In-depth synastry analysis for two charts' },
      'transit': { price: 5.99, name: 'Transit Reading', desc: 'Current planetary influences on your chart' },
      'monthly': { price: 12.99, name: 'Monthly Subscription', desc: 'Unlimited premium readings for 30 days' }
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
 * POST /api/chart/save
 * Save chart to user's history
 */
app.post('/api/chart/save', async (req, res) => {
  try {
    const { userId, chart, reading } = req.body;

    // TODO: Save to Firebase
    console.log('Saving astrology chart for user:', userId);

    res.json({
      success: true,
      message: 'Chart saved'
    });

  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save chart'
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
    service: 'astrology-api',
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
  console.log(`Astrology API running on port ${PORT}`);
  console.log(`Frontend: ${process.env.FRONTEND_URL}`);
});

export default app;
