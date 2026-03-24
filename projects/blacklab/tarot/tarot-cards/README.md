# Tarot Cards

Professional online tarot reading platform with complete 78-card deck and AI-powered interpretations.

## Features

### Free Tier
- ✅ Single card daily readings
- ✅ Complete 78-card tarot deck
- ✅ Upright and reversed meanings
- ✅ Card keywords and guidance
- ✅ Share readings on social media
- ✅ Unlimited free single card draws

### Premium Tier
- ✨ AI-powered personalized interpretations (Claude API)
- ✨ Multi-card spreads (Three Card, Celtic Cross)
- ✨ Deep insights and connections
- ✨ Actionable guidance
- ✨ Custom affirmations
- ✨ Reading history

## Tarot Deck

### Complete 78-Card Deck

**22 Major Arcana:**
The Fool's Journey from 0 (The Fool) to 21 (The World)
- Life's major themes and spiritual lessons
- Each card with astrological associations
- Full upright and reversed interpretations

**56 Minor Arcana:**

**Wands (Fire) - 14 cards:**
- Ace through Ten + Court Cards (Page, Knight, Queen, King)
- Themes: Passion, creativity, career, energy, action

**Cups (Water) - 14 cards:**
- Ace through Ten + Court Cards
- Themes: Emotions, love, relationships, intuition

**Swords (Air) - 14 cards:**
- Ace through Ten + Court Cards
- Themes: Intellect, conflict, truth, communication

**Pentacles (Earth) - 14 cards:**
- Ace through Ten + Court Cards
- Themes: Material world, finances, work, manifestation

## Spread Types

### Single Card (FREE)
Quick daily guidance or focused answer to a question.

### Three Card Spread ($4.99)
- **Card 1:** Past influences
- **Card 2:** Present situation
- **Card 3:** Future potential

### Celtic Cross ($9.99)
Comprehensive 10-card spread:
1. Present Situation
2. Challenge/Opportunity
3. Past Foundation
4. Recent Past
5. Potential Future
6. Near Future
7. Your Approach
8. External Influences
9. Hopes and Fears
10. Final Outcome

## Tech Stack

- **Frontend:** Vanilla JavaScript (ES6 modules), Pure CSS
- **Backend API:** Express.js + Claude AI
- **Database:** Firebase Firestore
- **Auth:** Firebase Authentication
- **Payments:** Stripe
- **Hosting:** Vercel (frontend) + Railway (API)
- **Sharing:** Reusable social share components

## Quick Start

### Frontend
```bash
cd platforms/tarot-cards
npm install
npm run dev
```

Visit: http://localhost:8081

### Backend API
```bash
cd platforms/tarot-cards-api
npm install
cp .env.example .env
# Add your Anthropic API key
npm run dev
```

API runs on: http://localhost:3003

## Revenue Model

**Pay-per-Reading:**
- Single card premium: $2.99
- Three card spread: $4.99
- Celtic Cross: $9.99

**Monthly Subscription (Future):**
- Unlimited premium readings: $14.99/month

**Target Metrics:**
- 1,500 daily visitors
- 40% try free reading
- 6% upgrade to premium
- 36 premium readings/day = $108/day = $3,240/month
- Plus future subscriptions

## Project Structure

```
tarot-cards/
├── public/
│   ├── index.html          # Main page
│   ├── css/
│   │   └── styles.css      # Mystical dark theme
│   └── js/
│       ├── app.js          # Main application logic
│       ├── config/         # Configuration files
│       ├── services/       # API services
│       └── ui/             # UI components
├── src/
│   └── tarotDatabase.js    # Complete 78-card deck
├── package.json
├── vercel.json             # Vercel deployment config
└── README.md
```

## Card Database Structure

Each card includes:
```javascript
{
  id: 0,
  name: "The Fool",
  arcana: "major",           // or "minor"
  suit: null,                // wands, cups, swords, pentacles, or null
  number: 0,
  keywords: ["new beginnings", "innocence", "spontaneity", "free spirit"],
  upright: {
    brief: "A leap of faith. New adventures await.",
    meaning: "Detailed upright meaning...",
    guidance: "Guidance for upright position..."
  },
  reversed: {
    brief: "Recklessness. Poor judgment or naivety.",
    meaning: "Detailed reversed meaning...",
    guidance: "Guidance for reversed position..."
  },
  element: "Air",            // Fire, Water, Air, or Earth
  astrology: "Uranus"        // Major Arcana only
}
```

## Social Sharing

Integrated social sharing using shared components:
- Native Web Share API on mobile
- Custom modal on desktop
- Dynamic image generation (1200x630px)
- Share to: Twitter, Facebook, WhatsApp, LinkedIn, Email
- Analytics tracking via Firebase

## API Endpoints

### POST /api/reading/generate
Generate personalized tarot reading

**Request:**
```json
{
  "cards": [card objects],
  "question": "What guidance do I need?",
  "spreadType": "single",
  "premium": true
}
```

**Response:**
```json
{
  "success": true,
  "reading": {
    "type": "premium",
    "opening": "...",
    "interpretation": "...",
    "insights": ["..."],
    "actionSteps": ["..."],
    "affirmation": "..."
  }
}
```

## Deployment

### Frontend (Vercel)
```bash
cd platforms/tarot-cards
vercel --prod
```

### API (Railway)
```bash
cd platforms/tarot-cards-api
railway init
railway up
```

## Future Enhancements

- [ ] User accounts and reading history
- [ ] Daily card email notifications
- [ ] Additional spread types (Horseshoe, Tree of Life, etc.)
- [ ] Multiple tarot decks (Rider-Waite, Thoth, etc.)
- [ ] Mobile app (React Native)
- [ ] Reading journal feature
- [ ] Community sharing
- [ ] Video interpretations
- [ ] Tarot courses and learning

## Marketing Strategy

**SEO Keywords:**
- "free tarot reading online"
- "tarot card meanings"
- "daily tarot card"
- "online tarot spread"

**Content:**
- Blog posts about card meanings
- YouTube: "Card of the Day" series
- Instagram: Beautiful card graphics
- TikTok: Quick readings and tips
- Pinterest: Tarot spreads and meanings

**Channels:**
- Pinterest (highly visual)
- Instagram reels and stories
- TikTok tarot community
- Reddit r/tarot
- Spiritual/wellness influencers

## License

MIT
