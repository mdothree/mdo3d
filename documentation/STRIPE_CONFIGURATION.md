# Stripe Configuration Guide

Complete guide for setting up Stripe payments across all Lamar platforms.

## Overview

All Lamar platforms use a **shared Stripe service** (`/shared/services/stripeService.js`) that automatically switches between test and live keys based on the `NODE_ENV` environment variable.

### Supported Platforms
- **Oracle Cards** (BlackLabb Oracle) - $2.99-$9.99
- **Tarot Cards** (JarvisBee Tarot) - $2.99-$9.99  
- **Dream Interpreter** (BlackLabb Dreams) - $4.99
- **Resume Analyzer** (RonnaScanner ATS) - $29.00

---

## Quick Start

### 1. Get Your Stripe Keys

#### Test Keys (for development)
1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy your **Publishable key** (starts with `pk_test_`)
3. Copy your **Secret key** (starts with `sk_test_`)

#### Live Keys (for production)
1. Go to https://dashboard.stripe.com/apikeys
2. Copy your **Publishable key** (starts with `pk_live_`)
3. Copy your **Secret key** (starts with `sk_live_`)

⚠️ **NEVER commit live keys to git!**

---

## Environment Variable Setup

### Backend API (.env file)

Each platform's backend API needs these environment variables:

```bash
# Node Environment (determines which Stripe keys to use)
NODE_ENV=development  # or 'production'

# Stripe Test Keys (for development/testing)
STRIPE_TEST_SECRET_KEY=sk_test_your_test_secret_key_here
STRIPE_TEST_WEBHOOK_SECRET=whsec_your_test_webhook_secret_here

# Stripe Live Keys (for production)
# ⚠️ NEVER commit these - use environment variables or secrets manager
STRIPE_LIVE_SECRET_KEY=sk_live_your_live_secret_key_here
STRIPE_LIVE_WEBHOOK_SECRET=whsec_your_live_webhook_secret_here

# Website URL (for success/cancel redirects)
WEBSITE_URL=https://yourdomain.com
```

### Reference: Huntington/Blacklab Keys

According to `~/ahl/blacklab/backend/.env`, we have:

```bash
STRIPE_SECRET_KEY=<production-secret>
STRIPE_WEBHOOK_SECRET=<production-secret>
```

These should be renamed to follow our new naming convention:
- `STRIPE_SECRET_KEY` → `STRIPE_LIVE_SECRET_KEY`
- Add `STRIPE_TEST_SECRET_KEY` for development

---

## Platform-Specific Configuration

### Oracle Cards API

**Location**: `/platforms/oracle-cards-api/.env`

```bash
NODE_ENV=development
PORT=3002
FRONTEND_URL=http://localhost:8080

# Anthropic API
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Stripe Test Keys
STRIPE_TEST_SECRET_KEY=sk_test_xxxxx
STRIPE_TEST_WEBHOOK_SECRET=whsec_xxxxx

# Stripe Live Keys
STRIPE_LIVE_SECRET_KEY=sk_live_xxxxx
STRIPE_LIVE_WEBHOOK_SECRET=whsec_xxxxx

# Pricing (USD)
SINGLE_PREMIUM_PRICE=2.99
THREE_CARD_PRICE=4.99
CELTIC_CROSS_PRICE=9.99

WEBSITE_URL=https://blacklabb.com
```

**Pricing Tiers**:
- Single Premium: $2.99
- Three Card Spread: $4.99
- Celtic Cross: $9.99

---

### Tarot Cards API

**Location**: `/platforms/tarot-cards-api/.env` (to be created)

```bash
NODE_ENV=development
PORT=3003
FRONTEND_URL=http://localhost:8081

# Anthropic API
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Stripe Test Keys
STRIPE_TEST_SECRET_KEY=sk_test_xxxxx
STRIPE_TEST_WEBHOOK_SECRET=whsec_xxxxx

# Stripe Live Keys
STRIPE_LIVE_SECRET_KEY=sk_live_xxxxx
STRIPE_LIVE_WEBHOOK_SECRET=whsec_xxxxx

# Pricing (USD)
SINGLE_CARD_PRICE=2.99
THREE_CARD_PRICE=4.99
CELTIC_CROSS_PRICE=9.99

WEBSITE_URL=https://jarvisbee.com
```

