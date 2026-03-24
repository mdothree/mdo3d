import { config } from './config/config.js';
import { CoinbaseExchange } from './exchanges/CoinbaseExchange.js';
import { KrakenExchange } from './exchanges/KrakenExchange.js';
import { PriceMonitor } from './monitors/PriceMonitor.js';
import { ArbitrageStrategy } from './strategies/ArbitrageStrategy.js';
import { TradeExecutor } from './strategies/TradeExecutor.js';
import { Logger } from './utils/Logger.js';

class ArbitrageBot {
  constructor() {
    this.logger = new Logger(config.monitoring.logLevel);
    this.exchanges = new Map();
    this.priceMonitor = null;
    this.strategy = null;
    this.executor = null;
    this.monitoringInterval = null;
  }

  async initialize() {
    this.logger.info('Initializing Arbitrage Bot...');
    
    // Initialize exchanges
    const coinbase = new CoinbaseExchange(config.exchanges.coinbase);
    const kraken = new KrakenExchange(config.exchanges.kraken);
    
    this.exchanges.set('Coinbase', coinbase);
    this.exchanges.set('Kraken', kraken);
    
    // Initialize components
    this.priceMonitor = new PriceMonitor(this.exchanges);
    this.strategy = new ArbitrageStrategy(config, this.priceMonitor);
    this.executor = new TradeExecutor(config, this.exchanges);
    
    this.logger.info('Components initialized');
  }

  async start() {
    this.logger.info('Starting Arbitrage Bot...');
    this.logger.info(`Mode: ${config.trading.dryRun ? 'DRY RUN' : 'LIVE TRADING'}`);
    this.logger.info(`Min Profit Threshold: ${config.trading.minProfitThreshold}%`);
    this.logger.info(`Trade Amount: $${config.trading.tradeAmountUSD}`);
    
    // Connect to exchanges
    await this.priceMonitor.start();
    
    // Wait a bit for initial price data
    await this.sleep(3000);
    
    // Start monitoring loop
    this.startMonitoring();
    
    this.logger.info('Bot is running. Press Ctrl+C to stop.');
  }

  startMonitoring() {
    const checkInterval = config.monitoring.opportunityCheckInterval;
    
    this.monitoringInterval = setInterval(() => {
      this.checkOpportunities();
    }, checkInterval);
  }

  async checkOpportunities() {
    try {
      const pairs = config.trading.pairs;
      const opportunities = this.strategy.findOpportunities(pairs);
      
      if (opportunities.length > 0) {
        this.logger.info(`Found ${opportunities.length} arbitrage opportunity(ies)`);
        
        for (const opportunity of opportunities) {
          this.strategy.logOpportunity(opportunity);
          
          // Execute trade (or simulate if in dry run mode)
          await this.executor.executeTrade(opportunity);
        }
      } else {
        // Log current spreads for monitoring
        const spreads = this.priceMonitor.getAllSpreads(pairs);
        this.logSpreads(spreads);
      }
    } catch (error) {
      this.logger.error('Error checking opportunities:', error.message);
    }
  }

  logSpreads(spreads) {
    console.log(`\n[${new Date().toLocaleTimeString()}] Current Market Spreads:`);
    
    for (const spread of spreads) {
      if (spread) {
        console.log(
          `  ${spread.pair}: ${spread.minExchange} $${spread.minPrice?.toFixed(2)} -> ` +
          `${spread.maxExchange} $${spread.maxPrice?.toFixed(2)} ` +
          `(${spread.spreadPercent?.toFixed(3)}%)`
        );
      }
    }
  }

  async stop() {
    this.logger.info('Stopping Arbitrage Bot...');
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    await this.priceMonitor.stop();
    
    // Print final stats
    const stats = this.executor.getTradeStats();
    console.log('\n=== FINAL STATISTICS ===');
    console.log(`Total Trades: ${stats.totalTrades}`);
    console.log(`Executed: ${stats.executed}`);
    console.log(`Simulated: ${stats.simulated}`);
    console.log(`Failed: ${stats.failed}`);
    console.log(`Total Profit: $${stats.totalProfit.toFixed(2)}`);
    console.log('========================\n');
    
    this.logger.info('Bot stopped');
    process.exit(0);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution
const bot = new ArbitrageBot();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  await bot.stop();
});

process.on('SIGTERM', async () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  await bot.stop();
});

// Start the bot
(async () => {
  try {
    await bot.initialize();
    await bot.start();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
})();
