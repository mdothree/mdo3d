# Resume Analyzer API

Backend API server for the Resume Analyzer platform.

## Architecture

- **Frontend**: Vercel (static site)
- **Backend API**: This server (Railway/Render/your choice)
- **Database**: Firebase Firestore
- **Auth**: Firebase Authentication
- **Email**: SMTP (Gmail/SendGrid)
- **Payments**: Stripe

## Features

- PDF and DOCX resume parsing
- ATS compatibility scoring
- Claude API integration for premium features
- Email delivery system
- Stripe payment processing
- Firebase integration for user data

## Setup

### 1. Install Dependencies

```bash
cd platforms/resume-analyzer-api
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Run Development Server

```bash
npm run dev
```

Server runs on `http://localhost:3001`

## API Endpoints

### POST /api/analyze
Upload resume for free tier analysis

**Request:**
- `Content-Type: multipart/form-data`
- `resume`: PDF or DOCX file

**Response:**
```json
{
  "success": true,
  "score": 75,
  "issues": [
    {
      "severity": "high",
      "title": "Missing Contact Info",
      "description": "..."
    }
  ],
  "breakdown": {
    "keywords": 70,
    "sections": 80,
    "formatting": 75,
    "length": 85,
    "contact": 60
  }
}
```

### POST /api/analyze/premium
Upload resume for premium analysis (requires payment)

**Request:**
- `Content-Type: multipart/form-data`
- `resume`: PDF or DOCX file
- `paymentId`: Stripe payment ID

**Response:**
```json
{
  "success": true,
  "score": 75,
  "basicAnalysis": {...},
  "premiumAnalysis": {
    "detailedAnalysis": {...},
    "keywords": {...},
    "improvements": {...},
    "rewrites": {...}
  }
}
```

### POST /api/email/report
Send free report via email

**Request:**
```json
{
  "email": "user@example.com",
  "analysis": {...}
}
```

### POST /api/payment/create-checkout
Create Stripe checkout session

**Request:**
```json
{
  "userId": "user123",
  "email": "user@example.com",
  "analysisId": "analysis123"
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/..."
}
```

### GET /api/health
Health check endpoint

## Deployment

### Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add environment variables
railway variables set ANTHROPIC_API_KEY=your_key
railway variables set STRIPE_SECRET_KEY=sk_test_...
# ... (add all variables from .env)

# Deploy
railway up
```

### Render

1. Create new Web Service on Render
2. Connect your Git repository
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add environment variables from `.env.example`
6. Deploy

### Fly.io

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Launch app
fly launch

# Set secrets
fly secrets set ANTHROPIC_API_KEY=your_key
fly secrets set STRIPE_SECRET_KEY=sk_test_...

# Deploy
fly deploy
```

## Environment Variables

See `.env.example` for complete list. Required variables:

- `ANTHROPIC_API_KEY` - For premium AI analysis
- `STRIPE_SECRET_KEY` - For payments
- `SMTP_USER` / `SMTP_PASS` - For emails
- `FRONTEND_URL` - Your Vercel frontend URL

## Project Structure

```
resume-analyzer-api/
├── src/
│   ├── server.js              # Main Express server
│   ├── parsers/
│   │   └── parser.js          # PDF/DOCX parsing
│   ├── analyzers/
│   │   ├── atsAnalyzer.js     # ATS scoring
│   │   └── claudeAnalyzer.js  # Claude API integration
│   └── services/
│       ├── emailService.js    # Email delivery
│       └── stripeService.js   # Payment processing
├── uploads/                   # Temporary file storage
├── package.json
└── .env                      # Environment variables
```

## License

MIT
