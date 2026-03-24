export class PriceMonitor {
  constructor(exchanges) {
    this.exchanges = exchanges; // Map of exchange name -> exchange instance
    this.priceHistory = new Map(); // Store price history for analysis
  }

  async start() {
    console.log('[PriceMonitor] Starting price monitoring...');
    
    // Connect to all exchanges
    const connectionPromises = Array.from(this.exchanges.values()).map(
      exchange => exchange.connect()
    );
    
    await Promise.all(connectionPromises);
    console.log('[PriceMonitor] All exchanges connected');
  }

  async stop() {
    console.log('[PriceMonitor] Stopping price monitoring...');
    
    const disconnectionPromises = Array.from(this.exchanges.values()).map(
      exchange => exchange.disconnect()
    );
    
    await Promise.all(disconnectionPromises);
    console.log('[PriceMonitor] All exchanges disconnected');
  }

  getPrices(pair) {
    const prices = {};
    
    for (const [name, exchange] of this.exchanges) {
      const priceData = exchange.getCachedPrice(pair);
      if (priceData) {
        prices[name] = {
          price: priceData.price,
          timestamp: priceData.timestamp,
          age: Date.now() - priceData.timestamp
        };
      }
    }
    
    return prices;
  }

  getSpread(pair) {
    const prices = this.getPrices(pair);
    const exchangeNames = Object.keys(prices);
    
    if (exchangeNames.length < 2) {
      return null;
    }

    let maxPrice = -Infinity;
    let minPrice = Infinity;
    let maxExchange = null;
    let minExchange = null;

    for (const [exchange, data] of Object.entries(prices)) {
      if (data.price > maxPrice) {
        maxPrice = data.price;
        maxExchange = exchange;
      }
      if (data.price < minPrice) {
        minPrice = data.price;
        minExchange = exchange;
      }
    }

    const spreadPercent = ((maxPrice - minPrice) / minPrice) * 100;

    return {
      pair,
      minExchange,
      minPrice,
      maxExchange,
      maxPrice,
      spread: maxPrice - minPrice,
      spreadPercent,
      timestamp: Date.now()
    };
  }

  getAllSpreads(pairs) {
    return pairs.map(pair => this.getSpread(pair)).filter(spread => spread !== null);
  }
}
