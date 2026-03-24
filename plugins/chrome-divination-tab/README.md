# 🔮 Mystic Tab - Chrome Extension

Transform your new tab into a spiritual sanctuary with daily oracle cards, affirmations, and cosmic guidance.

## Features

### Free Features
- **Daily Oracle Card** - One free card reading per day
- **Live Clock** - Beautiful time and date display
- **Moon Phase** - See the current lunar phase
- **Daily Affirmation** - Inspiring messages to start your day
- **Quick Search** - Search Google or navigate to URLs
- **Animated Starfield** - Mesmerizing background

### Premium Features (⭐ $4.99/mo or $19.99 lifetime)
- **Unlimited Card Draws** - Draw cards anytime
- **3-Card Spreads** - Past, Present, Future readings
- **Daily Horoscope** - Personalized astrological guidance
- **Custom Themes** - Multiple background options
- **No Ads** - Distraction-free experience

## Installation

### For Development/Testing

1. **Clone or download** this repository
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer Mode** (toggle in top right)
4. **Click "Load unpacked"**
5. **Select** the `chrome-divination-tab` folder
6. **Open a new tab** to see Mystic Tab!

### From Chrome Web Store (Coming Soon)

1. Visit Chrome Web Store
2. Search for "Mystic Tab"
3. Click "Add to Chrome"

## Project Structure

```
chrome-divination-tab/
├── manifest.json          # Extension configuration
├── newtab.html           # Main new tab page
├── popup.html            # Extension popup (click icon)
├── options.html          # Settings page
├── background.js         # Service worker
├── css/
│   └── newtab.css        # Styles
├── js/
│   ├── cardDatabase.js   # 44 oracle cards
│   ├── storage.js        # Chrome storage utilities
│   ├── starfield.js      # Animated background
│   └── newtab.js         # Main logic
├── icons/
│   ├── icon16.png        # (need to create)
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## Tech Stack

- **Manifest**: V3 (latest Chrome extension format)
- **Frontend**: Vanilla JavaScript, HTML, CSS
- **Storage**: Chrome Storage API (local)
- **No external dependencies** - works completely offline

## Revenue Model

| Plan | Price | Features |
|------|-------|----------|
| Free | $0 | Daily card, affirmations, moon phase |
| Monthly | $4.99/mo | Unlimited draws, 3-card spreads, themes |
| Lifetime | $19.99 | All premium features forever |

**Revenue Potential** (conservative):
- 1,000 users × 10% conversion × $4.99 = **$499/month**
- 10,000 users × 10% conversion × $4.99 = **$4,990/month**
- Plus lifetime purchases ≈ 5% of users × $19.99

## Marketing Strategy

### Distribution
1. **Chrome Web Store**
   - SEO-optimized listing
   - Screenshots and promo video
   - Target keywords: "new tab", "oracle cards", "spiritual", "meditation"

2. **Social Media**
   - Demo video on TikTok/Instagram
   - Post in spiritual communities on Reddit
   - Share in Facebook groups

3. **Content Marketing**
   - Blog post: "Transform Your Browser Into a Spiritual Tool"
   - YouTube tutorial
   - Partner with spiritual influencers

### Target Audience
- Spiritual seekers (18-45)
- Meditation practitioners
- Tarot/oracle card enthusiasts
- Wellness-focused individuals
- People interested in daily affirmations

## Development Roadmap

### Phase 1: MVP (Complete)
- ✅ Basic extension structure
- ✅ Daily oracle card feature
- ✅ Animated starfield background
- ✅ Time, date, moon phase display
- ✅ Settings page
- ✅ Premium modal/upsell

### Phase 2: Premium Features (Next)
- [ ] Stripe payment integration
- [ ] 3-card spread UI
- [ ] Daily horoscope feature
- [ ] Additional background themes
- [ ] User authentication (optional)

### Phase 3: Enhancement
- [ ] Custom card images (vs text-only)
- [ ] Sound effects (optional toggle)
- [ ] Export/share card readings
- [ ] Reading history log
- [ ] Personalized recommendations

### Phase 4: Scale
- [ ] Firefox extension port
- [ ] Edge extension port
- [ ] Mobile app (Progressive Web App)
- [ ] API for developers
- [ ] White-label version for spiritualists

## Publishing to Chrome Web Store

### Prerequisites
1. **Developer Account**: $5 one-time fee at [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. **Icons**: Create 16x16, 32x32, 48x48, 128x128 PNG icons
3. **Screenshots**: 1280x800 or 640x400 screenshots
4. **Promo Images**: 440x280 small tile, 1400x560 marquee (optional)

### Submission Steps

1. **Prepare assets**:
   ```bash
   # Create icons using design tool (Figma, Photoshop, etc.)
   # Place in icons/ folder
   
   # Take screenshots
   # Capture new tab with card drawn
   # Capture settings page
   # Capture premium modal
   ```

2. **Create ZIP file**:
   ```bash
   # Remove any development files
   zip -r mystic-tab-v1.0.0.zip . -x "*.git*" -x "*node_modules*" -x "*.DS_Store"
   ```

3. **Upload to Chrome Web Store**:
   - Go to [Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   - Click "New Item"
   - Upload ZIP file
   - Fill out listing info:
     - **Name**: Mystic Tab - Daily Oracle & Divination
     - **Description**: (see below)
     - **Category**: Productivity
     - **Language**: English
   - Add screenshots and promo images
   - Set pricing (free with in-app purchases)
   - Submit for review

### Store Listing Description

```
Transform your browser into a spiritual sanctuary ✨

