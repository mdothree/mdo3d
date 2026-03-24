/**
 * Shopify Oracle App - Express Server
 */

import '@shopify/shopify-api/adapters/node';
import { shopifyApp } from '@shopify/shopify-app-express';
import { MemorySessionStorage } from '@shopify/shopify-app-session-storage-memory';
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

// Configure Shopify app
const shopify = shopifyApp({
  api: {
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET,
    scopes: process.env.SCOPES.split(','),
    hostName: process.env.HOST.replace(/https:\/\//, ''),
    apiVersion: '2024-01',
    isEmbeddedApp: true,
  },
  auth: {
    path: '/api/auth',
    callbackPath: '/api/auth/callback',
  },
  webhooks: {
    path: '/api/webhooks',
  },
  sessionStorage: new MemorySessionStorage(),
});

const app = express();

// Shopify auth middleware
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  async (req, res) => {
    res.redirect(`/?shop=${req.query.shop}&host=${req.query.host}`);
  }
);

// Webhook handler
app.post(shopify.config.webhooks.path, shopify.processWebhooks());

// API Routes
app.use(express.json());

// Oracle card endpoints
app.get('/api/cards/random', shopify.validateAuthenticatedSession(), async (req, res) => {
  try {
    const { oracleCards } = await import('../shared/cardDatabase.js');
    const randomCard = oracleCards[Math.floor(Math.random() * oracleCards.length)];
    res.json({ card: randomCard });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Product recommendation endpoint
app.post('/api/recommend', shopify.validateAuthenticatedSession(), async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    const { cardTheme } = req.body;
    
    // Query Shopify products matching card theme
    const client = new shopify.api.clients.Graphql({ session });
    
    const data = await client.query({
      data: `{
        products(first: 10, query: "tag:${cardTheme}") {
          edges {
            node {
              id
              title
              handle
              featuredImage {
                url
              }
              priceRangeV2 {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }`,
    });
    
    res.json({ products: data.body.data.products.edges });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// App settings endpoint
app.get('/api/settings', shopify.validateAuthenticatedSession(), async (req, res) => {
  try {
    // TODO: Fetch from database
    res.json({
      oracleEnabled: true,
      checkoutOracleEnabled: false,
      discountCodeEnabled: false
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/settings', shopify.validateAuthenticatedSession(), async (req, res) => {
  try {
    // TODO: Save to database
    res.json({ success: true, settings: req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Billing endpoints
app.post('/api/billing/subscribe', shopify.validateAuthenticatedSession(), async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    const { plan } = req.body; // 'starter', 'pro', 'premium'
    
    const prices = {
      starter: 19.99,
      pro: 29.99,
      premium: 79.99
    };
    
    const client = new shopify.api.clients.Graphql({ session });
    
    const charge = await client.query({
      data: `mutation {
        appSubscriptionCreate(
          name: "Oracle Insights ${plan.charAt(0).toUpperCase() + plan.slice(1)}"
          returnUrl: "${process.env.HOST}/api/billing/confirm"
          test: ${process.env.NODE_ENV !== 'production'}
          lineItems: [{
            plan: {
              appRecurringPricingDetails: {
                price: { amount: ${prices[plan]}, currencyCode: USD }
                interval: EVERY_30_DAYS
              }
            }
          }]
        ) {
          appSubscription {
            id
          }
          confirmationUrl
          userErrors {
            field
            message
          }
        }
      }`,
    });
    
    const { confirmationUrl } = charge.body.data.appSubscriptionCreate;
    res.json({ confirmationUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🔮 Oracle Insights server running on port ${PORT}`);
});
