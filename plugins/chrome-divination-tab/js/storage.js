/**
 * Chrome Storage Utilities
 */

const Storage = {
  /**
   * Get data from Chrome storage
   */
  async get(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key]);
      });
    });
  },

  /**
   * Set data in Chrome storage
   */
  async set(key, value) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => {
        resolve();
      });
    });
  },

  /**
   * Check if user can draw daily card
   */
  async canDrawDailyCard() {
    const lastDraw = await this.get('lastDailyDraw');
    const today = new Date().toDateString();
    
    if (!lastDraw || lastDraw !== today) {
      return true;
    }
    
    return false;
  },

  /**
   * Mark daily card as drawn
   */
  async markDailyCardDrawn() {
    const today = new Date().toDateString();
    await this.set('lastDailyDraw', today);
  },

  /**
   * Get today's card (if already drawn)
   */
  async getTodaysCard() {
    const lastDraw = await this.get('lastDailyDraw');
    const today = new Date().toDateString();
    
    if (lastDraw === today) {
      return await this.get('todaysCard');
    }
    
    return null;
  },

  /**
   * Save today's card
   */
  async saveTodaysCard(card) {
    await this.set('todaysCard', card);
  },

  /**
   * Check if user has premium access
   */
  async hasPremium() {
    const premium = await this.get('premiumAccess');
    return premium?.active === true;
  },

  /**
   * Activate premium
   */
  async activatePremium(plan) {
    await this.set('premiumAccess', {
      active: true,
      plan: plan,
      activatedAt: Date.now()
    });
  },

  /**
   * Get settings
   */
  async getSettings() {
    const settings = await this.get('settings');
    return settings || {
      show24Hour: false,
      showMoonPhase: true,
      showAffirmation: true,
      backgroundTheme: 'stars'
    };
  },

  /**
   * Save settings
   */
  async saveSettings(settings) {
    await this.set('settings', settings);
  },

  /**
   * Clear all data
   */
  async clearAll() {
    return new Promise((resolve) => {
      chrome.storage.local.clear(() => {
        resolve();
      });
    });
  }
};
