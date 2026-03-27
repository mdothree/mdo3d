import Stripe from 'stripe';

/**
 * Shared Stripe Payment Service
 * Used by all divination backend services
 */

export class StripeService {
  constructor(serviceName = 'MDO3D Divination') {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    this.serviceName = serviceName;
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  }

  /**
   * Create a Stripe checkout session for premium features
   */
  async createCheckoutSession({
    productName,
    description,
    priceUSD,
    email,
    userId,
    metadata = {},
    successPath = '/success',
    cancelPath = '/'
  }) {
    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${this.serviceName} - ${productName}`,
                description: description
              },
              unit_amount: Math.round(priceUSD * 100) // Convert to cents
            },
            quantity: 1
          }
        ],
        mode: 'payment',
        customer_email: email,
        success_url: `${process.env.FRONTEND_URL}${successPath}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}${cancelPath}`,
        metadata: {
          serviceName: this.serviceName,
          userId: userId || 'anonymous',
          ...metadata
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

  /**
   * Verify payment completion by session ID
   */
  async verifyPayment(sessionId) {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);

      return {
        success: true,
        paid: session.payment_status === 'paid',
        metadata: session.metadata,
        amount: session.amount_total / 100,
        email: session.customer_email
      };
    } catch (error) {
      console.error('Payment verification error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(rawBody, signature) {
    try {
      const event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.webhookSecret
      );

      // Handle different event types
      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object;
          console.log(`Payment completed for ${session.customer_email}`);
          // TODO: Update user's premium status in Firebase
          return {
            success: true,
            event: 'payment_completed',
            data: {
              email: session.customer_email,
              metadata: session.metadata,
              amount: session.amount_total / 100
            }
          };

        case 'payment_intent.payment_failed':
          const failedPayment = event.data.object;
          console.log(`Payment failed: ${failedPayment.last_payment_error?.message}`);
          return {
            success: true,
            event: 'payment_failed',
            data: {
              error: failedPayment.last_payment_error?.message
            }
          };

        default:
          return {
            success: true,
            event: event.type,
            data: {}
          };
      }
    } catch (error) {
      console.error('Webhook error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create a subscription checkout session
   */
  async createSubscriptionCheckout({
    priceId,
    email,
    userId,
    metadata = {},
    successPath = '/success',
    cancelPath = '/'
  }) {
    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1
          }
        ],
        mode: 'subscription',
        customer_email: email,
        success_url: `${process.env.FRONTEND_URL}${successPath}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}${cancelPath}`,
        metadata: {
          serviceName: this.serviceName,
          userId: userId || 'anonymous',
          ...metadata
        }
      });

      return {
        success: true,
        sessionId: session.id,
        url: session.url
      };
    } catch (error) {
      console.error('Subscription checkout error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
