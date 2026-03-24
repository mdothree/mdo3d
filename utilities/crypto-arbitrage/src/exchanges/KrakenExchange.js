import WebSocket from 'ws';
import axios from 'axios';
import crypto from 'crypto';
import { BaseExchange } from './BaseExchange.js';

export class KrakenExchange extends BaseExchange {
  constructor(config) {
    super('Kraken', config);
    this.ws = null;
    this.restClient = axios.create({
      baseURL: config.restUrl
    });
    this.pairMapping = {
      'BTC-USD': 'XBT/USD',
      'ETH-USD': 'ETH/USD',
      'SOL-USD': 'SOL/USD'
    };
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.config.wsUrl);

      this.ws.on('open', () => {
        console.log(`[${this.name}] WebSocket connected`);
        
        // Subscribe to ticker for all pairs
        const krakenPairs = this.getPairs();
        const subscribeMessage = {
          event: 'subscribe',
          pair: krakenPairs,
          subscription: { name: 'ticker' }
        };
        
        this.ws.send(JSON.stringify(subscribeMessage));
        this.connected = true;
        resolve();
      });

      this.ws.on('message', (data) => {
        this.handleMessage(data);
      });

      this.ws.on('error', (error) => {
        console.error(`[${this.name}] WebSocket error:`, error.message);
        reject(error);
      });

      this.ws.on('close', () => {
        console.log(`[${this.name}] WebSocket disconnected`);
        this.connected = false;
      });
    });
  }

  async disconnect() {
    if (this.ws) {
      this.ws.close();
      this.connected = false;
    }
  }

  handleMessage(data) {
    try {
      const message = JSON.parse(data);
      
      // Kraken ticker messages are arrays
      if (Array.isArray(message) && message.length >= 2) {
        const tickerData = message[1];
        const krakenPair = message[3];
        
        if (tickerData && tickerData.c && tickerData.c[0]) {
          const price = parseFloat(tickerData.c[0]); // 'c' is the last trade closed array
          const standardPair = this.toStandardPair(krakenPair);
          this.updatePrice(standardPair, price);
        }
      }
    } catch (error) {
      console.error(`[${this.name}] Error parsing message:`, error.message);
    }
  }

  async getPrice(pair) {
    const cached = this.getCachedPrice(pair);
    if (cached && Date.now() - cached.timestamp < 5000) {
      return cached.price;
    }

    // Fallback to REST API
    try {
      const krakenPair = this.toKrakenPair(pair);
      const response = await this.restClient.get(`/0/public/Ticker?pair=${krakenPair}`);
      
      const result = response.data.result;
      const pairData = result[Object.keys(result)[0]];
      const price = parseFloat(pairData.c[0]);
      
      this.updatePrice(pair, price);
      return price;
    } catch (error) {
      console.error(`[${this.name}] Error fetching price for ${pair}:`, error.message);
      throw error;
    }
  }

  async placeBuyOrder(pair, amountUSD) {
    console.log(`[${this.name}] BUY order: ${pair} for $${amountUSD}`);
    
    // TODO: Implement actual order placement with authentication
    return {
      orderId: `kraken-${Date.now()}`,
      exchange: this.name,
      pair,
      side: 'buy',
      amount: amountUSD,
      timestamp: Date.now()
    };
  }

  async placeSellOrder(pair, amount) {
    console.log(`[${this.name}] SELL order: ${amount} ${pair}`);
    
    // TODO: Implement actual order placement with authentication
    return {
      orderId: `kraken-${Date.now()}`,
      exchange: this.name,
      pair,
      side: 'sell',
      amount,
      timestamp: Date.now()
    };
  }

  async getBalance(currency) {
    // TODO: Implement balance fetching with authentication
    console.log(`[${this.name}] Fetching balance for ${currency}`);
    return 0;
  }

  toKrakenPair(standardPair) {
    return this.pairMapping[standardPair] || standardPair;
  }

  toStandardPair(krakenPair) {
    const reversed = Object.fromEntries(
      Object.entries(this.pairMapping).map(([k, v]) => [v, k])
    );
    return reversed[krakenPair] || krakenPair;
  }

  getPairs() {
    return Object.values(this.pairMapping);
  }
}
