import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ClaudeFengShuiService } from './services/claudeFengShuiService.js';
import { StripeService } from './services/stripeService.js';
import { checkoutLimiter, tooLong, checkPaidSession } from './security.js';

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
// Parse JSON for every route EXCEPT the Stripe webhook: Stripe signature
// verification (stripe.webhooks.constructEvent) needs the exact raw bytes, which
// the route-level express.raw() below provides. If express.json() ran first it
// would consume the stream and express.raw() would be skipped.
const jsonParser = express.json();
app.use((req, res, next) => {
  if (req.path === '/api/webhook/stripe') return next();
  return jsonParser(req, res, next);
});

// Free-tier tips derived from the user's room, facing direction and issues.
// Room and direction tips are the same copy the legacy static client used
// (feng-shui-analyzer/public/js/app.js); issue tips reuse the original generic
// tips. Falls back to the generic list when nothing specific applies.
const ROOM_TIPS = {
  'Living Room': ['Arrange seating to face the door for better social energy', 'Add plants to bring life force (Chi) into the space', 'Keep the area clutter-free to allow energy to flow freely'],
  'Bedroom': ['Position bed diagonally from the door for better rest', 'Avoid mirrors facing the bed to prevent sleep disturbances', 'Use soft, calming colors for relaxation'],
  'Kitchen': ['Keep the stove area clean and functional for wealth energy', 'Ensure good ventilation to let stagnant energy flow out', 'Fill cabinets completely to symbolize abundance'],
  'Home Office': ['Place desk facing the door but not directly in line with it', 'Add a plant for focus and creativity', 'Keep the space organized to enhance mental clarity'],
  'Bathroom': ['Use mirrors strategically to reflect positive energy back into the home', 'Keep the lid down on toilets to prevent energy from draining away', 'Add plants to absorb moisture and add life'],
  'Entrance': ['Ensure the entrance is well-lit to welcome positive energy', 'Remove obstacles that block the flow from entering', 'Add a welcome mat and plants to invite good Chi']
};
const DIRECTION_TIPS = {
  North: 'Use mirrors and water features to enhance career energy',
  South: 'Add bright lights and red items for fame and recognition',
  East: 'Plants and green colors promote health and family harmony',
  West: 'Circular shapes and white items enhance children and creativity',
  Northeast: 'Crystals and earth tones support knowledge and self-cultivation',
  Northwest: 'Metal objects and white colors attract helpful people',
  Southeast: 'Wooden furniture and plants attract wealth and abundance',
  Southwest: 'Earth tones and crystals enhance love and relationships'
};
const ISSUE_TIPS = {
  'Cluttered spaces': 'Remove clutter from corners',
  'Blocked pathways': 'Ensure clear pathways for energy flow',
  'Lack of plants': 'Add plants for Wood element energy'
};
function basicTipsFor(spaceData = {}) {
  const elements = Array.isArray(spaceData.elements) ? spaceData.elements : [];
  const issues = Array.isArray(spaceData.issues) ? spaceData.issues : [];
  const tips = [];
  const add = t => { if (t && !tips.includes(t)) tips.push(t); };
  issues.forEach(i => add(ISSUE_TIPS[i]));
  (ROOM_TIPS[spaceData.roomType] || []).forEach(add);
  const dirTip = DIRECTION_TIPS[spaceData.direction];
  // Don't pair a mirror tip with the bedroom "avoid mirrors" advice.
  if (!(spaceData.roomType === 'Bedroom' && /mirror/i.test(dirTip || ''))) add(dirTip);
  if (tips.length < 3) {
    add('Ensure clear pathways for energy flow');
    add('Remove clutter from corners');
    if (!elements.includes('Wood')) add('Add plants for Wood element energy');
    if (spaceData.roomType !== 'Bedroom') add('Use mirrors to expand small spaces');
  }
  return tips.slice(0, 5);
}

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

    const lengthError = tooLong({ 'Space data': [spaceData, 5000], Goals: [goals, 1000] });
    if (lengthError) {
      return res.status(413).json({ success: false, error: lengthError });
    }

    // For free tier, return basic analysis
    if (!premium) {
      // Deterministic basic energy score from the space inputs so the free
      // loop shows a real number instead of N/A. Mirrors the balance logic in
      // the static client (base 50, element-coverage + direction-match bonus).
      const elementDirection = {
        North: 'Water', Northeast: 'Earth', East: 'Wood', Southeast: 'Wood',
        South: 'Fire', Southwest: 'Earth', West: 'Metal', Northwest: 'Metal'
      };
      const picked = Array.isArray(spaceData.elements) ? spaceData.elements : [];
      let overallScore = 50;
      if (picked.length >= 3) overallScore += 20;
      else if (picked.length === 2) overallScore += 10;
      else if (picked.length === 1) overallScore += 5;
      const dirElem = elementDirection[spaceData.direction];
      if (dirElem && picked.includes(dirElem)) overallScore += 15;
      overallScore = Math.max(40, Math.min(95, overallScore));

      return res.json({
        success: true,
        analysis: {
          type: 'basic',
          spaceType: spaceData.spaceType,
          roomType: spaceData.roomType,
          overallScore,
          basicTips: basicTipsFor(spaceData)
        }
      });
    }

    // For premium, generate AI analysis
    // Premium requires a verified, paid Stripe session from this service — prevents
    // a free reading via premium:true. All analysis tiers share this one endpoint.
    {
      const denied = await checkPaidSession(stripeService, req.body.sessionId, {
        allowedTypes: ['single-room', 'full-home', 'office', 'monthly'],
        typeKey: 'analysisType'
      });
      if (denied) return res.status(denied.status).json({ success: false, error: denied.error });
    }

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

// POST /api/analysis/quick-tip was removed: it made unauthenticated Claude
// calls and no frontend used it. ClaudeFengShuiService.generateQuickTip remains.

/**
 * POST /api/payment/create-checkout
 * Create Stripe checkout for premium analysis
 */
app.post('/api/payment/create-checkout', checkoutLimiter, async (req, res) => {
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
