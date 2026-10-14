/**
 * POST /api/webhook/stripe — Stripe webhook route (mounted after express.raw()).
 * 400 when the signature is missing or invalid (never a 2xx), 500 when handling a
 * verified event fails (so Stripe retries), 200 only for a verified, handled event.
 * Internal error messages are not echoed.
 */
export function stripeWebhookRoute(stripeService) {
  return async (req, res) => {
    try {
      const result = await stripeService.handleWebhook(req.body, req.headers['stripe-signature']);
      return res.status(200).json(result);
    } catch (error) {
      if (error && error.statusCode === 400) {
        return res.status(400).json({ success: false, error: 'Invalid webhook signature' });
      }
      console.error('Webhook handler error:', error);
      return res.status(500).json({ success: false, error: 'Webhook handling failed' });
    }
  };
}
