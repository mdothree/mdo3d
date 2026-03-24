import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Shared Stripe Service for Lamar Platforms
 * 
 * Standardized payment processing across all platforms:
 * - Oracle Cards, Tarot Cards, Dream Interpreter, etc.
 * 
 * Features:
 * - Test/Live key support (automatic based on NODE_ENV)
 * - Checkout session creation
 * - Payment verification
 * - Webhook handling
 * - Refunds
 * 
 * Environment Variables Required:
 * - STRIPE_TEST_SECRET_KEY (for development/testing)
 * - STRIPE_LIVE_SECRET_KEY (for production)
 * - STRIPE_TEST_WEBHOOK_SECRET
 * - STRIPE_LIVE_WEBHOOK_SECRET
 * - NODE_ENV (development|production)
 * - WEBSITE_URL (for success/cancel redirects)
 */

export class StripeService {
  constructor(platformName = 'Lamar Platform') {
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Use test keys for development, live keys for production
    const secretKey = isProduction 
      ? process.env.STRIPE_LIVE_SECRET_KEY 
      : process.env.STRIPE_TEST_SECRET_KEY;
    
    this.webhookSecret = isProduction
      ? process.env.STRIPE_LIVE_WEBHOOK_SECRET
      : process.env.STRIPE_TEST_WEBHOOK_SECRET;

    if (!secretKey) {
      throw new Error(`Stripe ${isProduction ? 'live' : 'test'} secret key not configured`);
    }

    this.stripe = new Stripe(secretKey);
    this.platformName = platformName;
    this.isProduction = isProduction;
    
    console.log(`[Stripe] Initialized for ${platformName} in ${isProduction ? 'PRODUCTION' : 'TEST'} mode`);
  }

  /**
   * Create Stripe Checkout Session
   * 
   * @param {Object} options - Checkout options
   * @param {string} options.productName - Name of the product/service
   * @param {string} options.description - Product description
   * @param {number} options.priceUSD - Price in USD (will be converted to cents)
   * @param {string} options.email - Customer email
   * @param {string} options.userId - User ID (optional)
   * @param {Object} options.metadata - Additional metadata
   * @param {string} options.successPath - Success redirect path (e.g., '/success')
   * @param {string} options.cancelPath - Cancel redirect path (e.g., '/cancel')
   * @returns {Promise<Object>} - { success, sessionId, url, error }
   */
  async createCheckoutSession(options) {
    try {
      const {
        productName,
        description,
        priceUSD,
        email,
        userId = null,
        metadata = {},
        successPath = '/success',
        cancelPath = '/cancel',
        imageUrl = null
      } = options;

      const websiteUrl = process.env.WEBSITE_URL || 'http://localhost:8080';
      const priceInCents = Math.round(priceUSD * 100);

      const lineItem = {
        price_data: {
          currency: 'usd',
          product_data: {
            name: productName,
            description: description
          },
          unit_amount: priceInCents
        },
        quantity: 1
      };

      // Add image if provided
      if (imageUrl) {
        lineItem.price_data.product_data.images = [imageUrl];
      }

      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [lineItem],
        mode: 'payment',
        success_url: `${websiteUrl}${successPath}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${websiteUrl}${cancelPath}`,
        customer_email: email,
        metadata: {
          platform: this.platformName,
          userId: userId || 'anonymous',
          environment: this.isProduction ? 'production' : 'test',
          ...metadata
        }
      });

      console.log(`[Stripe] Checkout session created: ${session.id} for $${priceUSD}`);

      return {
        success: true,
        sessionId: session.id,
        url: session.url
      };
    } catch (error) {
      console.error('[Stripe] Checkout error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verify Payment
   * 
   * @param {string} sessionId - Stripe checkout session ID
   * @returns {Promise<Object>} - { success, paid, metadata, amount, error }
   */
  async verifyPayment(sessionId) {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);
      
      const paid = session.payment_status === 'paid';
      
      console.log(`[Stripe] Payment ${paid ? 'verified' : 'not confirmed'}: ${sessionId}`);

      return {
        success: true,
        paid: paid,
        metadata: session.metadata,
        amount: session.amount_total / 100, // Convert cents to dollars
        customerEmail: session.customer_email
      };
    } catch (error) {
      console.error('[Stripe] Verification error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle Stripe Webhook
   * 
   * @param {Buffer} payload - Raw request body
   * @param {string} signature - Stripe signature header
   * @returns {Promise<Object>} - { success, eventType, error }
   */
  async handleWebhook(payload, signature) {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret
      );

      console.log(`[Stripe] Webhook received: ${event.type}`);

      // Handle different event types
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutComplete(event.data.object);
          break;
        
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object);
          break;
        
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(event.data.object);
          break;
        
        case 'charge.refunded':
          await this.handleRefund(event.data.object);
          break;
        
        default:
          console.log(`[Stripe] Unhandled event type: ${event.type}`);
      }

      return { 
        success: true, 
        eventType: event.type 
      };
    } catch (error) {
      console.error('[Stripe] Webhook error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create Payment Intent (for custom integrations)
   * 
   * @param {number} amountUSD - Amount in USD
   * @param {Object} metadata - Payment metadata
   * @returns {Promise<Object>} - { success, clientSecret, paymentIntentId, error }
   */
  async createPaymentIntent(amountUSD, metadata = {}) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amountUSD * 100),
        currency: 'usd',
        metadata: {
          platform: this.platformName,
          ...metadata
        }
      });

      return {
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      };
    } catch (error) {
      console.error('[Stripe] Payment intent error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Refund Payment
   * 
   * @param {string} paymentIntentId - Payment intent ID
   * @param {string} reason - Refund reason
   * @returns {Promise<Object>} - { success, refundId, status, error }
   */
  async refundPayment(paymentIntentId, reason = 'requested_by_customer') {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        reason
      });

      console.log(`[Stripe] Refund created: ${refund.id}`);

      return {
        success: true,
        refundId: refund.id,
        status: refund.status
      };
    } catch (error) {
      console.error('[Stripe] Refund error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Webhook event handlers (override in platform-specific implementations)
  
  async handleCheckoutComplete(session) {
    console.log('[Stripe] Checkout completed:', session.id, session.metadata);
    // Override this in platform-specific implementation
    return { success: true };
  }

  async handlePaymentSuccess(paymentIntent) {
    console.log('[Stripe] Payment succeeded:', paymentIntent.id);
    // Override this in platform-specific implementation
    return { success: true };
  }

  async handlePaymentFailure(paymentIntent) {
    console.log('[Stripe] Payment failed:', paymentIntent.id, paymentIntent.last_payment_error);
    // Override this in platform-specific implementation
    return { success: true };
  }

  async handleRefund(charge) {
    console.log('[Stripe] Charge refunded:', charge.id);
    // Override this in platform-specific implementation
    return { success: true };
  }

  /**
   * List customer payments
   * 
   * @param {string} customerEmail - Customer email
   * @param {number} limit - Number of results
   * @returns {Promise<Object>} - { success, payments, error }
   */
  async listCustomerPayments(customerEmail, limit = 10) {
    try {
      // First find customer by email
      const customers = await this.stripe.customers.list({
        email: customerEmail,
        limit: 1
      });

      if (customers.data.length === 0) {
        return {
          success: true,
          payments: []
        };
      }

      const customerId = customers.data[0].id;
      const charges = await this.stripe.charges.list({
        customer: customerId,
        limit
      });

      return {
        success: true,
        payments: charges.data
      };
    } catch (error) {
      console.error('[Stripe] List payments error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
