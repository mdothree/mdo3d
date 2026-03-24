# Resume Analyzer

An ATS-friendly resume analyzer that provides instant feedback and scoring. Built with vanilla JavaScript for maximum performance and compatibility.

## Features

### Free Tier
- ✅ Upload PDF or Word documents
- ✅ Instant ATS compatibility score (0-100)
- ✅ Top 3 critical issues identified
- ✅ Basic keyword analysis
- ✅ Format and structure validation
- ✅ Email delivery of results

### Premium Tier ($29)
- 🚧 Complete detailed breakdown of all issues
- 🚧 AI-powered rewrite suggestions (Claude API)
- 🚧 Industry-specific keyword recommendations
- 🚧 Before/after comparison
- 🚧 Job description matcher
- 🚧 Multiple export formats

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES6 modules)
- **Styling**: Pure CSS (no frameworks)
- **File Parsing**: PDF.js (client-side), pdf-parse & mammoth (server-side)
- **AI Analysis**: Anthropic Claude API (for premium features)
- **Auth**: Firebase Authentication
- **Database**: Firebase Firestore
- **Payments**: Stripe
- **Hosting**: Netlify/Vercel

## Project Structure

```
resume-analyzer/
├── public/
│   ├── index.html              # Main landing page
│   ├── css/
│   │   └── styles.css          # All styles
│   └── js/
│       ├── app.js              # Main application
│       ├── parsers/
│       │   └── resumeParser.js # PDF/DOCX parsing
│       ├── analyzers/
│       │   └── atsAnalyzer.js  # ATS scoring logic
│       └── ui/
│           └── uiManager.js    # UI updates & animations
├── src/
│   ├── api/                    # Backend API endpoints
│   └── services/               # Business logic
└── config/
    └── firebase.json           # Firebase configuration
```

## Quick Start

### 1. Install Dependencies

```bash
cd platforms/resume-analyzer
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

This starts a local server at `http://localhost:8080`

### 3. Test with Sample Resume

Upload any PDF or Word resume to see the analyzer in action.

## How It Works

### ATS Scoring Algorithm

The analyzer evaluates resumes across 5 dimensions:

1. **Keywords (30%)**: Technical skills, soft skills, action verbs
2. **Sections (25%)**: Required sections (contact, experience, education, skills)
3. **Formatting (20%)**: ATS-friendly structure, consistent formatting
4. **Length (15%)**: Optimal word count (400-800 words)
5. **Contact Info (10%)**: Email, phone, LinkedIn presence

**Scoring Ranges:**
- 85-100: Excellent
- 70-84: Good
- 50-69: Needs Improvement
- 0-49: Needs Significant Improvement

### Current Implementation Status

**✅ Completed:**
- File upload with drag & drop
- Mock resume text extraction
- Complete ATS scoring algorithm
- Animated score display
- Issue identification (top 3 for free tier)
- Responsive UI design

**🚧 TODO:**
- Actual PDF/DOCX parsing (currently uses mock data)
- Claude API integration for premium AI suggestions
- Firebase authentication
- Email delivery system
- Stripe payment integration
- Backend API for file processing

## Development Roadmap

### Phase 1: MVP (Current)
- [x] Landing page and UI
- [x] File upload interface
- [x] ATS scoring algorithm
- [x] Basic issue detection
- [ ] Real PDF/DOCX parsing
- [ ] Email capture

### Phase 2: Premium Features
- [ ] Claude API integration
- [ ] AI rewrite suggestions
- [ ] Industry keyword database
- [ ] Stripe payment flow
- [ ] Premium report generation

### Phase 3: Scale & Optimize
- [ ] User accounts (Firebase Auth)
- [ ] Resume history
- [ ] Job description matcher
- [ ] A/B testing for conversion
- [ ] Analytics dashboard

## Configuration

### Environment Variables

Create a `.env` file:

```env
# Anthropic API (for premium AI features)
ANTHROPIC_API_KEY=your_key

# Firebase
FIREBASE_API_KEY=your_key
FIREBASE_PROJECT_ID=your_project_id

# Stripe
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Pricing
PREMIUM_PRICE_USD=29
```

### Firebase Setup

1. Create a Firebase project
2. Enable Authentication (Email/Password)
3. Create Firestore database
4. Add configuration to `.env`

### Stripe Setup

1. Create Stripe account
2. Get API keys from dashboard
3. Create product for premium report ($29)
4. Add keys to `.env`

## Deployment

### Deploy to Netlify

```bash
# Build (if needed)
npm run build

# Deploy
netlify deploy --prod
```

### Deploy to Vercel

```bash
vercel --prod
```

## Revenue Model

**Freemium Strategy:**

1. User uploads resume → Gets free ATS score
2. Captures email for free report
3. Offers premium upgrade ($29) for:
   - AI-powered detailed analysis
   - Rewrite suggestions
   - Industry-specific keywords
   - Before/after comparison

**Conversion Funnel:**
- Free users: Email capture (lead generation)
- Premium conversion: 2-5% target
- Average revenue per user: $0.60-1.50
- With 1000 users/month: $600-1500/month

## Marketing Strategy

1. **SEO**: Target "resume ATS checker", "resume scanner"
2. **Content**: Blog posts about ATS tips
3. **Social**: LinkedIn posts targeting job seekers
4. **Partnerships**: Career coaches, job boards
5. **Freemium**: Low barrier to entry, high value demonstration

## Future Enhancements

- Cover letter analyzer
- LinkedIn profile optimizer
- Resume templates library
- Job application tracker
- Interview prep tools
- Chrome extension for quick checks

## License

MIT
