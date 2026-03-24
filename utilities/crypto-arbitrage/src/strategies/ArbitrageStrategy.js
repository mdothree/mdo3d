export class ArbitrageStrategy {
  constructor(config, priceMonitor) {
    this.config = config;
    this.priceMonitor = priceMonitor;
    this.opportunities = [];
  }

  findOpportunities(pairs) {
    const spreads = this.priceMonitor.getAllSpreads(pairs);
    const opportunities = [];

    for (const spread of spreads) {
      const opportunity = this.evaluateSpread(spread);
      if (opportunity) {
        opportunities.push(opportunity);
      }
    }

    this.opportunities = opportunities;
    return opportunities;
  }

  evaluateSpread(spread) {
    const { pair, minExchange, minPrice, maxExchange, maxPrice, spreadPercent } = spread;

    // Calculate fees for buying at low exchange and selling at high exchange
    const buyExchange = minExchange;
    const sellExchange = maxExchange;
    
    const buyFee = this.config.trading.fees[buyExchange.toLowerCase()]?.taker || 0.006;
    const sellFee = this.config.trading.fees[sellExchange.toLowerCase()]?.taker || 0.006;
    
    // Calculate total cost including fees
    const buyPriceWithFee = minPrice * (1 + buyFee);
    const sellPriceWithFee = maxPrice * (1 - sellFee);
    
    // Calculate net profit percentage
    const netProfitPercent = ((sellPriceWithFee - buyPriceWithFee) / buyPriceWithFee) * 100;
    
    // Check if opportunity meets minimum threshold
    if (netProfitPercent >= this.config.trading.minProfitThreshold) {
      const tradeAmountUSD = this.config.trading.tradeAmountUSD;
      const assetAmount = tradeAmountUSD / buyPriceWithFee;
      const grossProfit = (sellPriceWithFee - buyPriceWithFee) * assetAmount;
      
      return {
        pair,
        buyExchange,
        buyPrice: minPrice,
        buyPriceWithFee,
        sellExchange,
        sellPrice: maxPrice,
        sellPriceWithFee,
        spreadPercent,
        netProfitPercent,
        tradeAmountUSD,
        assetAmount,
        grossProfit,
        timestamp: Date.now(),
        profitable: true
      };
    }

    return null;
  }

  getTopOpportunities(limit = 5) {
    return this.opportunities
      .sort((a, b) => b.netProfitPercent - a.netProfitPercent)
      .slice(0, limit);
  }

  logOpportunity(opportunity) {
    console.log('\n--- ARBITRAGE OPPORTUNITY DETECTED ---');
    console.log(`Pair: ${opportunity.pair}`);
    console.log(`Buy on ${opportunity.buyExchange}: $${opportunity.buyPrice.toFixed(2)} (with fee: $${opportunity.buyPriceWithFee.toFixed(2)})`);
    console.log(`Sell on ${opportunity.sellExchange}: $${opportunity.sellPrice.toFixed(2)} (with fee: $${opportunity.sellPriceWithFee.toFixed(2)})`);
    console.log(`Spread: ${opportunity.spreadPercent.toFixed(3)}%`);
    console.log(`Net Profit: ${opportunity.netProfitPercent.toFixed(3)}%`);
    console.log(`Trade Amount: $${opportunity.tradeAmountUSD}`);
    console.log(`Asset Amount: ${opportunity.assetAmount.toFixed(6)}`);
    console.log(`Gross Profit: $${opportunity.grossProfit.toFixed(2)}`);
    console.log('---------------------------------------\n');
  }
}
