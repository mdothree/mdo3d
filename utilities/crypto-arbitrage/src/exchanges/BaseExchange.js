export class BaseExchange {
  constructor(name, config) {
    this.name = name;
    this.config = config;
    this.prices = new Map(); // Store latest prices for each pair
    this.connected = false;
  }

  // To be implemented by specific exchanges
  async connect() {
    throw new Error('connect() must be implemented');
  }

  async disconnect() {
    throw new Error('disconnect() must be implemented');
  }

  async getPrice(pair) {
    throw new Error('getPrice() must be implemented');
  }

  async placeBuyOrder(pair, amount) {
    throw new Error('placeBuyOrder() must be implemented');
  }

  async placeSellOrder(pair, amount) {
    throw new Error('placeSellOrder() must be implemented');
  }

  async getBalance(currency) {
    throw new Error('getBalance() must be implemented');
  }

  // Common helper methods
  updatePrice(pair, price) {
    this.prices.set(pair, {
      price,
      timestamp: Date.now()
    });
  }

  getCachedPrice(pair) {
    return this.prices.get(pair);
  }

  isConnected() {
    return this.connected;
  }
}
