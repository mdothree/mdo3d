import Stripe from 'stripe';

/**
 * Stripe Payment Service for Runes
 */

export class StripeService {
  constructor(serviceName = 'MDO3D Runes') {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    this.serviceName = serviceName;
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  }

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
              unit_amount: Math.round(priceUSD * 100)
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
        },
        // Copy serviceName onto the PaymentIntent so payment_intent.* events can be
        // routed by the stripe-hub too (session metadata is not inherited by the PI).
        payment_intent_data: {
          metadata: { serviceName: this.serviceName }
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

  // Best-effort per-session use counter stored in Stripe metadata (merge — other
  // keys preserved). Used to cap premium generations per payment (anti-abuse).
  async recordUse(sessionId, uses) {
    await this.stripe.checkout.sessions.update(sessionId, { metadata: { uses: String(uses) } });
  }

  // ── Webhook handling ─────────────────────────────────────────────────────
  // Two entry points share handleEvent():
  //   handleWebhook(rawBody, signature)  direct Stripe delivery (/api/webhook/stripe)
  //   retrieveEvent(eventId)             stripe-hub forward (/api/webhook/stripe-forwarded);
  //                                      the event is re-fetched from Stripe with this
  //                                      service's own key, so the forwarded body is untrusted.
  // handleEvent() skips event ids it has already processed. The Set lives in this
  // instance's memory: it dedupes the direct + forwarded paths and quick retries on a
  // warm instance, not across cold starts or parallel instances. The handling below
  // only logs, so a duplicate after a cold start is harmless.

  async retrieveEvent(eventId) {
    return this.stripe.events.retrieve(eventId);
  }

  async handleEvent(event) {
    if (!this.processedEvents) this.processedEvents = new Set();
    if (this.processedEvents.has(event.id)) {
      return { success: true, duplicate: true, event: event.type, data: {} };
    }
    const result = this.processEvent(event);
    this.processedEvents.add(event.id);
    if (this.processedEvents.size > 1000) {
      this.processedEvents.delete(this.processedEvents.values().next().value);
    }
    return result;
  }

  processEvent(event) {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log(`Payment completed for ${session.customer_email}`);
        return {
          success: true,
          event: 'payment_completed',
          data: {
            email: session.customer_email,
            metadata: session.metadata,
            amount: session.amount_total / 100
          }
        };
      }

      case 'payment_intent.payment_failed': {
        const failedPayment = event.data.object;
        console.log(`Payment failed: ${failedPayment.last_payment_error?.message}`);
        return {
          success: true,
          event: 'payment_failed',
          data: {
            error: failedPayment.last_payment_error?.message
          }
        };
      }

      default:
        return {
          success: true,
          event: event.type,
          data: {}
        };
    }
  }

  async handleWebhook(rawBody, signature) {
    try {
      const event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.webhookSecret
      );
      return await this.handleEvent(event);
    } catch (error) {
      console.error('Webhook error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
