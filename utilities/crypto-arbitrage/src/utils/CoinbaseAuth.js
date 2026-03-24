import crypto from 'crypto';

/**
 * Coinbase Advanced Trade API Authentication
 * Uses API key and secret to sign requests
 */
export class CoinbaseAuth {
  constructor(apiKey, apiSecret) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  /**
   * Generate authentication headers for Coinbase Advanced Trade API
   * @param {string} method - HTTP method (GET, POST, etc.)
   * @param {string} requestPath - API endpoint path
   * @param {object} body - Request body (for POST/PUT)
   * @returns {object} Headers object with authentication
   */
  generateHeaders(method, requestPath, body = '') {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const bodyString = body ? JSON.stringify(body) : '';
    
    // Create the prehash string (timestamp + method + requestPath + body)
    const message = timestamp + method + requestPath + bodyString;
    
    // Create signature using HMAC SHA256
    const signature = crypto
      .createHmac('sha256', this.apiSecret)
      .update(message)
      .digest('hex');

    return {
      'CB-ACCESS-KEY': this.apiKey,
      'CB-ACCESS-SIGN': signature,
      'CB-ACCESS-TIMESTAMP': timestamp,
      'Content-Type': 'application/json',
      'User-Agent': 'crypto-arbitrage-bot/1.0'
    };
  }

  /**
   * Check if API credentials are configured
   * @returns {boolean}
   */
  isConfigured() {
    return Boolean(
      this.apiKey && 
      this.apiSecret && 
      this.apiKey !== 'your_coinbase_api_key' &&
      this.apiSecret !== 'your_coinbase_api_secret'
    );
  }
}
