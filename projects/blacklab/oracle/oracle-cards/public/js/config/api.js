/**
 * API Configuration for Oracle Cards
 */

export const API_CONFIG = {
  baseURL: import.meta.env?.VITE_API_URL || 
           (window.location.hostname === 'localhost' 
             ? 'http://localhost:3002' 
             : 'https://your-api-url.com'),
  
  endpoints: {
    generateReading: '/api/reading/generate',
    quickInsight: '/api/reading/quick-insight',
    saveReading: '/api/reading/save',
    createCheckout: '/api/payment/create-checkout',
    health: '/api/health'
  },

  timeout: 30000
};

export class ApiClient {
  constructor() {
    this.baseURL = API_CONFIG.baseURL;
  }

  async generateReading(cards, question, spreadType, premium = false) {
    const response = await fetch(`${this.baseURL}${API_CONFIG.endpoints.generateReading}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ cards, question, spreadType, premium })
    });

    if (!response.ok) {
      throw new Error('Failed to generate reading');
    }

    return await response.json();
  }

  async getQuickInsight(card, question) {
    const response = await fetch(`${this.baseURL}${API_CONFIG.endpoints.quickInsight}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ card, question })
    });

    if (!response.ok) {
      throw new Error('Failed to generate insight');
    }

    return await response.json();
  }

  async saveReading(userId, reading) {
    const response = await fetch(`${this.baseURL}${API_CONFIG.endpoints.saveReading}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId, reading })
    });

    if (!response.ok) {
      throw new Error('Failed to save reading');
    }

    return await response.json();
  }

  async createCheckoutSession({ readingType, email, userId = null }) {
    const response = await fetch(`${this.baseURL}${API_CONFIG.endpoints.createCheckout}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ readingType, email, userId })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create checkout');
    }

    return await response.json();
  }

  async verifyPayment(sessionId) {
    const response = await fetch(`${this.baseURL}/api/payment/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sessionId })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to verify payment');
    }

    return await response.json();
  }

  async checkHealth() {
    const response = await fetch(`${this.baseURL}${API_CONFIG.endpoints.health}`);
    return await response.json();
  }
}

export const apiClient = new ApiClient();
