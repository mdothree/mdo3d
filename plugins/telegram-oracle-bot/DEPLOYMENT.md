# 🚀 Telegram Oracle Bot - Deployment Guide

## Step-by-Step Setup

### 1. Create Your Telegram Bot (5 minutes)

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot`
3. Follow the prompts:
   ```
   BotFather: Alright, a new bot. How are we going to call it?
   You: Daily Oracle Bot

   BotFather: Good. Now let's choose a username for your bot.
   You: daily_oracle_cards_bot (must end in 'bot')
   ```
4. **Copy the bot token** (looks like: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)
5. Save this token securely

### 2. Enable Telegram Stars Payments (3 minutes)

1. Still in chat with @BotFather, send `/mybots`
2. Select your bot from the list
3. Click "Payments" → "Telegram Stars"
4. Accept the terms and conditions
5. Confirm activation
6. ✅ Stars payments are now enabled!

### 3. Configure Your Bot (2 minutes)

1. Set bot description (shown in profile):
   ```
   /setdescription
   Select your bot
   Paste: "Daily oracle card readings for spiritual guidance. Free daily card + premium spreads."
   ```

2. Set bot about text:
   ```
   /setabouttext
   Select your bot
   Paste: "🔮 Your daily spiritual guidance through oracle cards"
   ```

3. Set bot commands (for autocomplete):
   ```
   /setcommands
   Select your bot
   Paste this:
   start - Start your oracle journey
   daily - Free daily card reading
   threecard - 3-card spread (past/present/future)
   celtic - Celtic Cross 10-card reading
   help - Show all commands
   about - Learn about oracle cards
   ```

### 4. Local Development Setup

```bash
# Navigate to bot directory
cd plugins/telegram-oracle-bot

# Install dependencies (already done)
npm install

# Create .env file
cp .env.example .env

# Edit .env and add your bot token
# TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
nano .env  # or use your preferred editor
```

### 5. Test Locally

```bash
# Run in development mode
npm run dev
```

You should see:
```
🔮 Oracle Bot is running...
```

**Test the bot:**
1. Open Telegram
2. Search for your bot username
3. Send `/start`
4. Try `/daily` for a free reading
5. Try `/threecard` to see the payment interface

### 6. Production Deployment

#### Option A: Railway (Recommended - Free Tier Available)

1. Create account at https://railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Connect your GitHub account
4. Select your repository
5. Add environment variable:
   - Key: `TELEGRAM_BOT_TOKEN`
   - Value: Your bot token
6. Railway will auto-deploy on every push

#### Option B: Render (Free Tier)

1. Create account at https://render.com
2. New → "Web Service"
3. Connect GitHub repository
4. Settings:
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Add environment variable `TELEGRAM_BOT_TOKEN`
6. Deploy

#### Option C: VPS (DigitalOcean, Linode, etc.)

```bash
# SSH into your server
ssh user@your-server-ip

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2

# Clone your repository
git clone your-repo-url
cd plugins/telegram-oracle-bot

# Install dependencies
npm install

# Create .env file with your token
nano .env

# Start with PM2
pm2 start src/bot.js --name oracle-bot

# Save PM2 config
pm2 save

# Auto-restart on server reboot
pm2 startup
```

Monitor your bot:
```bash
pm2 logs oracle-bot
pm2 status
```

#### Option D: Docker

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t oracle-bot .
docker run -d --env TELEGRAM_BOT_TOKEN=your_token oracle-bot
```

### 7. Verify Deployment

1. Message your bot on Telegram
2. Send `/start` - should get welcome message
3. Send `/daily` - should get a free oracle card
4. Send `/threecard` - should see Telegram Stars payment
5. Make a test payment (⭐250 Stars)
6. Verify you receive the 3-card spread

### 8. Monitor & Maintain

**Check bot health:**
```bash
# If using PM2
pm2 status
pm2 logs oracle-bot --lines 100

# If using Railway/Render
# Check their dashboard logs
```

**Common issues:**
- Bot not responding: Check bot token in .env
- Payment not working: Verify Stars enabled in @BotFather
- Cards not loading: Check cardDatabase.js imported correctly

### 9. Marketing & Growth

**Where to promote:**
1. **Telegram Groups**
   - Join spiritual/wellness groups
   - Share your bot (check group rules first)
   - Offer free readings to admins

2. **Social Media**
   - Create TikTok/Instagram showing bot in action
   - Post in r/divination, r/tarot subreddits
   - Share on Twitter/X with hashtags: #oracle #tarot #spirituality

3. **Partnerships**
   - Contact spiritual coaches/psychics
   - Offer affiliate revenue share
   - Create promo codes

4. **Telegram Ads** (when ready to scale)
   - Target spiritual/wellness interests
   - Run ads in related channels
   - A/B test messaging

### 10. Scaling Checklist

When you reach **100+ daily active users**, upgrade:

- [ ] Move from in-memory to database (Firebase/Supabase)
- [ ] Add analytics dashboard
- [ ] Implement caching for card data
- [ ] Add error logging (Sentry)
- [ ] Create backup bot token
- [ ] Set up monitoring alerts
- [ ] Add rate limiting
- [ ] Consider CDN for card images

## Revenue Milestones

- **100 users**: ~$150/month
- **500 users**: ~$750/month
- **1,000 users**: ~$1,500/month
- **5,000 users**: ~$7,500/month
- **10,000 users**: ~$15,000/month

## Support Resources

- **Telegram Bot API**: https://core.telegram.org/bots/api
- **Telegram Stars Docs**: https://core.telegram.org/bots/payments
- **Node.js Telegram Bot API**: https://github.com/yagop/node-telegram-bot-api
- **Telegram Bot Support**: @BotSupport

## Next Steps

1. Complete deployment using one of the options above
2. Test all features thoroughly
3. Start marketing in spiritual communities
4. Monitor usage and revenue
5. Iterate based on user feedback

Good luck! 🔮✨
