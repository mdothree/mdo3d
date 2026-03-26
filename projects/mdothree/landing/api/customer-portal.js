/**
 * Vercel Serverless Function: Create Stripe Customer Portal Session
 * 
 * Creates a session to redirect user to Stripe's hosted Customer Portal
 * where they can manage their subscription (cancel, update payment, etc.)
 * 
 * POST /api/customer-portal
 * Body: { customerId: 'cus_xxx', returnUrl: 'https://...' }
 * 
 * Required env vars:
 * - STRIPE_SECRET_KEY
 * - STRIPE_CUSTOMER_PORTAL_CONFIG_ID (optional, uses default if not set)
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'https://mdothree.com');
  res.setHeader('Access-Control-Allow-Origin', 'https://www.mdothree.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { customerId, returnUrl } = req.body;

    if (!customerId) {
      return res.status(400).json({ error: 'Missing customerId' });
    }

    const params = {
      customer: customerId,
      return_url: returnUrl || 'https://mdothree.com/account.html',
    };

    // Use custom config if set (for branding, etc.)
    if (process.env.STRIPE_CUSTOMER_PORTAL_CONFIG_ID) {
      params.configuration = process.env.STRIPE_CUSTOMER_PORTAL_CONFIG_ID;
    }

    const session = await stripe.billingPortal.sessions.create(params);

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Customer portal error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create portal session' });
  }
};
