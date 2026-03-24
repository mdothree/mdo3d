# Deployment Guide

Complete setup guide for deploying Resume Analyzer with Vercel + separate API backend.

## Architecture

```
┌─────────────────────────────────┐
│   Vercel (Frontend)             │
│   - Static HTML/CSS/JS          │
│   - Firebase SDK (auth)         │
│   - Calls external API          │
└────────────┬────────────────────┘
             │ API calls
             ▼
┌─────────────────────────────────┐
│   API Server (Railway/Render)   │
│   - Express + Node.js           │
│   - PDF parsing                 │
│   - Claude API                  │
│   - Stripe + Email              │
└─────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│   Firebase                       │
│   - Authentication              │
│   - Firestore (database)        │
│   - User data + leads           │
└─────────────────────────────────┘
```

## Step 1: Deploy Frontend to Vercel

### 1.1 Install Vercel CLI
```bash
npm i -g vercel
```

### 1.2 Login to Vercel
```bash
vercel login
```

### 1.3 Deploy Frontend
```bash
cd platforms/resume-analyzer
vercel
```

Follow prompts:
- Project name: `resume-analyzer`
- Framework: `Other`
- Build command: (leave empty)
- Output directory: `public`

### 1.4 Set Environment Variables in Vercel

Go to your Vercel project settings and add:

```
VITE_API_URL=https://your-api-url.com
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=your_app_id
```

### 1.5 Deploy Production
```bash
vercel --prod
```

Your frontend is now live! Note the URL (e.g., `https://resume-analyzer.vercel.app`)

## Step 2: Set Up Firebase

### 2.1 Create Firebase Project

1. Go to https://console.firebase.google.com
2. Click "Add project"
3. Name it: `resume-analyzer`
4. Disable Google Analytics (optional)

### 2.2 Enable Authentication

1. In Firebase Console → Authentication
2. Click "Get started"
3. Enable "Email/Password" provider
4. Enable "Google" provider (optional)

### 2.3 Create Firestore Database

1. In Firebase Console → Firestore Database
2. Click "Create database"
3. Start in "production mode"
4. Choose location (us-central1)

### 2.4 Set Up Security Rules

Copy rules from `firestore.rules` to Firebase Console:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /analyses/{analysisId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    match /leads/{leadId} {
      allow create: if true;
    }
  }
}
```

### 2.5 Get Firebase Credentials

1. Project Settings → General
2. Scroll to "Your apps"
3. Click web icon (</>) to create web app
4. Copy the config values to your Vercel environment variables

## Step 3: Deploy API Backend

### Option A: Railway (Recommended)

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Navigate to API directory
cd platforms/resume-analyzer-api

# Initialize
railway init

# Set environment variables
railway variables set PORT=3001
railway variables set FRONTEND_URL=https://resume-analyzer.vercel.app
railway variables set ANTHROPIC_API_KEY=your_key
railway variables set SMTP_HOST=smtp.gmail.com
railway variables set SMTP_USER=your_email@gmail.com
railway variables set SMTP_PASS=your_app_password
railway variables set STRIPE_SECRET_KEY=sk_test_...
railway variables set STRIPE_WEBHOOK_SECRET=whsec_...
railway variables set PREMIUM_PRICE_USD=29
railway variables set WEBSITE_URL=https://resume-analyzer.vercel.app

# Deploy
railway up
```

Your API will be live at: `https://your-project.up.railway.app`

### Option B: Render

1. Go to https://render.com
2. New → Web Service
3. Connect your Git repository
4. Configure:
   - Name: `resume-analyzer-api`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Add all environment variables from `.env.example`
6. Click "Create Web Service"

Your API will be live at: `https://resume-analyzer-api.onrender.com`

## Step 4: Connect Everything

### 4.1 Update Frontend API URL

In Vercel project settings, update:
```
VITE_API_URL=https://your-actual-api-url.com
```

Redeploy frontend:
```bash
vercel --prod
```

### 4.2 Update API CORS

In your API's environment variables, set:
```
FRONTEND_URL=https://your-vercel-url.vercel.app
```

### 4.3 Test the Connection

1. Visit your Vercel frontend URL
2. Upload a resume
3. Check browser console for API calls
4. Verify email delivery works

## Step 5: Set Up Stripe

### 5.1 Create Stripe Account

1. Go to https://stripe.com
2. Create account
3. Get API keys from Dashboard → Developers → API keys

### 5.2 Add Stripe Keys

**To API Backend:**
```
STRIPE_SECRET_KEY=sk_test_...
```

**To Vercel Frontend:**
```
VITE_STRIPE_PUBLIC_KEY=pk_test_...
```

### 5.3 Set Up Webhook

1. Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-api-url.com/api/webhook/stripe`
3. Select events: `checkout.session.completed`, `payment_intent.succeeded`
4. Copy webhook secret to API env vars: `STRIPE_WEBHOOK_SECRET=whsec_...`

### 5.4 Create Product

1. Stripe Dashboard → Products
2. Create product: "Premium Resume Analysis"
3. Price: $29 (one-time payment)

## Step 6: Set Up Email (Gmail SMTP)

### 6.1 Enable 2-Factor Authentication

1. Go to Google Account settings
2. Security → 2-Step Verification
3. Turn it on

### 6.2 Create App Password

1. Security → 2-Step Verification → App passwords
2. Select app: Mail
3. Select device: Other (Custom name) → "Resume Analyzer"
4. Copy the 16-character password

### 6.3 Add to API Environment

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx  # App password
```

## Verification Checklist

- [ ] Frontend deployed to Vercel
- [ ] Firebase project created
- [ ] Firebase Auth enabled
- [ ] Firestore database created
- [ ] API deployed (Railway/Render)
- [ ] API environment variables set
- [ ] Frontend can call API
- [ ] File upload works
- [ ] Email delivery works
- [ ] Stripe checkout works
- [ ] Firebase auth works
- [ ] Leads saved to Firestore

## URLs to Save

```
Frontend: https://resume-analyzer.vercel.app
API: https://your-project.up.railway.app
Firebase Console: https://console.firebase.google.com
Stripe Dashboard: https://dashboard.stripe.com
```

## Costs

- **Vercel**: Free (Hobby plan)
- **Firebase**: Free tier (Pay-as-you-go after limits)
- **Railway**: $5/month (after free trial)
- **Stripe**: 2.9% + 30¢ per transaction
- **Total**: ~$5-10/month initially

## Next Steps

1. Add custom domain to Vercel
2. Set up Google Analytics
3. Configure SEO metadata
4. Add Sentry for error tracking
5. Set up monitoring/alerts
