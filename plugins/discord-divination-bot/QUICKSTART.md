# ⚡ Quick Start - Discord Divination Bot

Get your bot running in **10 minutes**!

## Step 1: Create Discord Application (3 min)

1. Go to https://discord.com/developers/applications
2. Click **"New Application"**
3. Name: "Divination Bot"
4. Click **"Create"**

## Step 2: Create Bot User (2 min)

1. Click **"Bot"** in left sidebar
2. Click **"Add Bot"** → Confirm
3. **COPY THE TOKEN** (click "Reset Token" if needed)
4. Save it somewhere safe!
5. Scroll down to **"Privileged Gateway Intents"**
6. Enable:
   - ✅ MESSAGE CONTENT INTENT
   - ✅ SERVER MEMBERS INTENT
7. Click **"Save Changes"**

## Step 3: Get Application ID (30 sec)

1. Click **"General Information"** in left sidebar
2. Copy **"APPLICATION ID"**
3. Save it!

## Step 4: Invite Bot to Server (1 min)

1. Click **"OAuth2"** → **"URL Generator"**
2. Select **Scopes**:
   - ✅ `bot`
   - ✅ `applications.commands`
3. Select **Bot Permissions**:
   - ✅ Send Messages
   - ✅ Embed Links
   - ✅ Read Message History
   - ✅ Use Slash Commands
4. **Copy the URL** at bottom
5. Open URL in browser → Select your server → **Authorize**

## Step 5: Configure Bot Locally (2 min)

```bash
cd plugins/discord-divination-bot

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

Edit `.env`:
```env
DISCORD_BOT_TOKEN=paste_your_bot_token_here
DISCORD_CLIENT_ID=paste_your_application_id_here
```

## Step 6: Deploy Commands (30 sec)

```bash
npm run deploy
```

You should see:
```
✅ Successfully deployed 9 slash commands!
```

## Step 7: Start Bot (30 sec)

```bash
npm start
```

You should see:
```
✨ Divination Bot#1234 is online!
🔮 Serving 1 servers
```

## Step 8: Test! (1 min)

Go to your Discord server and type:

```
/daily
```

You should get a beautiful oracle card! 🎉

Try other commands:
- `/help` - See all commands
- `/moon` - Moon phase
- `/affirmation` - Daily affirmation

## 🎉 Done!

Your bot is live! Now you can:

### Next Steps

**1. Set up Premium (Optional)**
- Create Patreon page
- Get premium role ID from Discord
- Add to `.env`: `PREMIUM_ROLE_ID=your_role_id`
- Restart bot

**2. Deploy to Cloud**
- Railway.app (easiest, free tier)
- Render.com (free tier)
- Or your own VPS

**3. List Your Bot**
- top.gg - Get discovered
- discord.bots.gg - More visibility
- Share in communities!

**4. Customize**
- Edit card messages in `src/cardDatabase.js`
- Adjust colors in `src/cardUtils.js`
- Add new commands in `src/commands.js`

## Common Issues

### "Invalid Token"
- Double-check token in `.env`
- Make sure no extra spaces
- Try resetting token in Developer Portal

### "Commands not showing up"
- Wait 5 minutes after deploying
- Re-run `npm run deploy`
- Reinvite bot with new OAuth2 URL

### "Bot offline"
- Check console for errors
- Verify intents enabled in Developer Portal
- Make sure `npm start` is running

## Quick Reference

**Start bot**: `npm start`  
**Deploy commands**: `npm run deploy`  
**Dev mode** (auto-reload): `npm run dev`

**Bot token**: Discord Developer Portal → Your App → Bot  
**Application ID**: Discord Developer Portal → Your App → General Information

---

**Total time**: ~10 minutes  
**Cost**: Free  
**Difficulty**: Easy

Enjoy your spiritual Discord bot! 🔮✨
