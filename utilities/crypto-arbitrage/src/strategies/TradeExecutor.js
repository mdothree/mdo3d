export class TradeExecutor {
  constructor(config, exchanges) {
    this.config = config;
    this.exchanges = exchanges;
    this.tradeHistory = [];
  }

  async executeTrade(opportunity) {
    const { 
      pair, 
      buyExchange, 
      sellExchange, 
      tradeAmountUSD, 
      assetAmount,
      buyPrice,
      sellPrice 
    } = opportunity;

    console.log(`\n[TradeExecutor] Executing arbitrage trade for ${pair}`);
    
    if (this.config.trading.dryRun) {
      console.log('[TradeExecutor] DRY RUN MODE - No actual trades executed');
      this.logSimulatedTrade(opportunity);
      return this.createTradeRecord(opportunity, 'simulated');
    }

    try {
      // Pre-flight checks: Verify balances
      const [base, quote] = pair.split('-'); // e.g., BTC-USD -> [BTC, USD]
      
      console.log(`[TradeExecutor] Checking balances...`);
      
      // Check USD balance on buy exchange
      const buyExchangeObj = this.exchanges.get(buyExchange);
      const usdBalance = await buyExchangeObj.getBalance(quote);
      
      if (usdBalance < tradeAmountUSD) {
        throw new Error(
          `Insufficient ${quote} balance on ${buyExchange}: ` +
          `${usdBalance.toFixed(2)} < ${tradeAmountUSD.toFixed(2)}`
        );
      }
      
      // Check crypto balance on sell exchange
      const sellExchangeObj = this.exchanges.get(sellExchange);
      const cryptoBalance = await sellExchangeObj.getBalance(base);
      
      if (cryptoBalance < assetAmount) {
        throw new Error(
          `Insufficient ${base} balance on ${sellExchange}: ` +
          `${cryptoBalance.toFixed(6)} < ${assetAmount.toFixed(6)}`
        );
      }
      
      console.log(`[TradeExecutor] Balance checks passed`);
      console.log(`  ${buyExchange} ${quote}: $${usdBalance.toFixed(2)}`);
      console.log(`  ${sellExchange} ${base}: ${cryptoBalance.toFixed(6)}`);
      
      // Step 1: Place buy order on the exchange with lower price
      console.log(`[TradeExecutor] Placing BUY order on ${buyExchange}...`);
      const buyOrder = await buyExchangeObj.placeBuyOrder(pair, tradeAmountUSD);
      
      // Step 2: Place sell order on the exchange with higher price
      console.log(`[TradeExecutor] Placing SELL order on ${sellExchange}...`);
      const sellOrder = await sellExchangeObj.placeSellOrder(pair, assetAmount);
      
      const tradeRecord = {
        ...opportunity,
        buyOrder,
        sellOrder,
        status: 'executed',
        executedAt: Date.now()
      };

      this.tradeHistory.push(tradeRecord);
      console.log('[TradeExecutor] Trade executed successfully!');
      
      return tradeRecord;
      
    } catch (error) {
      console.error('[TradeExecutor] Error executing trade:', error.message);
      
      const tradeRecord = {
        ...opportunity,
        status: 'failed',
        error: error.message,
        executedAt: Date.now()
      };
      
      this.tradeHistory.push(tradeRecord);
      return tradeRecord;
    }
  }

  logSimulatedTrade(opportunity) {
    console.log('\n=== SIMULATED TRADE ===');
    console.log(`1. BUY ${opportunity.assetAmount.toFixed(6)} ${opportunity.pair} on ${opportunity.buyExchange}`);
    console.log(`   Price: $${opportunity.buyPrice.toFixed(2)}`);
    console.log(`   Total: $${opportunity.tradeAmountUSD}`);
    console.log('');
    console.log(`2. SELL ${opportunity.assetAmount.toFixed(6)} ${opportunity.pair} on ${opportunity.sellExchange}`);
    console.log(`   Price: $${opportunity.sellPrice.toFixed(2)}`);
    console.log(`   Revenue: $${(opportunity.assetAmount * opportunity.sellPrice).toFixed(2)}`);
    console.log('');
    console.log(`Expected Profit: $${opportunity.grossProfit.toFixed(2)} (${opportunity.netProfitPercent.toFixed(3)}%)`);
    console.log('=======================\n');
  }

  createTradeRecord(opportunity, status) {
    const record = {
      ...opportunity,
      status,
      executedAt: Date.now()
    };
    
    this.tradeHistory.push(record);
    return record;
  }

  getTradeHistory() {
    return this.tradeHistory;
  }

  getTotalProfit() {
    return this.tradeHistory
      .filter(trade => trade.status === 'executed' || trade.status === 'simulated')
      .reduce((sum, trade) => sum + trade.grossProfit, 0);
  }

  getTradeStats() {
    const executed = this.tradeHistory.filter(t => t.status === 'executed').length;
    const simulated = this.tradeHistory.filter(t => t.status === 'simulated').length;
    const failed = this.tradeHistory.filter(t => t.status === 'failed').length;
    
    return {
      totalTrades: this.tradeHistory.length,
      executed,
      simulated,
      failed,
      totalProfit: this.getTotalProfit()
    };
  }
}