**Pricing Tiers**:
- Single Card: $2.99
- Three Card Spread: $4.99
- Celtic Cross: $9.99

---

### Dream Interpreter API

**Location**: `/platforms/dream-interpreter-api/.env` (to be created)

```bash
NODE_ENV=development
PORT=3004
FRONTEND_URL=http://localhost:8083

# Anthropic API
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Stripe Test Keys
STRIPE_TEST_SECRET_KEY=sk_test_xxxxx
STRIPE_TEST_WEBHOOK_SECRET=whsec_xxxxx

# Stripe Live Keys
STRIPE_LIVE_SECRET_KEY=sk_live_xxxxx
STRIPE_LIVE_WEBHOOK_SECRET=whsec_xxxxx

# Pricing (USD)
DREAM_ANALYSIS_PRICE=4.99

WEBSITE_URL=https://blacklabb.com
```

**Pricing Tiers**:
- Premium Dream Analysis: $4.99

---

### Resume Analyzer API

**Location**: `/platforms/resume-analyzer-api/.env`

```bash
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:8082

# Anthropic API
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Stripe Test Keys
STRIPE_TEST_SECRET_KEY=sk_test_xxxxx
STRIPE_TEST_WEBHOOK_SECRET=whsec_xxxxx

# Stripe Live Keys
STRIPE_LIVE_SECRET_KEY=sk_live_xxxxx
STRIPE_LIVE_WEBHOOK_SECRET=whsec_xxxxx

# Pricing (USD)
PREMIUM_PRICE_USD=29

WEBSITE_URL=https://ronnascanner.com
```

**Pricing Tiers**:
- Premium Analysis: $29.00

---

## Webhook Configuration

### Development (Testing)

1. Install Stripe CLI:
   ```bash
   brew install stripe/stripe-cli/stripe
   ```

2. Login to Stripe:
   ```bash
   stripe login
   ```

3. Forward webhooks to local server:
   ```bash
   # Oracle Cards API (port 3002)
   stripe listen --forward-to localhost:3002/api/webhook/stripe
   
   # Tarot Cards API (port 3003)
   stripe listen --forward-to localhost:3003/api/webhook/stripe
   
   # Dream Interpreter API (port 3004)
   stripe listen --forward-to localhost:3004/api/webhook/stripe
   
   # Resume Analyzer API (port 3001)
   stripe listen --forward-to localhost:3001/api/webhook/stripe
   ```

4. Copy the webhook signing secret (starts with `whsec_`) to your `.env` file as `STRIPE_TEST_WEBHOOK_SECRET`

---

### Production

1. Go to https://dashboard.stripe.com/webhooks
2. Click **Add endpoint**
3. Enter your webhook URL:
   - Oracle Cards: `https://api.blacklabb.com/api/webhook/stripe`
   - Tarot Cards: `https://api.jarvisbee.com/api/webhook/stripe`
   - Dreams: `https://api.blacklabb.com/dreams/api/webhook/stripe`
   - Resume: `https://api.ronnascanner.com/api/webhook/stripe`

4. Select events to listen for:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`

5. Copy the webhook signing secret to your production environment as `STRIPE_LIVE_WEBHOOK_SECRET`

---

## Testing Payment Flow

### Test Mode

Stripe provides test card numbers:

**Successful Payment**:
- Card: `4242 4242 4242 4242`
- Expiry: Any future date (e.g., `12/34`)
- CVC: Any 3 digits (e.g., `123`)
- ZIP: Any 5 digits (e.g., `12345`)

**Failed Payment**:
- Card: `4000 0000 0000 0002`
- Expiry: Any future date
- CVC: Any 3 digits

**Requires Authentication (3D Secure)**:
- Card: `4000 0025 0000 3155`
- Expiry: Any future date
- CVC: Any 3 digits

More test cards: https://stripe.com/docs/testing

---

## Frontend Integration

### Success Page

Create a success page at `/success` that:

1. Retrieves the `session_id` from URL params
2. Calls the backend verification endpoint
3. Unlocks premium features
4. Shows confirmation message

```javascript
// Example success page logic
const urlParams = new URLSearchParams(window.location.search);
const sessionId = urlParams.get('session_id');

