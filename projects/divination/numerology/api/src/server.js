import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ClaudeNumerologyService } from './services/claudeNumerologyService.js';
import { StripeService } from '../../../shared/services/stripeService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3010;

// Services
const claudeService = new ClaudeNumerologyService();
const stripeService = new StripeService('Numerology Insights');

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true
}));
app.use(express.json());

// Routes

/**
 * POST /api/calculate
 * Calculate all numerology numbers from name and birth date
 */
app.post('/api/calculate', async (req, res) => {
  try {
    const { name, birthDate } = req.body;

    if (!name || !birthDate) {
      return res.status(400).json({ error: 'Name and birth date required' });
    }

    const numbers = {
      lifePathNumber: ClaudeNumerologyService.calculateLifePathNumber(birthDate),
      expressionNumber: ClaudeNumerologyService.calculateExpressionNumber(name),
      soulUrgeNumber: ClaudeNumerologyService.calculateSoulUrgeNumber(name),
      personalityNumber: ClaudeNumerologyService.calculatePersonalityNumber(name),
      birthdayNumber: ClaudeNumerologyService.calculateBirthdayNumber(birthDate)
    };

    res.json({
      success: true,
      numbers,
      name,
      birthDate
    });

  } catch (error) {
    console.error('Calculation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate numbers'
    });
  }
});

/**
 * POST /api/reading/generate
 * Generate personalized numerology reading
 */
app.post('/api/reading/generate', async (req, res) => {
  try {
    const { name, birthDate, question, premium } = req.body;

    if (!name || !birthDate) {
      return res.status(400).json({ error: 'Name and birth date required' });
    }

    // Calculate numbers
    const numerologyData = {
      name,
      birthDate,
      lifePathNumber: ClaudeNumerologyService.calculateLifePathNumber(birthDate),
      expressionNumber: ClaudeNumerologyService.calculateExpressionNumber(name),
      soulUrgeNumber: ClaudeNumerologyService.calculateSoulUrgeNumber(name),
      personalityNumber: ClaudeNumerologyService.calculatePersonalityNumber(name),
      birthdayNumber: ClaudeNumerologyService.calculateBirthdayNumber(birthDate)
    };

    // For free tier, return basic reading
    if (!premium) {
      return res.json({
        success: true,
        reading: {
          type: 'basic',
          numbers: numerologyData,
          basicMeaning: getBasicLifePathMeaning(numerologyData.lifePathNumber)
        }
      });
    }

    // For premium, generate AI reading
    const reading = await claudeService.generateNumerologyReading(numerologyData, question);

    res.json({
      success: true,
      reading: {
        type: 'premium',
        numbers: numerologyData,
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
 * Generate quick numerology insight
 */
app.post('/api/reading/quick-insight', async (req, res) => {
  try {
    const { birthDate, question } = req.body;

    if (!birthDate) {
      return res.status(400).json({ error: 'Birth date required' });
    }

    const lifePathNumber = ClaudeNumerologyService.calculateLifePathNumber(birthDate);
    const insight = await claudeService.generateQuickInsight(lifePathNumber, question);

    res.json({
      success: true,
      lifePathNumber,
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
      'core-numbers': { price: 4.99, name: 'Core Numbers Reading', desc: 'Life Path, Expression, Soul Urge analysis' },
      'full-chart': { price: 9.99, name: 'Full Numerology Chart', desc: 'Complete chart with all numbers and cycles' },
      'compatibility': { price: 7.99, name: 'Compatibility Reading', desc: 'Numerology compatibility analysis' },
      'monthly': { price: 11.99, name: 'Monthly Subscription', desc: 'Unlimited numerology readings for 30 days' }
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
    console.log('Saving numerology reading for user:', userId);

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
    service: 'numerology-api',
    timestamp: new Date().toISOString()
  });
});

// Helper function for basic life path meanings
function getBasicLifePathMeaning(number) {
  const meanings = {
    1: { title: 'The Leader', brief: 'Independent, pioneering, ambitious. You are here to develop individuality and leadership.' },
    2: { title: 'The Peacemaker', brief: 'Diplomatic, sensitive, cooperative. You are here to create harmony and partnerships.' },
    3: { title: 'The Creative', brief: 'Expressive, artistic, optimistic. You are here to inspire through creativity and joy.' },
    4: { title: 'The Builder', brief: 'Practical, disciplined, hardworking. You are here to create stable foundations.' },
    5: { title: 'The Freedom Seeker', brief: 'Adventurous, versatile, dynamic. You are here to embrace change and freedom.' },
    6: { title: 'The Nurturer', brief: 'Responsible, caring, harmonious. You are here to love, heal, and serve others.' },
    7: { title: 'The Seeker', brief: 'Analytical, spiritual, introspective. You are here to seek truth and wisdom.' },
    8: { title: 'The Achiever', brief: 'Ambitious, authoritative, successful. You are here to master material success.' },
    9: { title: 'The Humanitarian', brief: 'Compassionate, generous, wise. You are here to serve humanity.' },
    11: { title: 'The Intuitive Illuminator', brief: 'Highly intuitive, inspirational, visionary. Master number with spiritual gifts.' },
    22: { title: 'The Master Builder', brief: 'Powerful manifestor, visionary leader. Master number that turns dreams into reality.' },
    33: { title: 'The Master Teacher', brief: 'Selfless love, healing presence. Master number of pure compassion.' }
  };

  return meanings[number] || { title: 'Unknown', brief: 'Calculate your full reading for insights.' };
}

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
  console.log(`Numerology API running on port ${PORT}`);
  console.log(`Frontend: ${process.env.FRONTEND_URL}`);
});

export default app;
