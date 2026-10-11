import { mergeMetadata } from '../attribution.js';

/**
 * Pure builder for stripe.checkout.sessions.create() params.
 * Extracted from StripeService.createCheckoutSession so the exact params can be
 * unit-tested and reused for test-mode verification. Behavior is unchanged apart
 * from merging `attribution` (utm_*, attr_landing, attr_site) into the session
 * metadata and the PaymentIntent metadata.
 */
export function buildCheckoutSessionParams({
  serviceName,
  frontendUrl,
  productName,
  description,
  priceUSD,
  email,
  userId,
  metadata = {},
  attribution = {},
  successPath = '/success',
  cancelPath = '/'
}) {
  return {
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${serviceName} - ${productName}`,
            description: description
          },
          unit_amount: Math.round(priceUSD * 100)
        },
        quantity: 1
      }
    ],
    mode: 'payment',
    customer_email: email,
    success_url: `${frontendUrl}${successPath}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${frontendUrl}${cancelPath}`,
    metadata: mergeMetadata(
      {
        serviceName: serviceName,
        userId: userId || 'anonymous',
        ...metadata
      },
      attribution
    ),
    // Copy serviceName onto the PaymentIntent so payment_intent.* events can be
    // routed by the stripe-hub too (session metadata is not inherited by the PI).
    // Attribution is copied too so charges carry utm_* for the revenue join.
    payment_intent_data: {
      metadata: mergeMetadata({ serviceName: serviceName }, attribution)
    }
  };
}
