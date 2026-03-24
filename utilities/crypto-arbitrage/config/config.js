import dotenv from 'dotenv';

dotenv.config();

export const config = {
  exchanges: {
    coinbase: {
      apiKey: process.env.COINBASE_API_KEY,
      apiSecret: process.env.COINBASE_API_SECRET,
      restUrl: 'https://api.coinbase.com',
      wsUrl: 'wss://ws-feed.exchange.coinbase.com'
    },
    kraken: {
      apiKey: process.env.KRAKEN_API_KEY,
      apiSecret: process.env.KRAKEN_API_SECRET,
      restUrl: 'https://api.kraken.com',
      wsUrl: 'wss://ws.kraken.com'
    }
  },
  
  trading: {
    // Minimum profit percentage to execute trade (accounts for fees + buffer)
    minProfitThreshold: parseFloat(process.env.MIN_PROFIT_THRESHOLD || '0.5'),
    
    // Trade amount in USD
    tradeAmountUSD: parseFloat(process.env.TRADE_AMOUNT_USD || '100'),
    
    // If true, only log opportunities without executing trades
    dryRun: process.env.DRY_RUN === 'true',
    
    // Trading pairs to monitor
    pairs: ['BTC-USD', 'ETH-USD', 'SOL-USD'],
    
    // Fee structure (approximate, will be updated from API)
    fees: {
      coinbase: {
        maker: 0.004, // 0.4%
        taker: 0.006  // 0.6%
      },
      kraken: {
        maker: 0.0016, // 0.16%
        taker: 0.0026  // 0.26%
      }
    }
  },
  
  monitoring: {
    logLevel: process.env.LOG_LEVEL || 'info',
    priceUpdateInterval: 1000, // ms
    opportunityCheckInterval: 2000 // ms
  }
};