Mystic Tab replaces your new tab page with daily oracle card readings, cosmic guidance, and beautiful spiritual visuals.

🔮 FEATURES:
• Daily Oracle Card - One free reading per day from our 44-card deck
• Live Moon Phase - Stay aligned with lunar cycles
• Daily Affirmations - Inspirational messages to start your day
• Animated Starfield - Mesmerizing cosmic background
• Quick Search - Search or navigate without losing functionality

⭐ PREMIUM ($4.99/mo or $19.99 lifetime):
• Unlimited Card Draws - Read cards anytime you need guidance
• 3-Card Spreads - Past, Present, Future insights
• Custom Themes - Beautiful background options
• Daily Horoscope - Personalized astrological guidance

Perfect for:
✓ Spiritual seekers
✓ Tarot and oracle card enthusiasts
✓ Meditation practitioners
✓ Anyone wanting daily inspiration

Privacy-focused: All data stored locally. No tracking, no ads.

Start your spiritual journey with every new tab! 🌙✨
```

### Review Timeline
- **Initial Review**: 1-3 days typically
- **Updates**: Usually within 24 hours

## Monetization Setup

### Stripe Integration (for Premium)

1. **Create Stripe account** at stripe.com
2. **Get API keys** (publishable and secret)
3. **Create products**:
   - Monthly subscription: $4.99/month recurring
   - Lifetime access: $19.99 one-time

4. **Add payment page** (separate hosted page or embedded Stripe Checkout)
5. **Update extension** to verify purchases via backend API

### Simple Flow:
1. User clicks "Go Premium"
2. Redirect to payment page (hosted on your domain)
3. After payment, generate license key
4. User enters key in extension
5. Extension verifies and activates premium

## Local Testing

```bash
# No build process needed - pure HTML/CSS/JS!

# Just load unpacked extension in Chrome
# Make changes to files
# Reload extension in chrome://extensions
# Open new tab to test
```

## Support & Updates

- **Updates**: Push updates via Chrome Web Store
- **User feedback**: Monitor Chrome Web Store reviews
- **Analytics**: Track installs, active users in Developer Dashboard
- **Support**: Provide email or contact form

## Legal & Compliance

- **Privacy Policy**: Required by Chrome Web Store
- **Terms of Service**: Recommended
- **Disclaimer**: "For entertainment purposes only"
- **Permissions**: Only use `storage` (no sensitive permissions)

## License

MIT License - See LICENSE file

## Credits

- Oracle card meanings: Original content
- Design inspiration: Spiritual aesthetics
- Icons: (Create your own or use royalty-free)

---

**Ready to publish?** Follow the steps above and let's get Mystic Tab into the Chrome Web Store! 🚀✨
