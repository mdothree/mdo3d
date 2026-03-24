import WebSocket from 'ws';
import axios from 'axios';
import crypto from 'crypto';
import { BaseExchange } from './BaseExchange.js';
import { CoinbaseAuth } from '../utils/CoinbaseAuth.js';

export class CoinbaseExchange extends BaseExchange {
  constructor(config) {
    super('Coinbase', config);
    this.ws = null;
    this.auth = new CoinbaseAuth(config.apiKey, config.apiSecret);
    this.restClient = axios.create({
      baseURL: config.restUrl
    });
    this.balances = new Map(); // Cache balances
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.config.wsUrl);

      this.ws.on('open', () => {
        console.log(`[${this.name}] WebSocket connected`);
        
        // Subscribe to ticker for all configured pairs
        const subscribeMessage = {
          type: 'subscribe',
          channels: [{
            name: 'ticker',
            product_ids: this.getPairs()
          }]
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
      
      if (message.type === 'ticker' && message.price) {
        const pair = message.product_id;
        const price = parseFloat(message.price);
        this.updatePrice(pair, price);
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

    // Fallback to REST API if no cached price
    try {
      const response = await this.restClient.get(`/api/v3/brokerage/products/${pair}/ticker`);
      const price = parseFloat(response.data.price);
      this.updatePrice(pair, price);
      return price;
    } catch (error) {
      console.error(`[${this.name}] Error fetching price for ${pair}:`, error.message);
      throw error;
    }
  }

  async placeBuyOrder(pair, amountUSD) {
    if (!this.auth.isConfigured()) {
      console.warn(`[${this.name}] API credentials not configured - using mock order`);
      return {
        orderId: `coinbase-mock-${Date.now()}`,
        exchange: this.name,
        pair,
        side: 'buy',
        amount: amountUSD,
        timestamp: Date.now(),
        status: 'mock'
      };
    }

    try {
      const requestPath = '/api/v3/brokerage/orders';
      const orderConfig = {
        product_id: pair,
        side: 'buy',
        order_configuration: {
          market_market_ioc: {
            quote_size: amountUSD.toString()
          }
        }
      };

      const headers = this.auth.generateHeaders('POST', requestPath, orderConfig);
      
      console.log(`[${this.name}] Placing BUY order: ${pair} for $${amountUSD}`);
      
      const response = await this.restClient.post(requestPath, orderConfig, { headers });
      
      console.log(`[${this.name}] Order placed successfully:`, response.data.order_id);
      
      return {
        orderId: response.data.order_id,
        exchange: this.name,
        pair,
        side: 'buy',
        amount: amountUSD,
        timestamp: Date.now(),
        status: 'placed',
        raw: response.data
      };
    } catch (error) {
      console.error(`[${this.name}] Error placing buy order:`, error.response?.data || error.message);
      throw error;
    }
  }

  async placeSellOrder(pair, amount) {
    if (!this.auth.isConfigured()) {
      console.warn(`[${this.name}] API credentials not configured - using mock order`);
      return {
        orderId: `coinbase-mock-${Date.now()}`,
        exchange: this.name,
        pair,
        side: 'sell',
        amount,
        timestamp: Date.now(),
        status: 'mock'
      };
    }

    try {
      const requestPath = '/api/v3/brokerage/orders';
      const [base] = pair.split('-'); // e.g., BTC from BTC-USD
      
      const orderConfig = {
        product_id: pair,
        side: 'sell',
        order_configuration: {
          market_market_ioc: {
            base_size: amount.toString()
          }
        }
      };

      const headers = this.auth.generateHeaders('POST', requestPath, orderConfig);
      
      console.log(`[${this.name}] Placing SELL order: ${amount} ${base} (${pair})`);
      
      const response = await this.restClient.post(requestPath, orderConfig, { headers });
      
      console.log(`[${this.name}] Order placed successfully:`, response.data.order_id);
      
      return {
        orderId: response.data.order_id,
        exchange: this.name,
        pair,
        side: 'sell',
        amount,
        timestamp: Date.now(),
        status: 'placed',
        raw: response.data
      };
    } catch (error) {
      console.error(`[${this.name}] Error placing sell order:`, error.response?.data || error.message);
      throw error;
    }
  }

  async getBalance(currency) {
    if (!this.auth.isConfigured()) {
      console.warn(`[${this.name}] API credentials not configured - returning 0 balance`);
      return 0;
    }

    try {
      const requestPath = '/api/v3/brokerage/accounts';
      const headers = this.auth.generateHeaders('GET', requestPath);
      
      const response = await this.restClient.get(requestPath, { headers });
      
      // Find the account for the specified currency
      const account = response.data.accounts.find(
        acc => acc.currency === currency && acc.available_balance
      );
      
      if (account) {
        const balance = parseFloat(account.available_balance.value);
        this.balances.set(currency, {
          balance,
          timestamp: Date.now()
        });
        return balance;
      }
      
      return 0;
    } catch (error) {
      console.error(`[${this.name}] Error fetching balance for ${currency}:`, error.response?.data || error.message);
      return 0;
    }
  }

  async getAllBalances() {
    if (!this.auth.isConfigured()) {
      console.warn(`[${this.name}] API credentials not configured`);
      return {};
    }

    try {
      const requestPath = '/api/v3/brokerage/accounts';
      const headers = this.auth.generateHeaders('GET', requestPath);
      
      const response = await this.restClient.get(requestPath, { headers });
      
      const balances = {};
      response.data.accounts.forEach(account => {
        if (account.available_balance) {
          const balance = parseFloat(account.available_balance.value);
          if (balance > 0) {
            balances[account.currency] = balance;
            this.balances.set(account.currency, {
              balance,
              timestamp: Date.now()
            });
          }
        }
      });
      
      return balances;
    } catch (error) {
      console.error(`[${this.name}] Error fetching all balances:`, error.response?.data || error.message);
      return {};
    }
  }

  async getOrderStatus(orderId) {
    if (!this.auth.isConfigured()) {
      console.warn(`[${this.name}] API credentials not configured`);
      return null;
    }

    try {
      const requestPath = `/api/v3/brokerage/orders/historical/${orderId}`;
      const headers = this.auth.generateHeaders('GET', requestPath);
      
      const response = await this.restClient.get(requestPath, { headers });
      
      return {
        orderId,
        status: response.data.order.status,
        filledSize: response.data.order.filled_size,
        averagePrice: response.data.order.average_filled_price,
        raw: response.data
      };
    } catch (error) {
      console.error(`[${this.name}] Error fetching order status:`, error.response?.data || error.message);
      return null;
    }
  }

  getPairs() {
    // Convert pairs to Coinbase format if needed
    return ['BTC-USD', 'ETH-USD', 'SOL-USD'];
  }
}
