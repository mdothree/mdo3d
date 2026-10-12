# Platforms

User-facing web applications providing value to end users. Every platform is paid from first use, with promo codes as the early-access lever, and social sharing for growth.

> **Pricing note (2026-10-12):** this page started as a March 2026 plan. The lab is paid-only: no free tier, flat whole-dollar prices (no `*.99`). Divination (Oracle, Tarot and the other readings) is decided at **$5 single / $10 deep** (DECISIONS, JARVIS #63). Other platforms take their live prices from each product's pricing config; prices below marked TBD are not set yet.

## Architecture

Each platform consists of:
- **Frontend**: Static HTML/CSS/JS (hosted on Vercel)
- **Backend API**: Node.js/Express (hosted on Railway)
- **Database**: Firebase Firestore (separate project per app)
- **Auth**: Firebase Authentication
- **Payments**: Stripe
- **Sharing**: Reusable social components from `/shared`

## Completed Platforms

### 1. Oracle Cards (`oracle-cards/`)

**Description**: Mystical oracle card readings with 3D rendering and AI-powered interpretations.

**Status**: ✅ Production Ready

**Features**:
- Complete 44-card oracle deck with diverse spiritual themes
- Three.js 3D card rendering with particle effects and animations
- Multiple spread types (Single, Three Card, Celtic Cross)
- Claude API integration for personalized AI readings
- Social sharing with custom image generation
- Paid per reading (promo codes for early access)

**Tech Stack**:
- Frontend: Vanilla JS, Three.js, Pure CSS
- Backend: Express.js, Claude 3.5 Sonnet API
- Database: Firebase Firestore
- Hosting: Vercel + Railway

**Revenue Model**:
- Single reading: $5
- Deep reading (Three Card, Celtic Cross): $10
- Target: $1,350/month

**Quick Start**:
```bash
cd platforms/oracle-cards
npm install
npm run dev  # http://localhost:8080
```

---

### 2. Tarot Cards (`tarot-cards/`)

**Description**: Professional tarot reading platform with complete 78-card traditional deck.

**Status**: ✅ Production Ready (Frontend Complete, API Pending)

**Features**:
- Complete 78-card tarot deck (22 Major Arcana + 56 Minor Arcana)
- All four suits: Wands (Fire), Cups (Water), Swords (Air), Pentacles (Earth)
- Upright and reversed meanings for every card
- Multiple spread types (Single, Three Card, Celtic Cross)
- Beautiful dark mystical UI with starfield animations
- Social sharing integration
- Paid per reading (promo codes for early access)

**Tech Stack**:
- Frontend: Vanilla JS, Pure CSS with dark theme
- Backend: Express.js, Claude API (to be implemented)
- Database: Firebase Firestore
- Hosting: Vercel + Railway

**Revenue Model**:
- Single reading: $5
- Deep reading (Three Card, Celtic Cross): $10
- Target: $3,240/month

**Card Breakdown**:
- Major Arcana (22): The Fool → The World
- Wands (14): Ace → King
- Cups (14): Ace → King
- Swords (14): Ace → King
- Pentacles (14): Ace → King

**Quick Start**:
```bash
cd platforms/tarot-cards
npm install
npm run dev  # http://localhost:8081
```

---

### 3. Resume Analyzer (`resume-analyzer/`)

**Description**: ATS resume compatibility checker with AI-powered optimization suggestions.

**Status**: ✅ Production Ready

**Features**:
- Drag & drop PDF/DOCX upload
- ATS scoring algorithm (5 factors: keywords, sections, formatting, length, contact)
- Real PDF/DOCX parsing (pdf-parse, mammoth)
- Claude API for premium AI suggestions
- Email delivery system (SMTP)
- Stripe payment integration
- Social sharing with custom score images
- Paid report, from first use (promo codes for early access)

**Tech Stack**:
- Frontend: Vanilla JS, Pure CSS
- Backend: Express.js, Claude API, Nodemailer
- Storage: Firebase Firestore
- Payments: Stripe
- Hosting: Vercel + Railway

**Revenue Model**:
- Paid report from first use: ATS score, issues, full rewrite, AI suggestions, before/after (price per the Rigor pricing config; the March plan said a one-time fee)
- Promo codes for early access; email capture happens at checkout
- Target: Variable based on conversion

**Quick Start**:
```bash
# Frontend
cd platforms/resume-analyzer
npm install
npm run dev

# Backend
cd platforms/resume-analyzer-api
npm install
cp .env.example .env
npm run dev  # http://localhost:3001
```

---

## In Progress

### 4. Runwae (`runwae/`)

**Description**: Fashion platform

**Status**: 🚧 In Progress

---

## Planned

### 5. Feng Shui Analyzer

**Description**: Room/address energy flow analysis with bagua map

**Input**: Address, room photos/layout  
**Output**: Energy score + recommendations  
**Revenue**: $9-$29 per report

### 6. Dream Interpreter

**Description**: AI-powered dream analysis with symbol database

**Input**: Dream description  
**Output**: Symbol meanings + interpretation  
**Revenue**: Paid per reading (price TBD, flat whole dollars; the $5 / $10 divination ladder applies if it ships as a divination site)

### 7. Past Life Insights

**Description**: Birth data generates past life narrative

**Input**: Birth date, name, time (optional)  
**Output**: Past life story + life themes  
**Revenue**: Paid per reading (price TBD, flat whole dollars; the $5 / $10 divination ladder applies if it ships as a divination site)

### 8. Numerology Calculator

**Description**: Life path, destiny, soul urge numbers with interpretations

**Input**: Name, birth date  
**Output**: Numerology chart + meanings  
**Revenue**: Paid per reading (divination ladder: $5 / $10)

### 9. Astrology Birth Chart

**Description**: Generate natal charts with planet positions and house interpretations

**Input**: Birth date, time, location  
**Output**: Full natal chart + interpretation  
**Revenue**: Paid per chart (price TBD, flat whole dollars)

### 10. Baby Name Oracle

**Description**: Name suggestions with meanings, numerology, zodiac compatibility

**Input**: Preferences, due date  
**Output**: Curated name list with meanings  
**Revenue**: Paid report (price TBD, flat whole dollars)

---

## Shared Infrastructure

All platforms leverage shared components from `/shared`:

### UI Components
- `SocialShare.js` - Universal sharing with Web Share API
- `ShareImageGenerator.js` - Dynamic 1200x630px social images
- Complete documentation in `/shared/ui-components/README.md`

### Authentication
- Firebase Auth integration
- User session management
- (Located in `/shared/auth/`)

### Payments
- Stripe integration helpers
- Payment processing utilities
- (Located in `/shared/payments/`)

### API Clients
- Claude AI client
- External API wrappers
- (Located in `/shared/api-clients/`)

---

## Development Guidelines

### File Structure
```
platform-name/
├── public/              # Frontend static files
│   ├── index.html
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── app.js       # Main application
│       ├── config/      # Configuration
│       ├── services/    # API services
│       └── ui/          # UI components
├── src/                 # Backend or data files
├── package.json
├── vercel.json          # Vercel config
└── README.md

platform-name-api/       # Separate API server
├── src/
│   ├── server.js
│   ├── routes/
│   ├── services/
│   └── utils/
├── .env.example
├── package.json
└── README.md
```

### Tech Stack Requirements
- **Frontend**: Vanilla JavaScript (ES6 modules), Pure CSS
- **Backend**: Node.js, Express.js
- **Database**: Firebase Firestore (separate project per platform)
- **AI**: Claude 3.5 Sonnet (Anthropic)
- **Payments**: Stripe
- **Hosting**: Vercel (frontend) + Railway/Render (backend)

### Revenue Model Pattern
All platforms are paid from first use (lab rule: no free tier, ever):
1. **Paid from first use**: every reading/report is a purchase, at flat whole-dollar prices
2. **Promo codes**: the early-access and launch lever
3. **Email Capture**: at checkout, for receipts and follow-up offers
4. **Social Sharing**: Viral growth mechanism

### Social Sharing Requirements
Every platform must include:
- Share button on results/readings
- Dynamic image generation for social posts
- Open Graph meta tags
- Twitter Card meta tags
- Analytics tracking

---

## Deployment

### Frontend (Vercel)
```bash
cd platforms/your-platform
vercel --prod
```

### Backend (Railway)
```bash
cd platforms/your-platform-api
railway init
railway up
```

### Environment Variables
Each platform requires:
- `ANTHROPIC_API_KEY` - Claude AI
- `FIREBASE_*` - Firebase credentials
- `STRIPE_*` - Stripe keys
- Platform-specific vars

---

## Marketing Strategy

### Common Channels
- **SEO**: Target spiritual/wellness keywords
- **Social Media**: Instagram, TikTok, Pinterest
- **Content**: Blog posts, YouTube tutorials
- **Influencers**: Spiritual/wellness creators
- **Communities**: Reddit (r/tarot, r/spirituality), Facebook groups

### Growth Tactics
1. **Social Sharing**: Built into every platform
2. **Promo codes**: Low barrier to a first purchase
3. **Content Marketing**: Card meanings, guides, tips
4. **Viral Loops**: Share to unlock features
5. **Email Marketing**: Lead nurturing sequences

---

## Success Metrics

### Per Platform
- Daily Active Users (DAU)
- Conversion Rate (visit → purchase, and promo-code redemption → repeat purchase)
- Average Revenue Per User (ARPU)
- Share Rate
- Email Capture Rate

### Portfolio Targets
- 10,000 daily visitors across all platforms
- 5% average conversion rate
- $10,000+ monthly recurring revenue
- 30% share rate (users sharing readings)

---

## Support

Each platform has detailed documentation in its respective README.md file. For questions or issues:

1. Check platform-specific README
2. Review shared components docs
3. Consult planning docs in `/planning`

---

## License

MIT - See individual platform READMEs for details
