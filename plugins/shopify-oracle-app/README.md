# 🔮 Oracle Insights - Shopify App

Transform your Shopify store with mystical product recommendations, oracle-powered checkout experiences, and spiritual e-commerce features.

## Overview

Oracle Insights is a Shopify app that brings divination and spiritual guidance to e-commerce. Perfect for stores selling crystals, spiritual products, wellness items, or any shop wanting to add a unique, personalized shopping experience.

## Features

### Core Features (All Plans)
- **Oracle Product Finder** - Customers draw a card to get personalized product recommendations
- **Spiritual Product Tags** - Auto-tag products with oracle card themes and elements
- **Analytics Dashboard** - Track oracle draws, conversions, and customer engagement

### Pro Features ($29.99/month)
- **Checkout Oracle Card** - Customers draw a card at checkout for spiritual guidance
- **Lucky Discount Codes** - Generate personalized discount codes based on numerology
- **Birth Chart Product Match** - Match products to customer birth data
- **Cosmic Timing** - Suggest optimal purchase times based on moon phases
- **Email Integration** - Send oracle guidance with order confirmations

### Premium Features ($79.99/month)
- **Custom Oracle Deck** - Upload your own card designs and meanings
- **Advanced Analytics** - Conversion tracking, A/B testing, revenue attribution
- **White Label** - Remove Oracle Insights branding
- **Priority Support** - 24-hour response time
- **API Access** - Integrate with other tools

## Revenue Model

### Subscription Tiers

| Tier | Price | Target Customers | Features |
|------|-------|------------------|----------|
| **Starter** | $19.99/mo | New/small stores (<100 orders/mo) | Basic oracle finder, 1 card deck |
| **Pro** | $29.99/mo | Growing stores (100-1000 orders/mo) | All features, unlimited draws |
| **Premium** | $79.99/mo | Established stores (1000+ orders/mo) | Custom deck, white-label, API |
| **Enterprise** | $199.99/mo | Large stores/brands | Dedicated support, custom development |

### Revenue Projections

**Conservative** (Based on Shopify App Store averages):

| Month | Installs | Paying (10%) | Avg Plan | MRR | Notes |
|-------|----------|--------------|----------|-----|-------|
| 1 | 50 | 5 | $29.99 | $150 | Soft launch |
| 3 | 200 | 20 | $29.99 | $600 | Featured on App Store |
| 6 | 500 | 50 | $35 | $1,750 | Mix of tiers |
| 12 | 1,200 | 120 | $40 | $4,800 | Established |
| 24 | 3,000 | 300 | $45 | $13,500 | Top-rated app |

**Optimistic** (Top-performing apps):

| Metric | 6 Months | 12 Months | 24 Months |
|--------|----------|-----------|-----------|
| Active Installs | 2,000 | 5,000 | 15,000 |
| Paying Customers | 200 | 500 | 1,500 |
| Average Plan | $40 | $45 | $50 |
| **MRR** | **$8,000** | **$22,500** | **$75,000** |
| **ARR** | **$96,000** | **$270,000** | **$900,000** |

### Why This Works

1. **Unique Value Prop** - No competitors in spiritual/divination niche
2. **High AOV Stores** - Spiritual products have high margins
3. **Sticky Product** - Becomes part of brand experience
4. **Viral Potential** - Customers share oracle results
5. **Upsell Path** - Clear progression through tiers

## Tech Stack

### Backend
- **Node.js + Express** - Server framework
- **@shopify/shopify-api** - Official Shopify SDK
- **Prisma** - Database ORM
- **PostgreSQL** - Database
- **Shopify App Bridge** - Embedded app experience

### Frontend
- **React** - UI framework
- **Vite** - Build tool
- **Polaris** - Shopify's UI components
- **GraphQL** - Shopify Admin API

### Infrastructure
- **Railway/Render** - Hosting (free tier to start)
- **Ngrok** - Local development tunneling
- **GitHub Actions** - CI/CD

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Shopify Partner account
- Ngrok account (for local dev)

### 1. Create Shopify Partner Account

