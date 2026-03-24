# 🔮 Discord Divination Bot

Bring daily oracle card readings and spiritual guidance to your Discord server!

## Features

### Free Features
- **Daily Card** (`/daily`) - One free oracle card reading per day
- **Affirmations** (`/affirmation`) - Daily spiritual affirmations
- **Moon Phase** (`/moon`) - Current lunar phase and its energy
- **Reading History** (`/history`) - View past readings
- **Help & Info** (`/help`, `/about`) - Learn about the bot

### Premium Features (Patreon Support)
- **Unlimited Draws** (`/draw`) - Draw cards anytime
- **3-Card Spreads** (`/threecard`) - Past, Present, Future readings
- **Extended History** - Access all past readings
- **Priority Support** - Direct developer assistance
- **Early Access** - New features first

## Tech Stack

- **Discord.js v14** - Latest Discord bot framework
- **Slash Commands** - Modern Discord interaction
- **44 Oracle Cards** - Complete deck with meanings
- **In-memory State** - Fast (upgrade to DB for production)
- **Beautiful Embeds** - Rich card displays

## Quick Start

### 1. Create Discord Bot (5 minutes)

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Name it "Divination Bot" (or your choice)
4. Go to "Bot" tab → "Add Bot"
5. **Copy the bot token** (keep secret!)
6. Enable these **Privileged Gateway Intents**:
   - ✅ MESSAGE CONTENT INTENT
   - ✅ SERVER MEMBERS INTENT (optional)
7. Go to "OAuth2" → "URL Generator"
8. Select scopes:
   - ✅ `bot`
   - ✅ `applications.commands`
9. Select bot permissions:
   - ✅ Send Messages
   - ✅ Embed Links
   - ✅ Read Message History
   - ✅ Use Slash Commands
10. Copy the generated URL and invite bot to your server

### 2. Configure Bot

```bash
cd plugins/discord-divination-bot

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

Edit `.env`:
```env
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_application_id_here
PREMIUM_ROLE_ID=optional_premium_role_id
```

**Find Client ID**: Discord Developer Portal → Your App → Application ID

### 3. Deploy Commands

```bash
# Register slash commands with Discord
npm run deploy
```

You should see:
```
✅ Successfully deployed 9 slash commands!
```

### 4. Start Bot

```bash
# Run the bot
npm start

# Or use dev mode (auto-reload on changes)
npm run dev
```

You should see:
```
✨ Divination Bot#1234 is online!
🔮 Serving 1 servers
```

### 5. Test in Discord

In your Discord server, try:
- `/help` - See all commands
- `/daily` - Draw your daily card
- `/moon` - Check moon phase
- `/affirmation` - Get an affirmation

## Commands Reference

| Command | Description | Premium |
|---------|-------------|---------|
| `/daily` | Free daily oracle card | ❌ |
| `/draw` | Unlimited card draws | ✅ |
| `/threecard` | 3-card spread reading | ✅ |
| `/affirmation` | Daily affirmation | ❌ |
| `/moon` | Current moon phase | ❌ |
| `/history` | View reading history | ❌ |
| `/premium` | Premium info | ❌ |
| `/help` | Command list | ❌ |
| `/about` | About the bot | ❌ |

## Project Structure

```
discord-divination-bot/
├── src/
│   ├── index.js           # Main bot entry point
│   ├── commands.js        # All slash commands
│   ├── cardUtils.js       # Card utilities & embeds
│   ├── cardDatabase.js    # 44 oracle cards
│   ├── userState.js       # User data & history
│   └── deploy-commands.js # Command registration
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Revenue Model

### Patreon Tiers

**Mystic Supporter** - $3/month
- Unlimited card draws
- 3-card spreads
- Reading history
- Supporter role

**Spiritual Guide** - $5/month
- All Mystic features
- Custom server role
- Priority support
- Vote on new features

**Divine Patron** - $10/month
- All Guide features
- Bot customization for your server
- Early access to features
- Monthly 1-on-1 reading

### Server Subscriptions (Alternative)

Discord's built-in server subscriptions:
- **Premium Tier** - $4.99/month
- Automatically assigns premium role
- Discord handles payments (90% revenue to you)

### Revenue Projections

**Conservative** (per 1,000 active users):

| Tier | Users | Price | Monthly |
|------|-------|-------|---------|
| Free | 900 | $0 | $0 |
| Supporter | 60 | $3 | $180 |
| Guide | 30 | $5 | $150 |
| Patron | 10 | $10 | $100 |
| **Total** | **100** | - | **$430** |

**Scale projections:**
- 5,000 users → ~$2,150/month
- 10,000 users → ~$4,300/month
- 50,000 users → ~$21,500/month

## Premium Setup

### Option 1: Patreon Integration