if (sessionId) {
  const result = await apiClient.verifyPayment(sessionId);
  if (result.paid) {
    // Unlock premium features
    showPremiumContent();
  }
}
```

### Cancel Page

Create a cancel page at `/cancel` that:
- Shows friendly message
- Offers to return to reading
- Provides support contact

---

## Pricing Summary

| Platform | Product | Price |
|----------|---------|-------|
| Oracle Cards | Single Premium | $2.99 |
| Oracle Cards | Three Card Spread | $4.99 |
| Oracle Cards | Celtic Cross | $9.99 |
| Tarot Cards | Single Card | $2.99 |
| Tarot Cards | Three Card Spread | $4.99 |
| Tarot Cards | Celtic Cross | $9.99 |
| Dream Interpreter | Premium Analysis | $4.99 |
| Resume Analyzer | Premium Report | $29.00 |

**Total Revenue Potential**: $10,290/month (based on projected conversions)

---

## Security Best Practices

### ✅ DO:
- Use test keys in development (`NODE_ENV=development`)
- Use live keys in production (`NODE_ENV=production`)
- Store live keys in environment variables or secrets manager
- Verify webhook signatures
- Use HTTPS in production
- Log all payment events
- Handle errors gracefully

### ❌ DON'T:
- Commit live keys to git
- Use live keys in development
- Skip webhook signature verification
- Expose secret keys in frontend code
- Store sensitive data in localStorage
- Ignore failed payment webhooks

---

## Troubleshooting

### "Stripe secret key not configured"
- Check that `STRIPE_TEST_SECRET_KEY` is set in your `.env` file
- Verify `NODE_ENV` is set correctly
- Restart your server after changing `.env`

### "Invalid API key provided"
- Confirm you're using the correct key for your environment (test vs live)
- Check for extra spaces or quotes in your `.env` file
- Regenerate keys if necessary

### Webhooks not received
- Confirm webhook endpoint is publicly accessible (in production)
- Use Stripe CLI for local testing
- Check webhook signing secret matches
- Verify events are selected in Stripe Dashboard

### Payment succeeds but features don't unlock
- Check success page is calling `verifyPayment()` correctly
- Verify `session_id` is in URL params
- Check backend logs for verification errors
- Confirm metadata is being passed correctly

---

## Support

### Stripe Resources
- Dashboard: https://dashboard.stripe.com
- Documentation: https://stripe.com/docs
- Testing: https://stripe.com/docs/testing
- Webhooks: https://stripe.com/docs/webhooks

### Lamar Platform Support
- Architecture Docs: `/platforms/ARCHITECTURE.md`
- Shared Service: `/shared/services/stripeService.js`
- Domain Mapping: `/DOMAIN_MAPPING.md`

---

## Deployment Checklist

Before deploying to production:

- [ ] Update `NODE_ENV=production` in production environment
- [ ] Set `STRIPE_LIVE_SECRET_KEY` in production secrets
- [ ] Set `STRIPE_LIVE_WEBHOOK_SECRET` in production secrets
- [ ] Configure webhook endpoint in Stripe Dashboard
- [ ] Update `WEBSITE_URL` to production domain
- [ ] Test payment flow end-to-end in test mode
- [ ] Verify success/cancel redirects work
- [ ] Enable webhook logging/monitoring
- [ ] Set up payment failure alerts
- [ ] Document refund policy
- [ ] Configure tax settings if required

---

**Last Updated**: February 28, 2026  
**Maintainer**: Lamar Development Team  
**Version**: 1.0
