# Lamar Project Structure

Visual guide to the complete project organization.

```
lamar/
│
├── 📋 README.md                    # Main project overview
├── 📊 PROJECT_STATUS.md            # Detailed status and metrics
├── 🗂️  STRUCTURE.md                 # This file
├── ⚙️  AUTOMATION.md                # Automation guidelines
│
├── 📁 platforms/                   # User-facing web applications
│   ├── README.md                   # Platform architecture docs
│   │
│   ├── ✅ oracle-cards/            # Oracle card readings (COMPLETE)
│   │   ├── public/                 # Frontend (Vanilla JS)
│   │   │   ├── index.html
│   │   │   ├── css/styles.css
│   │   │   └── js/
│   │   │       ├── app.js
│   │   │       ├── components/CardRenderer3D.js
│   │   │       ├── config/
│   │   │       ├── services/
│   │   │       └── ui/
│   │   ├── src/
│   │   │   └── cardDatabase.js     # 44 oracle cards
│   │   ├── package.json
│   │   ├── vercel.json
│   │   └── README.md
│   │
│   ├── ✅ oracle-cards-api/        # Oracle API backend (COMPLETE)
│   │   ├── src/
│   │   │   ├── server.js
│   │   │   ├── routes/
│   │   │   ├── services/claudeService.js
│   │   │   └── utils/
│   │   ├── .env.example
│   │   ├── package.json
│   │   └── README.md
│   │
│   ├── ✅ tarot-cards/             # Tarot readings (95% COMPLETE)
│   │   ├── public/                 # Frontend (Vanilla JS)
│   │   │   ├── index.html
│   │   │   ├── css/styles.css
│   │   │   └── js/
│   │   │       ├── app.js
│   │   │       ├── config/
│   │   │       ├── services/
│   │   │       └── ui/
│   │   ├── src/
│   │   │   └── tarotDatabase.js    # 78 tarot cards (22 Major + 56 Minor)
│   │   ├── package.json
│   │   ├── vercel.json
│   │   └── README.md
│   │
│   ├── 📋 tarot-cards-api/         # Tarot API backend (TODO)
│   │   ├── src/
│   │   ├── config/
│   │   └── README.md
│   │
│   ├── ✅ resume-analyzer/         # ATS resume checker (COMPLETE)
│   │   ├── public/                 # Frontend
│   │   │   ├── index.html
│   │   │   ├── css/styles.css
│   │   │   └── js/
│   │   │       ├── app.js
│   │   │       ├── config/
│   │   │       ├── services/
│   │   │       └── ui/
│   │   ├── package.json
│   │   ├── vercel.json
│   │   └── README.md
│   │
│   ├── ✅ resume-analyzer-api/     # Resume API backend (COMPLETE)
│   │   ├── src/
│   │   │   ├── server.js
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   │   ├── claudeService.js
│   │   │   │   ├── emailService.js
│   │   │   │   └── parserService.js
│   │   │   └── utils/
│   │   ├── .env.example
│   │   ├── package.json
│   │   └── README.md
│   │
│   └── 🚧 runwae/                  # Fashion platform (STALLED)
│       └── [existing codebase]
│
├── 📁 utilities/                   # Programmatic automation scripts
│   └── ✅ crypto-arbitrage/        # Crypto trading bot (COMPLETE)
│       ├── src/
│       │   ├── index.js
│       │   ├── exchanges/
│       │   │   ├── CoinbaseExchange.js
│       │   │   └── KrakenExchange.js
│       │   ├── strategies/
│       │   │   └── ArbitrageStrategy.js
│       │   └── utils/
│       │       ├── CoinbaseAuth.js
│       │       └── logger.js
│       ├── config/
│       ├── logs/
│       ├── .env.example
│       ├── package.json
│       └── README.md
│
├── 📁 agents/                      # AI decision-making bots (PLANNED)
│   └── (empty - future autonomous agents)
│
├── 📁 shared/                      # Reusable code across projects
│   ├── ui-components/              # ✅ COMPLETE
│   │   ├── SocialShare.js          # Universal sharing component
│   │   ├── ShareImageGenerator.js  # Dynamic OG image generation
│   │   └── README.md               # Complete documentation
│   │
│   ├── auth/                       # Authentication utilities
│   │   └── (Firebase Auth helpers)
│   │
│   ├── payments/                   # Payment processing
│   │   └── (Stripe integration)
│   │
│   └── api-clients/                # External API wrappers
│       └── (Claude AI, etc.)
│
└── 📁 planning/                    # Documentation & specs
    └── projects.md                 # Project specifications (UPDATED)
```

---

## Quick Navigation

### By Status

**✅ Production Ready (100%)**:
- `/platforms/oracle-cards/` + `/platforms/oracle-cards-api/`
- `/platforms/resume-analyzer/` + `/platforms/resume-analyzer-api/`
- `/utilities/crypto-arbitrage/`
- `/shared/ui-components/`

**✅ Almost Complete (95%)**:
- `/platforms/tarot-cards/` (frontend done, API pending)

**🚧 In Progress (0%)**:
- `/platforms/runwae/` (stalled, low priority)

**📋 Planned**:
- Dream Interpreter
- Numerology Calculator
- Feng Shui Analyzer
- Astrology Birth Chart
- Past Life Insights
- Baby Name Oracle
- Burnout Index

---

## By Function

### User-Facing Platforms
All in `/platforms/` with pattern:
- `platform-name/` - Frontend (Vercel)
- `platform-name-api/` - Backend (Railway)

