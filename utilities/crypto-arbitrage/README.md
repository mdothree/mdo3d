# Crypto Arbitrage Bot

An automated cryptocurrency arbitrage trading bot that identifies and executes profitable trades across multiple exchanges.

## Features

✅ **Ready for Production:**
- Real-time price monitoring via WebSocket connections
- Arbitrage opportunity detection with configurable profit thresholds
- Coinbase Advanced Trade API integration with authentication
- Automatic balance verification before trades
- Market order execution (buy/sell)
- Order status tracking and confirmation
- Dry run mode for safe testing without API keys
- Detailed logging and trade statistics

🚧 **Kraken Support:** WebSocket price monitoring works, but authenticated trading not yet implemented

## Architecture

```
crypto-arbitrage-bot/
├── src/
│   ├── exchanges/          # Exchange API clients
│   │   ├── BaseExchange.js
│   │   ├── CoinbaseExchange.js
│   │   └── KrakenExchange.js
│   ├── monitors/           # Price monitoring
│   │   └── PriceMonitor.js
│   ├── strategies/         # Trading logic
│   │   ├── ArbitrageStrategy.js
│   │   └── TradeExecutor.js
│   ├── utils/             # Utilities
│   │   └── Logger.js
│   └── index.js           # Main entry point
├── config/
│   └── config.js          # Configuration
└── .env                   # Environment variables
```

## Setup

### 1. Install Dependencies

```bash
cd crypto-arbitrage-bot
npm install
```

### 2. Configure Environment Variables

Run the setup script:

```bash
./setup.sh
```

Or manually create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# Exchange API Keys (get from exchange websites)
COINBASE_API_KEY=your_coinbase_api_key
COINBASE_API_SECRET=your_coinbase_api_secret

KRAKEN_API_KEY=your_kraken_api_key
KRAKEN_API_SECRET=your_kraken_api_secret

# Trading Configuration
MIN_PROFIT_THRESHOLD=0.5      # Minimum profit % to execute trade
TRADE_AMOUNT_USD=100          # Amount in USD per trade
DRY_RUN=true                  # Set to false for live trading

# Monitoring
LOG_LEVEL=info                # debug, info, warn, error
```

### 3. Get API Keys

**Coinbase:**
1. Go to https://www.coinbase.com/settings/api
2. Create new API key with trading permissions
3. Save the key and secret

**Kraken:**
1. Go to https://www.kraken.com/u/security/api
2. Generate new API key with trading permissions
3. Save the key and secret

⚠️ **Security Note:** Never commit your `.env` file or share your API keys!

## Usage

### Start the Bot (Dry Run)

By default, the bot runs in dry run mode (no actual trades):

```bash
npm start
```

### Start the Bot (Live Trading)

⚠️ **WARNING:** Live trading involves real money and risk!

1. Set `DRY_RUN=false` in your `.env` file
2. Start with small `TRADE_AMOUNT_USD` values
3. Run the bot:

```bash
npm start
```

### Development Mode (Auto-restart)

```bash
npm run dev
```

## How It Works

1. **Price Monitoring**: Connects to exchange WebSocket feeds to receive real-time price updates for BTC, ETH, and SOL
2. **Opportunity Detection**: Every 2 seconds, checks price spreads across exchanges
3. **Profit Calculation**: Calculates net profit after accounting for:
   - Trading fees (maker/taker)
   - Buy/sell price difference
   - Your configured minimum threshold
4. **Balance Verification**: Before executing, checks:
   - USD balance on buy exchange
   - Crypto balance on sell exchange
5. **Trade Execution**: If profitable opportunity found and balances sufficient:
   - Places market buy order on the exchange with lower price
   - Places market sell order on the exchange with higher price
   - Tracks order status and confirmation
   - Logs the transaction

## Configuration

Edit `config/config.js` or use environment variables to customize:

- **minProfitThreshold**: Minimum profit percentage (default: 0.5%)
- **tradeAmountUSD**: Trade size in USD (default: $100)
- **pairs**: Trading pairs to monitor (default: BTC-USD, ETH-USD, SOL-USD)
- **fees**: Exchange fee structure (updated from APIs)

## Example Output

```
[2024-01-15T10:30:45.123Z] [INFO] Initializing Arbitrage Bot...
[2024-01-15T10:30:45.456Z] [INFO] Components initialized
[2024-01-15T10:30:45.789Z] [INFO] Starting Arbitrage Bot...
[2024-01-15T10:30:45.790Z] [INFO] Mode: DRY RUN
[Coinbase] WebSocket connected
[Kraken] WebSocket connected

--- ARBITRAGE OPPORTUNITY DETECTED ---
Pair: BTC-USD
Buy on Kraken: $43,250.00 (with fee: $43,362.45)
Sell on Coinbase: $43,500.00 (with fee: $43,239.00)
Spread: 0.578%
Net Profit: 0.267%
Trade Amount: $100
Asset Amount: 0.002307
Gross Profit: $1.16
---------------------------------------

=== SIMULATED TRADE ===
1. BUY 0.002307 BTC-USD on Kraken
   Price: $43,250.00
   Total: $100

2. SELL 0.002307 BTC-USD on Coinbase
   Price: $43,500.00
   Revenue: $100.38

Expected Profit: $1.16 (0.267%)
=======================
```

## Risk Considerations

- **Transfer Time**: Fund transfers between exchanges take time (blockchain confirmations)
- **Price Movement**: Prices can change during trade execution
- **Fees**: Trading, withdrawal, and network fees reduce profits
- **Liquidity**: Large orders may not fill at expected prices
- **API Limits**: Rate limiting can delay trades
- **Capital Requirements**: Need funds on both exchanges simultaneously

## Mitigation Strategies

This bot addresses risks by:
- **Price Buffer**: Only trades when profit exceeds threshold (covers fees + slippage)
- **Small Trades**: Default $100 trades minimize exposure
- **Dry Run Mode**: Test strategies without risking capital
- **Real-time Monitoring**: Uses WebSockets for fastest price updates

## Future Enhancements

- [ ] Add more exchanges (Binance, Gemini, etc.)
- [ ] Implement authentication for actual order placement
- [ ] Add database for trade history
- [ ] Implement balance checking before trades
- [ ] Add triangular arbitrage (within single exchange)
- [ ] Web dashboard for monitoring
- [ ] Advanced risk management
- [ ] Backtesting framework

## Disclaimer

This software is for educational purposes. Cryptocurrency trading involves substantial risk of loss. The authors are not responsible for any financial losses. Always test thoroughly in dry run mode before live trading.

## License

MIT
