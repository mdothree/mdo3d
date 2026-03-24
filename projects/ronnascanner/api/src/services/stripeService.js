import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Stripe Service
 * Handles payment processing for premium reports
 */

export class StripeService {
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    this.premiumPrice = parseInt(process.env.PREMIUM_PRICE_USD || '29') * 100; // Convert to cents
  }

  async createCheckoutSession(userId, email, analysisId) {
    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Premium Resume Analysis',
                description: 'AI-powered detailed resume analysis with rewrite suggestions',
                images: [`${process.env.WEBSITE_URL}/assets/premium-report.png`]
              },
              unit_amount: this.premiumPrice
            },
            quantity: 1
          }
        ],
        mode: 'payment',
        success_url: `${process.env.WEBSITE_URL}/success?session_id={CHECKOUT_SESSION_ID}&analysis_id=${analysisId}`,
        cancel_url: `${process.env.WEBSITE_URL}/cancel`,
        customer_email: email,
        metadata: {
          userId,
          analysisId,
          type: 'premium_analysis'
        }
      });

      return {
        success: true,
        sessionId: session.id,
        url: session.url
      };
    } catch (error) {
      console.error('Stripe checkout error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async verifyPayment(sessionId) {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);
      
      if (session.payment_status === 'paid') {
        return {
          success: true,
          paid: true,
          metadata: session.metadata
        };
      }

      return {
        success: true,
        paid: false
      };
    } catch (error) {
      console.error('Payment verification error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async createPaymentIntent(amount, metadata = {}) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amount * 100, // Convert to cents
        currency: 'usd',
        metadata
      });

      return {
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      };
    } catch (error) {
      console.error('Payment intent error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async refundPayment(paymentIntentId, reason = 'requested_by_customer') {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        reason
      });

      return {
        success: true,
        refundId: refund.id,
        status: refund.status
      };
    } catch (error) {
      console.error('Refund error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async handleWebhook(payload, signature) {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      // Handle different event types
      switch (event.type) {
        case 'checkout.session.completed':
          return await this.handleCheckoutComplete(event.data.object);
        
        case 'payment_intent.succeeded':
          return await this.handlePaymentSuccess(event.data.object);
        
        case 'payment_intent.payment_failed':
          return await this.handlePaymentFailure(event.data.object);
        
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Webhook error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async handleCheckoutComplete(session) {
    console.log('Checkout completed:', session.id);
    
    // TODO: Update database with payment info
    // TODO: Trigger premium analysis
    // TODO: Send premium report email
    
    return { success: true };
  }

  async handlePaymentSuccess(paymentIntent) {
    console.log('Payment succeeded:', paymentIntent.id);
    return { success: true };
  }

  async handlePaymentFailure(paymentIntent) {
    console.log('Payment failed:', paymentIntent.id);
    return { success: true };
  }

  async listPayments(customerId, limit = 10) {
    try {
      const charges = await this.stripe.charges.list({
        customer: customerId,
        limit
      });

      return {
        success: true,
        payments: charges.data
      };
    } catch (error) {
      console.error('List payments error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