1. Go to [Shopify Partners](https://partners.shopify.com/)
2. Sign up (free)
3. Create new app
4. Get API key and secret

### 2. Create Development Store

1. In Partners dashboard → Stores
2. Create development store
3. Choose "Create a store to test and build"
4. Select store type (e.g., "Health & Beauty")

### 3. Set Up Local Environment

```bash
cd plugins/shopify-oracle-app

# Install dependencies
npm run setup

# Set up environment
cp .env.example .env
# Edit .env with your Shopify credentials

# Start database
# (Install PostgreSQL first if needed)
createdb shopify_oracle

# Run migrations
npx prisma migrate dev

# Start ngrok tunnel
npm run tunnel
# Copy HTTPS URL (e.g., https://abc123.ngrok.io)

# Update .env with ngrok URL
HOST=https://abc123.ngrok.io

# Start development server
npm run dev
```

### 4. Install App in Dev Store

1. Go to your ngrok URL
2. Shopify will redirect for OAuth
3. Approve permissions
4. App installed!

## Project Structure

```
shopify-oracle-app/
├── server/
│   ├── index.js              # Express server
│   ├── shopify.js            # Shopify API config
│   ├── webhooks/             # Webhook handlers
│   ├── routes/
│   │   ├── api/              # API endpoints
│   │   └── auth.js           # OAuth flow
│   └── services/
│       ├── oracle.js         # Oracle card logic
│       ├── products.js       # Product matching
│       └── analytics.js      # Tracking
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx # Main dashboard
│   │   │   ├── Settings.jsx  # App settings
│   │   │   └── Analytics.jsx # Analytics page
│   │   ├── components/
│   │   │   ├── OracleCard.jsx
│   │   │   └── ProductMatcher.jsx
│   │   └── App.jsx
│   └── vite.config.js
├── prisma/
│   └── schema.prisma         # Database schema
├── package.json
└── README.md
```

## Core Functionality

### 1. Oracle Product Finder

**Customer Experience:**
1. Customer clicks "Find My Perfect Product"
2. Draws an oracle card
3. Gets personalized product recommendations
4. Can add to cart directly

**Implementation:**
```javascript
// Match oracle card themes to product tags
const card = drawRandomCard();
const products = await shopify.product.list({
  tags: card.theme, // e.g., "abundance", "love", "strength"
  status: 'active'
});
```

### 2. Checkout Oracle (Pro)

**Customer Experience:**
1. At checkout, customer can draw optional card
2. Receives spiritual guidance about their purchase
3. Can share result on social media

**Implementation:**
```javascript
// Add script tag to checkout
await shopify.scriptTag.create({
  event: 'onload',
  src: `${APP_URL}/checkout-oracle.js`
});
```

### 3. Lucky Discount Codes (Pro)

**Customer Experience:**
1. Customer enters name and birth date
2. App generates personalized discount code
3. Code based on numerology (e.g., "SARAH777")

**Implementation:**
```javascript
const lifePathNumber = calculateLifePath(birthDate);
const code = `${name.toUpperCase()}${lifePathNumber}${lifePathNumber}${lifePathNumber}`;
await shopify.discountCode.create({
  code,
  value: '10',
  value_type: 'percentage'
});
```

## Shopify App Store Listing

### App Title
"Oracle Insights - Spiritual Product Recommendations"

### Subtitle
"Add mystical product discovery & oracle-powered shopping experiences"

### Description

```
Transform your spiritual store with Oracle Insights!

Perfect for shops selling:
✨ Crystals & gemstones
🔮 Tarot & oracle decks
🌙 Spiritual jewelry
💎 Wellness products
🕯️ Metaphysical supplies

FEATURES:

🎴 Oracle Product Finder
Let customers draw oracle cards to discover products perfectly aligned with their energy. Increase engagement and average order value.

🌟 Spiritual Product Tags
Automatically tag products with oracle themes, elements, and energies for better organization and discovery.

📊 Analytics Dashboard
Track how oracle features impact conversions, see which cards drive sales, and optimize your spiritual store.

PRO FEATURES ($29.99/mo):

💫 Checkout Oracle Cards
Add magical moments at checkout with personalized oracle guidance

🎯 Lucky Discount Codes  
Generate numerology-based discount codes for each customer

🌙 Cosmic Timing
Suggest optimal purchase times based on moon phases

✉️ Email Integration
Send oracle guidance with order confirmations

WHY ORACLE INSIGHTS?

• Unique shopping experience
• Increase time on site
• Boost average order value
• Build emotional connection
• Viral social sharing
• Stand out from competitors

PERFECT FOR:

Spiritual shops, wellness brands, metaphysical stores, crystal shops, tarot retailers, holistic health stores, and any brand wanting to add mystical personalization.

Try it free for 14 days!
No credit card required.
```

### Screenshots Needed

1. Oracle card draw interface
2. Product recommendations screen
3. Analytics dashboard
4. Settings page
5. Checkout oracle experience
6. Mobile responsive view

## Marketing Strategy

### 1. Shopify App Store

**Optimization:**
- Target keywords: "spiritual", "oracle", "tarot", "crystals", "wellness"
- Get 20+ five-star reviews quickly
- Respond to all reviews
- Regular updates (triggers re-ranking)

**Featured Spots:**
- Apply for "Staff Picks"
- Target seasonal collections (e.g., "New Age Apps")
- Submit for blog features

### 2. Content Marketing

**Blog Posts:**
- "How Oracle Cards Can Increase Your Shopify Sales"
- "The Psychology of Spiritual E-Commerce"
- "Case Study: 40% AOV Increase with Oracle Insights"

**YouTube:**
- Tutorial videos
- Store setup walkthroughs
- Success stories

### 3. Shopify Community

- Post in Shopify forums
- Answer questions about spiritual stores
- Share in Facebook groups
- Partner program with theme developers

### 4. Direct Outreach

**Target Customers:**
- Search Shopify for stores with "crystal", "tarot", "spiritual" in name
- Cold email with personalized demo
- Offer free setup assistance
- 30-day free trial

### 5. Influencer Partnerships

- Partner with spiritual shop owners
- Offer affiliate commission (20%)
- Provide free Premium tier
- Co-create content

## Pricing & Billing

### Setup in Shopify

```javascript
// server/billing.js
const PLANS = {
  starter: {
    name: 'Starter',
    price: 19.99,
    trialDays: 14,
    features: ['basic_oracle', '1_deck', 'analytics']
  },
  pro: {
    name: 'Pro',
    price: 29.99,
    trialDays: 14,
    features: ['all_features', 'unlimited_draws', 'checkout_oracle']
  },
  premium: {
    name: 'Premium',
    price: 79.99,
    trialDays: 14,
    features: ['custom_deck', 'white_label', 'api_access', 'priority_support']
  }
};
```

### Billing via Shopify

- Shopify handles all payments
- You get 80% (they take 20%)
- Automatic failed payment recovery
- Built-in subscription management

## Development Roadmap

### Phase 1: MVP (Weeks 1-4)
- [x] Project setup
- [ ] OAuth flow
- [ ] Basic oracle card draw
- [ ] Product recommendation engine
- [ ] Settings page
- [ ] Analytics tracking

### Phase 2: Pro Features (Weeks 5-8)
- [ ] Checkout oracle integration
- [ ] Lucky discount codes
- [ ] Email integration
- [ ] Cosmic timing feature

### Phase 3: Premium (Weeks 9-12)
- [ ] Custom deck upload
- [ ] White-label options
- [ ] API endpoints
- [ ] Advanced analytics

### Phase 4: Scale (Month 4+)
- [ ] A/B testing
- [ ] Multi-language support
- [ ] Additional divination methods
- [ ] Integration marketplace

## Monetization Timeline

### Month 1-3: Launch & Iterate
- **Goal**: 50 installs, 5 paying
- **Revenue**: $150-300/month
- **Focus**: Product-market fit, reviews

### Month 4-6: Growth
- **Goal**: 500 installs, 50 paying
- **Revenue**: $1,500-2,500/month
- **Focus**: Marketing, features, support

### Month 7-12: Scale
- **Goal**: 1,200 installs, 120 paying
- **Revenue**: $4,000-6,000/month
- **Focus**: Automation, team, enterprise

### Year 2: Mature
- **Goal**: 3,000+ installs, 300+ paying
- **Revenue**: $12,000-20,000/month
- **Focus**: Platform, partnerships, exit options

## Competition Analysis

### Current Landscape
- **No direct competitors** in oracle/divination niche
- **General personalization apps** (e.g., LimeSpot, Nosto)
  - Price: $20-200/month
  - Focus: AI recommendations, not spiritual
- **Quiz apps** (e.g., RevenueHunt, Octane AI)
  - Price: $20-100/month
  - Could add oracle feature

### Your Advantages
1. **Niche focus** - Own the spiritual market
2. **Unique UX** - Oracle cards are engaging
3. **Viral potential** - Customers share results
4. **Emotion** - Connects on deeper level
5. **Premium pricing** - Justified by uniqueness

## Legal & Compliance

- **Privacy Policy** - Required by Shopify
- **GDPR** - Handle EU customer data properly
- **Disclaimer** - "For entertainment purposes"
- **Terms of Service** - Standard SaaS terms
- **Shopify TOS** - Follow all Shopify rules

## Support & Resources

- **Shopify Dev Docs**: https://shopify.dev/
- **App Bridge**: https://shopify.dev/docs/api/app-bridge
- **Polaris**: https://polaris.shopify.com/
- **Partner Program**: https://partners.shopify.com/

## Next Steps

1. **This Week**: Set up Shopify Partner account
2. **Week 2**: Build MVP features
3. **Week 3**: Test in dev store
4. **Week 4**: Submit to App Store
5. **Week 5**: Soft launch to beta stores
6. **Week 6**: Official launch + marketing

---

**Estimated Time to Launch**: 4-6 weeks  
**Estimated Revenue Year 1**: $50,000-150,000  
**Scale Potential**: $200,000-1M+ ARR

This is your **highest revenue-potential plugin**. Let's build it! 🚀✨
