// Membership checkout: Stripe TEST MODE ONLY.
// - Reads the key by name from STRIPE_TEST_SECRET_KEY. STRIPE_SECRET_KEY (a live key name) is never read here.
// - No key configured -> 503, checkout disabled (the page says "opens soon").
// - Key that does not start with sk_test_ -> 403, refused. A live key can never create a session here.
// - Going live needs the Principal's payments GO and a separate change; this file stays test-only.
const PLANS = {
  monthly: { amount: 600, interval: 'month', name: 'Frontier Ledger membership (monthly, early access)' },
  yearly: { amount: 6000, interval: 'year', name: 'Frontier Ledger membership (yearly, early access)' },
};

function testKey() {
  const key = process.env.STRIPE_TEST_SECRET_KEY || '';
  if (!key) return { ok: false, code: 503, error: 'Membership checkout is not open yet (early access, coming soon).' };
  if (!key.startsWith('sk_test_')) return { ok: false, code: 403, error: 'Refused: checkout here runs only with a Stripe test-mode key.' };
  return { ok: true, key };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const k = testKey();
  if (req.method === 'GET') return res.status(200).json({ enabled: k.ok, mode: 'test-only' });
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST only' });
  if (!k.ok) return res.status(k.code).json({ ok: false, disabled: true, error: k.error });

  let body = req.body || {};
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const plan = PLANS[body.plan] ? body.plan : 'monthly';
  const p = PLANS[plan];
  const origin = `https://${req.headers['x-forwarded-host'] || req.headers.host}`;
  try {
    const stripe = require('stripe')(k.key);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price_data: { currency: 'usd', unit_amount: p.amount, recurring: { interval: p.interval },
        product_data: { name: p.name } }, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${origin}/watchlist?checkout=success`,
      cancel_url: `${origin}/watchlist?checkout=cancelled`,
      metadata: { product: 'frontier-ledger', sector: 'quantum', plan },
    });
    if (session.livemode) return res.status(403).json({ ok: false, error: 'Refused: live-mode session.' });
    return res.status(200).json({ ok: true, url: session.url, test_mode: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Checkout could not start (test mode).' });
  }
};
