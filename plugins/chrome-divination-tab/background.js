/**
 * Background Service Worker
 * Handles extension lifecycle and background tasks
 */

// Installation handler
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Mystic Tab installed! ✨');
    
    // Set default settings
    chrome.storage.local.set({
      settings: {
        show24Hour: false,
        showMoonPhase: true,
        showAffirmation: true,
        backgroundTheme: 'stars'
      },
      premiumAccess: {
        active: false
      }
    });
    
    // Open welcome page (optional)
    // chrome.tabs.create({ url: 'welcome.html' });
  } else if (details.reason === 'update') {
    console.log('Mystic Tab updated!');
  }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkPremium') {
    chrome.storage.local.get(['premiumAccess'], (result) => {
      sendResponse({ hasPremium: result.premiumAccess?.active === true });
    });
    return true; // Keep message channel open for async response
  }
});

// Daily reset check (runs when browser starts)
chrome.runtime.onStartup.addListener(() => {
  console.log('Browser started - checking daily reset');
  // Daily card reset is handled in storage.js
});
