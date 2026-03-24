# 🔮 Telegram Oracle Bot

Daily oracle card readings delivered via Telegram with Telegram Stars payment integration.

## Features

- **Free Daily Card** - Users get one free oracle card reading per day
- **3-Card Spread** - Past, Present, Future reading (⭐250 Stars / ~$5)
- **Celtic Cross** - Comprehensive 10-card reading (⭐500 Stars / ~$10)
- **44 Oracle Cards** - Complete deck with upright meanings, guidance, elements & themes
- **Telegram Stars Payments** - Native in-app payments (70% revenue share)
- **Session Management** - Track user activity and reading history

## Tech Stack

- **Runtime**: Node.js 18+
- **Library**: node-telegram-bot-api
- **Payments**: Telegram Stars (XTR)
- **State**: In-memory (upgrade to Redis/Firebase for production)

## Quick Start

### 1. Create Your Bot

1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Send `/newbot`
3. Follow prompts to name your bot
4. Copy the bot token

### 2. Enable Telegram Stars Payments

1. Message [@BotFather](https://t.me/botfather)
2. Send `/mybots`
3. Select your bot → Payments → Telegram Stars
4. Accept terms and enable Stars payments

### 3. Install & Configure

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Add your bot token to .env
TELEGRAM_BOT_TOKEN=your_token_here
```

### 4. Run the Bot

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

## Bot Commands

### User Commands

- `/start` - Welcome message and feature overview
- `/help` - List all available commands
- `/about` - Learn about oracle cards
- `/daily` - Draw free daily oracle card (once per day)
- `/threecard` - Purchase 3-card spread (⭐250 Stars)
- `/celtic` - Purchase Celtic Cross spread (⭐500 Stars)

## Pricing

| Reading Type | Stars | USD (approx) | Cards | Use Case |
|--------------|-------|--------------|-------|----------|
| Daily Card | FREE | $0 | 1 | Daily guidance |
| 3-Card Spread | ⭐250 | ~$5 | 3 | Past/Present/Future |
| Celtic Cross | ⭐500 | ~$10 | 10 | Deep insight |

**Note**: 1 Telegram Star ≈ $0.02 USD. Revenue share: 70% to you, 30% to Telegram.

## Revenue Potential

**Conservative estimates** (100 active users):
- 50 users × daily card (free) = lead generation
- 10 users × 3-card spread × 2/month = ⭐5,000 (~$100/mo)
- 5 users × Celtic Cross × 1/month = ⭐2,500 (~$50/mo)

**Total**: ~$150/month per 100 active users

**Scale to 1,000 users**: ~$1,500/month  
**Scale to 5,000 users**: ~$7,500/month

## Project Structure

```
telegram-oracle-bot/
├── src/
│   ├── bot.js              # Main bot logic & commands
│   ├── cardDatabase.js     # 44 oracle cards with meanings
│   ├── cardUtils.js        # Card selection & formatting
│   └── userState.js        # Session & daily draw tracking
├── .env.example            # Environment variables template
├── .gitignore
├── package.json
└── README.md
```

## Upgrade Path

### Phase 1 (MVP - Current)
- ✅ Basic bot commands
- ✅ Free daily card
- ✅ Telegram Stars payments
- ✅ 3-card & Celtic Cross spreads
- ✅ In-memory state

### Phase 2 (Scale)
- [ ] Add Firebase/Supabase for persistent user data
- [ ] User analytics dashboard
- [ ] Custom card images
- [ ] AI-powered personalized interpretations (Claude API)
- [ ] Subscription model (⭐100/month for unlimited readings)

### Phase 3 (Advanced)
- [ ] Telegram Mini App (WebApp) with visual card selection
- [ ] Share reading results to Telegram Stories
- [ ] Multi-language support
- [ ] Custom decks (Tarot, Angel Cards, etc.)
- [ ] Affiliate program

## Deployment

### Option 1: Local/VPS

```bash
# Install PM2
npm install -g pm2

# Start bot with PM2
pm2 start src/bot.js --name oracle-bot

# Monitor
pm2 logs oracle-bot
```

### Option 2: Railway/Render

1. Connect GitHub repo
2. Add `TELEGRAM_BOT_TOKEN` environment variable
3. Deploy

### Option 3: Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
CMD ["npm", "start"]
```

## Monetization Strategy

1. **Freemium Model**
   - Free daily card builds trust & engagement
   - Premium spreads for serious seekers
   
2. **Upsell Flow**
   - After daily card: "Want deeper insight? Try /threecard"
   - After 3-card: "Need comprehensive guidance? Try /celtic"

3. **Subscription (Future)**
   - ⭐100/month for unlimited readings
   - Target: 20% conversion from active users

## Marketing

- Post in spiritual/wellness Telegram groups
- Partner with psychics/coaches (affiliate program)
- Share on Reddit: r/divination, r/tarot, r/spirituality
- Instagram/TikTok teasers with bot link
- Run Telegram Ads targeting spiritual interests

## Legal & Compliance

- Add disclaimer: "For entertainment purposes only"
- Privacy policy for user data
- Terms of service
- Comply with Telegram's TOS and Stars payment policies

## Support

For issues or questions:
1. Check Telegram Bot API docs: https://core.telegram.org/bots/api
2. Review node-telegram-bot-api: https://github.com/yagop/node-telegram-bot-api
3. Telegram Stars payments: https://core.telegram.org/bots/payments

## License

MIT