1. Create Patreon page at patreon.com
2. Set up tiers ($3, $5, $10)
3. Use a Patreon bot to sync roles:
   - [Patreon Integration Bot](https://www.patreon.com/apps/discord)
4. Set `PREMIUM_ROLE_ID` in `.env` to your premium role
5. Update Patreon link in `src/cardUtils.js` and `src/commands.js`

### Option 2: Discord Server Subscriptions

1. Enable Monetization in Server Settings
2. Create Premium role
3. Set up subscription tiers
4. Set `PREMIUM_ROLE_ID` in `.env`
5. Discord handles everything!

### Option 3: Ko-fi/Buy Me a Coffee

1. Create Ko-fi account
2. Set up monthly memberships
3. Manually assign premium roles
4. Or use Ko-fi webhook integration

## Deployment

### Option A: Railway (Recommended)

1. Create account at railway.app
2. New Project → Deploy from GitHub
3. Add environment variables:
   - `DISCORD_BOT_TOKEN`
   - `DISCORD_CLIENT_ID`
   - `PREMIUM_ROLE_ID`
4. Deploy!

### Option B: Render

1. Create account at render.com
2. New Web Service → Connect GitHub
3. Build: `npm install`
4. Start: `npm start`
5. Add env vars
6. Deploy!

### Option C: VPS (DigitalOcean, etc.)

```bash
# SSH into server
ssh user@your-server

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repo
git clone your-repo-url
cd discord-divination-bot

# Install dependencies
npm install

# Install PM2
sudo npm install -g pm2

# Create .env file
nano .env
# (add your tokens)

# Deploy commands
npm run deploy

# Start bot with PM2
pm2 start src/index.js --name divination-bot
pm2 save
pm2 startup
```

Monitor:
```bash
pm2 logs divination-bot
pm2 status
```

## Marketing Strategy

### 1. Discord Server Directories

List your bot on:
- **top.gg** - Largest bot directory
- **discord.bots.gg** - Popular listing site
- **discordbotlist.com** - Another major directory
- **bots.ondiscord.xyz** - Growing directory

### 2. Social Promotion

- Post demo video on TikTok/Instagram
- Share in spiritual Discord communities
- Reddit: r/discordapp, r/spirituality, r/tarot
- Twitter/X with #Discord #Bot #Spiritual tags

### 3. Server Partnerships

- Partner with spiritual/wellness servers
- Offer premium features for partnered servers
- Create affiliate program (share revenue)

### 4. Content Marketing

- Blog post: "Best Discord Bots for Spiritual Communities"
- YouTube tutorial on using the bot
- Create card reading examples
- Share user testimonials

## Scaling Considerations

When you reach **100+ servers**, upgrade:

### Database Migration

Replace in-memory storage with MongoDB or Firebase:

```javascript
// Install MongoDB
npm install mongodb

// Or Firebase
npm install firebase-admin

// Update userState.js to use database
```

### Caching

Add Redis for fast data access:
```bash
npm install redis
```

### Analytics

Track usage metrics:
- Commands per day
- Active users
- Premium conversion rate
- Most popular cards

### Rate Limiting

Prevent abuse:
```javascript
// Add cooldowns to commands
// Limit free features per server
```

## Advanced Features (Future)

- [ ] Custom card decks per server
- [ ] Scheduled daily card posts
- [ ] Birth chart integration
- [ ] Tarot deck addition
- [ ] Multi-language support
- [ ] AI-powered interpretations (Claude API)
- [ ] Voice channel readings
- [ ] Card image generation

## Support & Updates

- **Bug reports**: GitHub Issues
- **Feature requests**: Discord server
- **Updates**: Push to GitHub, auto-deploy
- **Support**: Premium members get priority

## Legal & Compliance

- **Privacy Policy**: Include data usage policy
- **Terms of Service**: Bot usage terms
- **Disclaimer**: "For entertainment purposes only"
- **Discord TOS**: Follow all Discord rules
- **GDPR**: Allow users to delete their data

## Testing

```bash
# Run bot locally
npm run dev

# Test in your Discord server:
# 1. Invite bot
# 2. Try all commands
# 3. Test premium features (manually assign role)
# 4. Check error handling
# 5. Verify embeds display correctly
```

## Troubleshooting

**Bot doesn't come online?**
- Check bot token in `.env`
- Verify intents enabled in Developer Portal
- Check console for errors

**Commands not appearing?**
- Run `npm run deploy` again
- Wait a few minutes for Discord to sync
- Try in a different server

**Premium features not working?**
- Verify `PREMIUM_ROLE_ID` is correct
- Check user has the role
- Look for errors in console

## Contributing

This is a solo project, but suggestions welcome!

## License

MIT

## Credits

- Oracle card meanings: Original content
- Discord.js: Amazing framework
- Community: Thanks for the support! 💜

---

**Ready to launch?** Follow the Quick Start guide and bring spiritual guidance to Discord! 🚀✨
