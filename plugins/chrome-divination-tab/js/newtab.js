/**
 * Mystic Tab - New Tab Page Logic
 */

// Affirmations database
const affirmations = [
  "I am aligned with my highest purpose.",
  "The universe supports my every step.",
  "I trust the journey of my soul.",
  "Divine timing is at work in my life.",
  "I am exactly where I need to be.",
  "My intuition guides me perfectly.",
  "I am open to receiving abundance.",
  "Love flows through me effortlessly.",
  "I release what no longer serves me.",
  "Every challenge is an opportunity for growth."
];

// Moon phases
const getMoonPhase = () => {
  const phases = ['🌑 New Moon', '🌒 Waxing Crescent', '🌓 First Quarter', '🌔 Waxing Gibbous', 
                  '🌕 Full Moon', '🌖 Waning Gibbous', '🌗 Last Quarter', '🌘 Waning Crescent'];
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  
  // Simple moon phase calculation (approximate)
  const c = year / 100;
  const e = 2 - Math.floor(c) + Math.floor(c / 4);
  const jd = Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 2)) + day + e - 1524.5;
  const daysSinceNew = (jd - 2451549.5) / 29.53;
  const phase = Math.floor((daysSinceNew - Math.floor(daysSinceNew)) * 8);
  
  return phases[phase] || phases[0];
};

// Update time and date
const updateDateTime = async () => {
  const now = new Date();
  const settings = await Storage.getSettings();
  
  const timeString = settings.show24Hour 
    ? now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    : now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  
  const dateString = now.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric',
    year: 'numeric'
  });
  
  document.getElementById('time').textContent = timeString;
  document.getElementById('date').textContent = dateString;
  
  if (settings.showMoonPhase) {
    document.getElementById('moonPhase').textContent = getMoonPhase();
    document.getElementById('moonPhase').style.display = 'block';
  } else {
    document.getElementById('moonPhase').style.display = 'none';
  }
};

// Get random affirmation
const getRandomAffirmation = () => {
  return affirmations[Math.floor(Math.random() * affirmations.length)];
};

// Get random card
const getRandomCard = () => {
  return oracleCards[Math.floor(Math.random() * oracleCards.length)];
};

// Display card
const displayCard = (card) => {
  document.getElementById('cardName').textContent = card.name;
  document.getElementById('cardKeywords').textContent = card.keywords.join(', ');
  document.getElementById('cardBrief').textContent = card.upright.brief;
  document.getElementById('cardMeaning').textContent = card.upright.meaning;
  document.getElementById('cardGuidance').textContent = card.upright.guidance;
  document.getElementById('cardElement').textContent = `Element: ${card.element}`;
  document.getElementById('cardTheme').textContent = `Theme: ${card.theme}`;
  
  // Flip animation
  document.getElementById('cardBack').classList.add('hidden');
  document.getElementById('cardFront').classList.remove('hidden');
};

// Draw daily card
const drawDailyCard = async () => {
  const canDraw = await Storage.canDrawDailyCard();
  const hasPremium = await Storage.hasPremium();
  
  if (!canDraw && !hasPremium) {
    // Show existing card
    const todaysCard = await Storage.getTodaysCard();
    if (todaysCard) {
      displayCard(todaysCard);
    }
    return;
  }
  
  const card = getRandomCard();
  displayCard(card);
  
  if (!hasPremium) {
    await Storage.markDailyCardDrawn();
    await Storage.saveTodaysCard(card);
  }
};

// Draw new card (premium only)
const drawNewCard = async () => {
  const hasPremium = await Storage.hasPremium();
  
  if (!hasPremium) {
    showPremiumModal();
    return;
  }
  
  const card = getRandomCard();
  displayCard(card);
};

// Show premium modal
const showPremiumModal = () => {
  document.getElementById('premiumModal').classList.remove('hidden');
};

// Hide premium modal
const hidePremiumModal = () => {
  document.getElementById('premiumModal').classList.add('hidden');
};

// Show settings modal
const showSettingsModal = () => {
  document.getElementById('settingsModal').classList.remove('hidden');
  loadSettings();
};

// Hide settings modal
const hideSettingsModal = () => {
  document.getElementById('settingsModal').classList.add('hidden');
};

