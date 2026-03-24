# Quick Start Guide

Get up and running with the crypto arbitrage bot in 3 steps.

## 1. Install

```bash
cd utilities/crypto-arbitrage
npm install
```

## 2. Setup

```bash
./setup.sh
```

This creates a `.env` file from the template.

## 3. Run (Dry Run Mode)

```bash
npm start
```

The bot will:
- Monitor real-time prices from Coinbase and Kraken
- Detect arbitrage opportunities
- Simulate trades (no API keys needed)
- Display profit calculations

**Example output:**
```
[Coinbase] WebSocket connected
[Kraken] WebSocket connected

--- ARBITRAGE OPPORTUNITY DETECTED ---
Pair: BTC-USD
Buy on Kraken: $43,250.00
Sell on Coinbase: $43,500.00
Spread: 0.578%
Net Profit: 0.267%
Expected Profit: $1.16
---------------------------------------
```

## 4. Go Live (Optional)

When ready for real trading:

1. **Get Coinbase API Keys**
   - Visit: https://www.coinbase.com/settings/api
   - Create API key with "Trade" permission
   - Copy Key and Secret

2. **Add to .env**
   ```env
   COINBASE_API_KEY=your_actual_key_here
   COINBASE_API_SECRET=your_actual_secret_here
   DRY_RUN=false
   TRADE_AMOUNT_USD=50  # Start small!
   ```

3. **Ensure you have funds**
   - USD on both exchanges for buying
   - Crypto on both exchanges for selling

4. **Run**
   ```bash
   npm start
   ```

## Safety Tips

- ✅ Always test in dry run mode first
- ✅ Start with small trade amounts ($10-50)
- ✅ Monitor the first few trades closely
- ✅ Keep API keys secret (never commit .env)
- ⚠️ Only invest what you can afford to lose
- ⚠️ Arbitrage opportunities are rare and fleeting
- ⚠️ Fees can eat into profits quickly

## Need Help?

See `README.md` for full documentation.
