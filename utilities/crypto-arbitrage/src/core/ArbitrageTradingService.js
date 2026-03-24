/**
 * ArbitrageTradingService - Core programmatic trading service
 * 
 * This is the "program" - a service that can be called to execute arbitrage trades.
 * It doesn't make autonomous decisions; it exposes methods for execution.
 */

import { CoinbaseExchange } from '../exchanges/CoinbaseExchange.js';
import { KrakenExchange } from '../exchanges/KrakenExchange.js';
import { PriceMonitor } from '../monitors/PriceMonitor.js';
import { ArbitrageStrategy } from '../strategies/ArbitrageStrategy.js';
import { TradeExecutor } from '../strategies/TradeExecutor.js';

export class ArbitrageTradingService {
  constructor(config) {
    this.config = config;
    this.exchanges = new Map();
    this.priceMonitor = null;
    this.strategy = null;
    this.executor = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) {
      return { success: true, message: 'Already initialized' };
    }

    // Initialize exchanges
    const coinbase = new CoinbaseExchange(this.config.exchanges.coinbase);
    const kraken = new KrakenExchange(this.config.exchanges.kraken);
    
    this.exchanges.set('Coinbase', coinbase);
    this.exchanges.set('Kraken', kraken);
    
    // Initialize components
    this.priceMonitor = new PriceMonitor(this.exchanges);
    this.strategy = new ArbitrageStrategy(this.config, this.priceMonitor);
    this.executor = new TradeExecutor(this.config, this.exchanges);
    
    // Connect to exchanges
    await this.priceMonitor.start();
    
    this.initialized = true;
    
    return {
      success: true,
      message: 'Trading service initialized',
      exchanges: Array.from(this.exchanges.keys())
    };
  }

  async shutdown() {
    if (!this.initialized) {
      return { success: true, message: 'Not initialized' };
    }

    await this.priceMonitor.stop();
    this.initialized = false;
    
    return {
      success: true,
      message: 'Trading service shut down'
    };
  }

  // Get current market data
  getMarketSnapshot(pairs) {
    if (!this.initialized) {
      return { success: false, error: 'Service not initialized' };
    }

    const spreads = this.priceMonitor.getAllSpreads(pairs);
    
    return {
      success: true,
      timestamp: Date.now(),
      spreads: spreads.map(s => ({
        pair: s.pair,
        exchanges: {
          [s.minExchange]: { price: s.minPrice, side: 'buy' },
          [s.maxExchange]: { price: s.maxPrice, side: 'sell' }
        },
        spread: s.spread,
        spreadPercent: s.spreadPercent
      }))
    };
  }

  // Scan for opportunities
  scanForOpportunities(pairs) {
    if (!this.initialized) {
      return { success: false, error: 'Service not initialized' };
    }

    const opportunities = this.strategy.findOpportunities(pairs);
    
    return {
      success: true,
      timestamp: Date.now(),
      count: opportunities.length,
      opportunities: opportunities.map(opp => ({
        id: `${opp.pair}-${Date.now()}`,
        pair: opp.pair,
        action: {
          buy: {
            exchange: opp.buyExchange,
            price: opp.buyPrice,
            priceWithFee: opp.buyPriceWithFee
          },
          sell: {
            exchange: opp.sellExchange,
            price: opp.sellPrice,
            priceWithFee: opp.sellPriceWithFee
          }
        },
        metrics: {
          spreadPercent: opp.spreadPercent,
          netProfitPercent: opp.netProfitPercent,
          estimatedProfit: opp.grossProfit,
          tradeAmount: opp.tradeAmountUSD
        },
        timestamp: opp.timestamp
      }))
    };
  }

  // Execute a specific trade
  async executeTrade(opportunity) {
    if (!this.initialized) {
      return { success: false, error: 'Service not initialized' };
    }

    try {
      const result = await this.executor.executeTrade(opportunity);
      
      return {
        success: true,
        trade: {
          id: result.orderId || `trade-${Date.now()}`,
          status: result.status,
          pair: result.pair,
          buyExchange: result.buyExchange,
          sellExchange: result.sellExchange,
          profit: result.grossProfit,
          executedAt: result.executedAt
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get service statistics
  getStatistics() {
    if (!this.initialized) {
      return { success: false, error: 'Service not initialized' };
    }

    const stats = this.executor.getTradeStats();
    
    return {
      success: true,
      stats: {
        totalTrades: stats.totalTrades,
        executed: stats.executed,
        simulated: stats.simulated,
        failed: stats.failed,
        totalProfit: stats.totalProfit
      }
    };
  }

  // Get service health
  getHealth() {
    return {
      success: true,
      healthy: this.initialized,
      exchanges: Array.from(this.exchanges.entries()).map(([name, exchange]) => ({
        name,
        connected: exchange.isConnected()
      }))
    };
  }
}