// Load settings
const loadSettings = async () => {
  const settings = await Storage.getSettings();
  document.getElementById('show24Hour').checked = settings.show24Hour;
  document.getElementById('showMoonPhase').checked = settings.showMoonPhase;
  document.getElementById('showAffirmation').checked = settings.showAffirmation;
  document.getElementById('backgroundTheme').value = settings.backgroundTheme;
};

// Save settings
const saveSettings = async () => {
  const settings = {
    show24Hour: document.getElementById('show24Hour').checked,
    showMoonPhase: document.getElementById('showMoonPhase').checked,
    showAffirmation: document.getElementById('showAffirmation').checked,
    backgroundTheme: document.getElementById('backgroundTheme').value
  };
  
  await Storage.saveSettings(settings);
  updateDateTime();
  
  // Update affirmation visibility
  const affirmationBox = document.querySelector('.affirmation-box');
  affirmationBox.style.display = settings.showAffirmation ? 'block' : 'none';
};

// Handle search
const handleSearch = (query) => {
  if (!query) return;
  
  // Check if it's a URL
  if (query.startsWith('http://') || query.startsWith('https://') || query.includes('.')) {
    const url = query.startsWith('http') ? query : `https://${query}`;
    window.location.href = url;
  } else {
    // Search Google
    window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  }
};

// Initialize 3-card spread (premium)
const show3CardSpread = async () => {
  const hasPremium = await Storage.hasPremium();
  
  if (!hasPremium) {
    showPremiumModal();
    return;
  }
  
  // TODO: Implement 3-card spread UI
  alert('3-Card spread coming soon! For now, enjoy your daily card.');
};

// Handle premium purchase
const handlePremiumPurchase = async (plan) => {
  // For MVP: simulate purchase (in production, integrate Stripe)
  const confirmed = confirm(
    plan === 'lifetime' 
      ? 'Upgrade to Lifetime Premium for $19.99?' 
      : 'Subscribe to Monthly Premium for $4.99/month?'
  );
  
  if (confirmed) {
    // In production: redirect to payment page
    // For now: activate premium locally
    await Storage.activatePremium(plan);
    alert('✨ Premium activated! Enjoy unlimited card draws and more features.');
    hidePremiumModal();
    location.reload();
  }
};

// Initialize on page load
const init = async () => {
  // Update time immediately and every second
  updateDateTime();
  setInterval(updateDateTime, 1000);
  
  // Show affirmation
  const settings = await Storage.getSettings();
  const affirmationBox = document.querySelector('.affirmation-box');
  if (settings.showAffirmation) {
    document.getElementById('affirmation').textContent = getRandomAffirmation();
    affirmationBox.style.display = 'block';
  } else {
    affirmationBox.style.display = 'none';
  }
  
  // Check if there's a card for today
  const todaysCard = await Storage.getTodaysCard();
  if (todaysCard) {
    displayCard(todaysCard);
  }
  
  // Event listeners
  document.getElementById('cardBack').addEventListener('click', drawDailyCard);
  document.getElementById('drawCard').addEventListener('click', drawDailyCard);
  document.getElementById('newCard').addEventListener('click', drawNewCard);
  document.getElementById('threeCardBtn').addEventListener('click', show3CardSpread);
  
  // Modal controls
  document.getElementById('settingsBtn').addEventListener('click', showSettingsModal);
  document.getElementById('closeModal').addEventListener('click', hidePremiumModal);
  document.getElementById('closeSettings').addEventListener('click', hideSettingsModal);
  
  // Click outside to close modals
  document.getElementById('premiumModal').addEventListener('click', (e) => {
    if (e.target.id === 'premiumModal') hidePremiumModal();
  });
  document.getElementById('settingsModal').addEventListener('click', (e) => {
    if (e.target.id === 'settingsModal') hideSettingsModal();
  });
  
  // Premium purchase buttons
  document.querySelectorAll('[data-plan]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const plan = e.target.dataset.plan;
      handlePremiumPurchase(plan);
    });
  });
  
  // Settings changes
  document.querySelectorAll('#settingsModal input, #settingsModal select').forEach(input => {
    input.addEventListener('change', saveSettings);
  });
  
  // Reset data
  document.getElementById('resetData').addEventListener('click', async () => {
    if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
      await Storage.clearAll();
      location.reload();
    }
  });
  
  // Search
  document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleSearch(e.target.value);
    }
  });
};

// Start the app
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
