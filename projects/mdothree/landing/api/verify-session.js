/**
 * Vercel Serverless Function: Verify Stripe Session
 * 
 * Verifies a checkout session and returns status
 * Used by success page to confirm payment before granting access
 * 
 * GET /api/verify-session?session_id=cs_xxx
 * 
 * Required env vars:
 * - STRIPE_SECRET_KEY
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'https://mdothree.com');
  res.setHeader('Access-Control-Allow-Origin', 'https://www.mdothree.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { session_id } = req.query;

  if (!session_id) {
    return res.status(400).json({ error: 'Missing session_id parameter' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);

    return res.status(200).json({
      id: session.id,
      payment_status: session.payment_status,
      subscription_status: session.subscription?.status || null,
      customer_id: session.customer,
      subscription_id: session.subscription,
      amount_total: session.amount_total,
      currency: session.currency,
      metadata: session.metadata,
    });
  } catch (error) {
    console.error('Session verification error:', error);
    return res.status(500).json({ error: 'Failed to verify session' });
  }
};
