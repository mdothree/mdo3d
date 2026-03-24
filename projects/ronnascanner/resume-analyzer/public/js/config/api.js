/**
 * API Configuration
 * Points to external backend API server
 */

export const API_CONFIG = {
  // Development: localhost
  // Production: your deployed API URL
  baseURL: import.meta.env?.VITE_API_URL || 
           (window.location.hostname === 'localhost' 
             ? 'http://localhost:3001' 
             : 'https://your-api-url.com'),
  
  endpoints: {
    analyze: '/api/analyze',
    analyzePremium: '/api/analyze/premium',
    emailReport: '/api/email/report',
    createCheckout: '/api/payment/create-checkout',
    health: '/api/health'
  },

  timeout: 30000 // 30 seconds
};

export class ApiClient {
  constructor() {
    this.baseURL = API_CONFIG.baseURL;
  }

  async uploadAndAnalyze(file) {
    const formData = new FormData();
    formData.append('resume', file);

    const response = await fetch(`${this.baseURL}${API_CONFIG.endpoints.analyze}`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Analysis failed');
    }

    return await response.json();
  }

  async uploadAndAnalyzePremium(file, paymentId) {
    const formData = new FormData();
    formData.append('resume', file);
    formData.append('paymentId', paymentId);

    const response = await fetch(`${this.baseURL}${API_CONFIG.endpoints.analyzePremium}`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Premium analysis failed');
    }

    return await response.json();
  }

  async sendEmailReport(email, analysis) {
    const response = await fetch(`${this.baseURL}${API_CONFIG.endpoints.emailReport}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, analysis })
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }

    return await response.json();
  }

  async createCheckoutSession(userId, email, analysisId) {
    const response = await fetch(`${this.baseURL}${API_CONFIG.endpoints.createCheckout}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId, email, analysisId })
    });

    if (!response.ok) {
      throw new Error('Failed to create checkout');
    }

    return await response.json();
  }

  async checkHealth() {
    const response = await fetch(`${this.baseURL}${API_CONFIG.endpoints.health}`);
    return await response.json();
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