### Backend Services
Pattern for all API servers:
```
platform-api/
├── src/
│   ├── server.js           # Express server
│   ├── routes/             # API endpoints
│   ├── services/           # Business logic
│   │   ├── claudeService.js
│   │   └── [other services]
│   └── utils/              # Helpers
├── .env.example
├── package.json
└── README.md
```

### Frontend Pattern
All platforms follow:
```
platform/
├── public/
│   ├── index.html
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── app.js          # Main application
│       ├── config/         # Configuration
│       ├── services/       # API calls
│       └── ui/             # UI components
├── src/                    # Data/databases
├── package.json
├── vercel.json
└── README.md
```

---

## File Counts

### Platforms
- **Oracle Cards**: ~30 files
- **Tarot Cards**: ~15 files (frontend only)
- **Resume Analyzer**: ~35 files

### Utilities
- **Crypto Arbitrage**: ~20 files

### Shared
- **UI Components**: 3 files (SocialShare, ShareImageGenerator, README)

### Documentation
- **Planning**: 1 file
- **Root docs**: 4 files (README, PROJECT_STATUS, STRUCTURE, AUTOMATION)

**Total**: ~110 files across portfolio

---

## Code Statistics

### Lines of Code (Approximate)
- **Oracle Cards**: ~5,000 lines
- **Tarot Cards**: ~3,500 lines (database heavy)
- **Resume Analyzer**: ~4,500 lines
- **Crypto Arbitrage**: ~2,500 lines
- **Shared Components**: ~800 lines
- **Documentation**: ~2,000 lines

**Total**: ~18,300 lines of code

---

## Dependencies

### Common Across Platforms
- **Frontend**: No dependencies (Vanilla JS)
- **Backend**: Express, Firebase Admin, Anthropic SDK, Stripe
- **Dev**: http-server (for local dev)

### Platform-Specific
- **Oracle Cards**: Three.js (3D rendering)
- **Resume Analyzer**: pdf-parse, mammoth, nodemailer
- **Crypto Arbitrage**: ws (WebSockets), crypto (HMAC)

---

## Deployment Targets

### Production URLs (Pending)
- `oracle-cards.vercel.app` → Oracle Cards frontend
- `oracle-cards-api.railway.app` → Oracle API
- `tarot-cards.vercel.app` → Tarot frontend
- `tarot-cards-api.railway.app` → Tarot API
- `resume-analyzer.vercel.app` → Resume frontend
- `resume-analyzer-api.railway.app` → Resume API

### Custom Domains (Future)
- `oraclecards.com`
- `tarotreading.io`
- `resumeatscheck.com`

---

## Environment Variables

Each platform requires `.env`:

```bash
# Claude AI
ANTHROPIC_API_KEY=sk-ant-...

# Firebase (separate project per platform)
FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=...
FIREBASE_PROJECT_ID=...
FIREBASE_STORAGE_BUCKET=...
FIREBASE_MESSAGING_SENDER_ID=...
FIREBASE_APP_ID=...

# Stripe
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Platform-specific
SMTP_HOST=smtp.gmail.com      # Resume Analyzer only
SMTP_USER=...                  # Resume Analyzer only
SMTP_PASS=...                  # Resume Analyzer only

COINBASE_API_KEY=...          # Crypto Arbitrage only
COINBASE_API_SECRET=...       # Crypto Arbitrage only
```

---

## Git Strategy

### Branch Structure
- `main` - Production-ready code
- Feature branches for new platforms
- Each platform can be deployed independently

### Commit Pattern
- Platforms are self-contained (can be extracted/forked easily)
- Shared components versioned separately
- Documentation updated with each platform completion

---

## Testing Strategy

### Current
- Manual testing during development
- Local dev servers for frontend
- API testing via Postman/curl

### Future
- Unit tests for shared components
- Integration tests for API endpoints
- E2E tests for critical user flows
- A/B testing for pricing/features

---

## Backup Strategy

### Code
- Git repository (version controlled)
- GitHub (cloud backup)

### Data
- Firebase automatic backups
- Export scripts for user data

### Secrets
- `.env` files not in repo
- Secrets stored in Railway/Vercel dashboard
- Backup in password manager

---

## Next Platform Structure

When creating new platforms, follow this template:

```bash
# 1. Create directories
mkdir -p platforms/new-platform/{public/{css,js/{config,services,ui}},src}
mkdir -p platforms/new-platform-api/{src/{routes,services,utils},config}

# 2. Copy configuration templates
cp platforms/tarot-cards/package.json platforms/new-platform/
cp platforms/tarot-cards/vercel.json platforms/new-platform/
cp platforms/tarot-cards-api/package.json platforms/new-platform-api/

# 3. Update package names and descriptions

# 4. Create README.md with platform details

# 5. Integrate shared components
# Import from /shared/ui-components/SocialShare.js
# Import from /shared/ui-components/ShareImageGenerator.js

# 6. Follow established patterns
# - Freemium model
# - Social sharing
# - Firebase integration
# - Claude API for premium
# - Stripe for payments
```

---

## Support & Documentation

### For Each Platform
- Platform-specific README in platform root
- API documentation in API README
- Shared component docs in `/shared/ui-components/README.md`

### Portfolio-Level
- `/README.md` - Overview and quick start
- `/PROJECT_STATUS.md` - Detailed status and metrics
- `/STRUCTURE.md` - This file
- `/planning/projects.md` - Project specifications

### External Resources
- Anthropic Docs: https://docs.anthropic.com
- Firebase Docs: https://firebase.google.com/docs
- Stripe Docs: https://stripe.com/docs
- Vercel Docs: https://vercel.com/docs
- Railway Docs: https://docs.railway.app

---

**Last Updated**: February 28, 2026  
**Total Projects**: 3 Complete, 7 Planned  
**Portfolio Completion**: 30%
