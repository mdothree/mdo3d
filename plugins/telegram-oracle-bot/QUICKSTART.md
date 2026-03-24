# ⚡ Quick Start Guide - 10 Minutes to Live Bot

## Prerequisites
- Node.js 18+ installed
- Telegram account
- 10 minutes of your time

## Step 1: Create Bot (2 minutes)

1. Open Telegram, search for: **@BotFather**
2. Send: `/newbot`
3. Name your bot: `Daily Oracle Bot` (or your choice)
4. Username: `your_oracle_bot` (must end in 'bot')
5. **Copy the token** - looks like: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`

## Step 2: Enable Payments (1 minute)

1. In @BotFather chat, send: `/mybots`
2. Select your bot → Payments → Telegram Stars
3. Accept terms → Enable

## Step 3: Configure Bot (1 minute)

```bash
cd plugins/telegram-oracle-bot
cp .env.example .env
```

Edit `.env` and add your token:
```
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
```

## Step 4: Run Bot (1 minute)

```bash
npm install
npm start
```

You should see: `🔮 Oracle Bot is running...`

## Step 5: Test (2 minutes)

1. Open Telegram
2. Search for your bot username
3. Send `/start` → You should get welcome message
4. Send `/daily` → You should get a free oracle card
5. Send `/threecard` → You should see payment interface

## 🎉 Done! Your bot is live!

## Next Steps

### Market Your Bot
1. Share in spiritual Telegram groups
2. Post on social media with bot link
3. Create TikTok/Instagram demos

### Deploy to Production
Choose one:

**Option A: Railway** (Easiest)
1. Go to railway.app
2. New Project → Deploy from GitHub
3. Add env var: `TELEGRAM_BOT_TOKEN`
4. Auto-deploys on push

**Option B: Render**
1. Go to render.com
2. New Web Service → Connect GitHub
3. Add env var: `TELEGRAM_BOT_TOKEN`
4. Deploy

**Option C: VPS**
```bash
npm install -g pm2
pm2 start src/bot.js --name oracle-bot
pm2 save
```

### Customize Bot

**Add your own commands** in `src/bot.js`:
```javascript
bot.onText(/\/yourcommand/, (msg) => {
  // Your logic here
});
```

**Change pricing** in `src/bot.js`:
```javascript
const PRICING = {
  DAILY_CARD: 0,
  THREE_CARD: 250,    // Change to 300 for ~$6
  CELTIC_CROSS: 500   // Change to 600 for ~$12
};
```

**Add more card decks** - create new files in `src/`:
- `tarotDatabase.js` (78 tarot cards)
- `angelDatabase.js` (angel cards)
- etc.

## Troubleshooting

**Bot doesn't respond?**
- Check token in `.env` file
- Make sure bot is running (`npm start`)
- Check @BotFather that bot exists

**Payments not working?**
- Verify Stars enabled in @BotFather
- Check `XTR` currency in invoice code

**Cards not loading?**
- Verify `cardDatabase.js` imported correctly
- Run `npm test` to check database

## Support

- Check: `/plugins/telegram-oracle-bot/README.md`
- Deploy guide: `/plugins/telegram-oracle-bot/DEPLOYMENT.md`
- Telegram Bot API: https://core.telegram.org/bots/api

---

**Total setup time**: ~7 minutes  
**Time to first revenue**: Same day  
**Scalability**: Unlimited users

Let's get your first paying customer today! 🔮✨
