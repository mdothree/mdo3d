# Oracle Cards

Digital oracle card readings with AI-powered personalized interpretations.

## Features

### Free Tier
- ✅ Daily single card draw
- ✅ 44 beautifully designed oracle cards
- ✅ Basic card meanings and guidance
- ✅ Card animations and visual effects
- ✅ Share readings

### Premium Tier
- ✨ Personalized AI interpretations (Claude API)
- ✨ Multi-card spreads (3-card, Celtic Cross)
- ✨ Deep insights and action steps
- ✨ Custom affirmations
- ✨ Save reading history
- ✨ Unlimited readings

## Tech Stack

- **Frontend**: Vanilla JavaScript, CSS animations
- **Backend API**: Express.js
- **AI**: Claude 3.5 Sonnet (Anthropic)
- **Database**: Firebase Firestore
- **Auth**: Firebase Authentication
- **Payments**: Stripe
- **Hosting**: Vercel (frontend) + Railway (API)

## Revenue Model

**Pay-per-Reading:**
- Single card premium: $2.99
- Three card spread: $4.99
- Celtic Cross (10 cards): $9.99

**Monthly Subscription:**
- Unlimited readings: $9.99/month

**Target Conversion:**
- 1,000 daily visitors
- 30% try free reading
- 5% upgrade to premium
- 15 premium readings/day = $45/day = $1,350/month
- Plus subscriptions

## Quick Start

### Frontend
```bash
cd platforms/oracle-cards
npm install
npm run dev
```

Visit: http://localhost:8080

### Backend API
```bash
cd platforms/oracle-cards-api
npm install
cp .env.example .env
# Add your Anthropic API key
npm run dev
```

API runs on: http://localhost:3002

## Card Database

✅ **Complete 44-Card Deck** - Full oracle deck with diverse spiritual themes:

**Themes Covered:**
- **Transformation:** New Beginnings, Release, Transformation, Rebirth
- **Intuition & Wisdom:** Inner Wisdom, Intuition, Clarity, Wisdom, Vision
- **Love & Connection:** Divine Love, Forgiveness, Community, Gratitude
- **Power & Courage:** Strength, Courage, Boundaries, Protection
- **Spiritual Growth:** Awakening, Shadow Work, Soul Contract, Faith
- **Balance & Harmony:** Balance, Patience, Grounding, Simplicity, Rest
- **Creation & Expression:** Creativity, Manifestation, Passion, Purpose
- **Healing & Recovery:** Healing, Release, Grace, Restoration
- **Divine Energy:** Divine Feminine, Divine Masculine, Miracles, Signs
- **Life Cycles:** Cycles, Timing, Abundance, Freedom

**All 44 Cards:**
1. New Beginnings, 2. Inner Wisdom, 3. Abundance, 4. Divine Love, 5. Strength, 6. Release, 7. Clarity, 8. Patience, 9. Shadow Work, 10. Awakening, 11. Ancestors, 12. Creativity, 13. Boundaries, 14. Joy, 15. Cycles, 16. Truth, 17. Community, 18. Surrender, 19. Purpose, 20. Forgiveness, 21. Transformation, 22. Grounding, 23. Miracles, 24. Balance, 25. Faith, 26. Gratitude, 27. Courage, 28. Rest, 29. Intuition, 30. Manifestation, 31. Simplicity, 32. Soul Contract, 33. Freedom, 34. Divine Feminine, 35. Divine Masculine, 36. Signs, 37. Healing, 38. Vision, 39. Protection, 40. Mystery, 41. Rebirth, 42. Wisdom, 43. Passion, 44. Grace

**Card Structure:**
Each card includes:
- Unique name and keywords
- Upright meaning (brief + detailed + guidance)
- Reversed meaning (brief + detailed + guidance)  
- Element (Earth, Air, Fire, Water)
- Theme category

## Spread Types

### Single Card (FREE)
Quick daily guidance, perfect for beginners

### Three Card ($4.99)
- Position 1: Past influences
- Position 2: Present situation
- Position 3: Future potential

### Celtic Cross ($9.99)
10-card deep dive:
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

## API Endpoints

### POST /api/reading/generate
Generate personalized reading

**Request:**
```json
{
  "cards": [card objects],
  "question": "What guidance do I need today?",
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
cd platforms/oracle-cards
vercel --prod
```

### API (Railway)
```bash
cd platforms/oracle-cards-api
railway init
railway up
```

See full deployment guide in `DEPLOYMENT.md`

## Future Enhancements

- [x] Complete 44-card deck
- [ ] User accounts and reading history
- [ ] Daily card email notifications
- [ ] Custom card decks (tarot, angel cards, etc.)
- [ ] Mobile app (React Native)
- [ ] Reading journal feature
- [ ] Community sharing
- [ ] Guided meditations for each card
- [ ] Printable reading PDFs

## Marketing Strategy

**SEO Keywords:**
- "oracle cards online"
- "free oracle card reading"
- "daily oracle card"
- "spiritual guidance"

**Content:**
- Blog posts about card meanings
- YouTube: "Card of the Day"
- Instagram: Beautiful card graphics
- TikTok: Quick readings

**Channels:**
- Pinterest (highly visual)
- Instagram reels
- Spiritual/wellness influencers
- Reddit r/tarot, r/spirituality

## License

MIT
