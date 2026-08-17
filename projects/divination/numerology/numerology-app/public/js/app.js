import { firebaseConfig } from './config/firebase.js';
import {
  getAllNumbers,
  getLifePathMeaning,
  calculateLifePathNumber
} from './services/database.js';

// API Configuration
const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3010'
  : 'https://numerology-api.vercel.app';

let currentNumbers = null;
let isPremium = false;

const elements = {
  nameInput: document.getElementById('name-input'),
  birthDateInput: document.getElementById('birth-date'),
  calculateBtn: document.getElementById('calculate-btn'),
  resetBtn: document.getElementById('reset-btn'),
  newReadingBtn: document.getElementById('new-reading-btn'),
  numbersDisplay: document.getElementById('numbers-display'),
  numbersResult: document.getElementById('numbers-result'),
  readingSection: document.getElementById('reading-section'),
  numberMeanings: document.getElementById('number-meanings'),
  shareBtn: document.getElementById('share-btn'),
  upgradeBtn: document.getElementById('upgrade-btn'),
  premiumModal: document.getElementById('premium-modal'),
  modalOverlay: document.getElementById('modal-overlay'),
  modalClose: document.getElementById('modal-close'),
  modalSkip: document.getElementById('modal-skip')
};

async function init() {
  await firebaseConfig.initialize();
  const status = await firebaseConfig.getPremiumStatus();
  isPremium = status?.isPremium ?? false;
  setupEventListeners();
}

function setupEventListeners() {
  elements.calculateBtn?.addEventListener('click', calculateNumbers);
  elements.resetBtn?.addEventListener('click', reset);
  elements.newReadingBtn?.addEventListener('click', reset);
  elements.shareBtn?.addEventListener('click', shareReading);
  elements.upgradeBtn?.addEventListener('click', showPremiumModal);

  elements.modalOverlay?.addEventListener('click', hidePremiumModal);
  elements.modalClose?.addEventListener('click', hidePremiumModal);
  elements.modalSkip?.addEventListener('click', hidePremiumModal);
  document.querySelector('#premium-modal .premium-btn')?.addEventListener('click', handlePremiumPurchase);

  // Enter key support
  elements.nameInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') calculateNumbers();
  });
  elements.birthDateInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') calculateNumbers();
  });
}

async function handlePremiumPurchase() {
  // A verified purchase (recorded by success.html) unlocks — no second charge.
  if (window.PremiumEntitlement?.has()) {
    isPremium = true;
    hidePremiumModal();
    await deliverPremiumReading();
    return;
  }
  const email = prompt('Enter your email to receive your premium reading:');
  if (!email) return;
  try {
    const response = await fetch(`${API_URL}/api/payment/create-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ readingType: 'core-numbers', email })
    });
    const data = await response.json();
    if (data.success && data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
    } else {
      alert('Unable to process payment. Please try again.');
    }
  } catch (error) {
    console.error('Payment error:', error);
    alert('Payment error. Please try again.');
  }
}

async function deliverPremiumReading() {
  const target = document.getElementById('number-meanings');
  if (!target || !currentNumbers) return;
  const esc = (s) => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const banner = document.createElement('div');
  banner.className = 'premium-reading-block';
  banner.innerHTML = '<p>🔢 Channeling your full AI numerology reading...</p>';
  target.prepend(banner);
  try {
    const res = await fetch(`${API_URL}/api/reading/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: currentNumbers.name,
        birthDate: currentNumbers.birthDate,
        question: 'What do my numbers reveal about my life purpose and potential?',
        premium: true,
        sessionId: window.PremiumEntitlement?.activeSessionId()
      })
    });
    const data = await res.json();
    const r = data.reading || data;
    if (!r || !r.lifePathAnalysis) throw new Error('Empty reading');
    window.PremiumEntitlement?.consume();

    const section = (title, body) => body ? `<div class="reading-section"><h3>${title}</h3>${body}</div>` : '';
    const list = (arr) => Array.isArray(arr) && arr.length ? `<ul>${arr.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
    const numBlock = (label, o) => {
      if (!o || typeof o !== 'object') return '';
      return section(`${esc(label)}${o.number != null ? ' — ' + esc(o.number) : ''}${o.title ? ': ' + esc(o.title) : ''}`,
        `${o.meaning ? `<p>${esc(o.meaning)}</p>` : ''}${list(o.strengths || o.talents)}${o.lifePurpose ? `<p><strong>Life Purpose:</strong> ${esc(o.lifePurpose)}</p>` : ''}`);
    };
    banner.innerHTML = `
      <div class="premium-badge">✨ Your Personalized AI Reading</div>
      ${numBlock('Life Path', r.lifePathAnalysis)}
      ${numBlock('Expression Number', r.expressionNumber)}
      ${numBlock('Soul Urge', r.soulUrge)}
      ${numBlock('Personality', r.personalityNumber)}
      ${section('Synthesis', r.synthesis ? `<p>${esc(r.synthesis)}</p>` : '')}
      ${section('Current Cycle', r.currentCycle ? `<p>${esc(r.currentCycle)}</p>` : '')}
      ${section('Guidance', list(r.guidance))}
    `;
  } catch (e) {
    console.error('Premium reading error:', e);
    banner.innerHTML = '<p>Your purchase is confirmed, but the reading service is momentarily unavailable. Please try again shortly — you will not be charged again.</p>';
    // keep the entitlement so the reading can be retried
  }
}

function showPremiumModal() {
  if (elements.premiumModal) {
    elements.premiumModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function hidePremiumModal() {
  if (elements.premiumModal) {
    elements.premiumModal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function calculateNumbers() {
  const name = elements.nameInput?.value.trim();
  const birthDate = elements.birthDateInput?.value;

  if (!name) {
    alert('Please enter your full name');
    return;
  }

  if (!birthDate) {
    alert('Please enter your birth date');
    return;
  }

  currentNumbers = getAllNumbers(name, birthDate);
  currentNumbers.name = name;
  currentNumbers.birthDate = birthDate;

  showNumbers();
}

function showNumbers() {
  const lifePath = getLifePathMeaning(currentNumbers.lifePathNumber);

  elements.numbersResult.innerHTML = `
    <div class="numbers-grid">
      <div class="number-card primary">
        <div class="number-value">${currentNumbers.lifePathNumber}</div>
        <div class="number-title">Life Path</div>
        <div class="number-subtitle">${lifePath.title}</div>
      </div>
      <div class="number-card">
        <div class="number-value">${currentNumbers.expressionNumber}</div>
        <div class="number-title">Expression</div>
        <div class="number-subtitle">Your Potential</div>
      </div>
      <div class="number-card">
        <div class="number-value">${currentNumbers.soulUrgeNumber}</div>
        <div class="number-title">Soul Urge</div>
        <div class="number-subtitle">Heart's Desire</div>
      </div>
      <div class="number-card">
        <div class="number-value">${currentNumbers.personalityNumber}</div>
        <div class="number-title">Personality</div>
        <div class="number-subtitle">Outer Self</div>
      </div>
      <div class="number-card">
        <div class="number-value">${currentNumbers.birthdayNumber}</div>
        <div class="number-title">Birthday</div>
        <div class="number-subtitle">Special Gift</div>
      </div>
    </div>
  `;

  elements.numbersDisplay.style.display = 'block';

  showReading();

  elements.resetBtn.style.display = 'inline-block';
  elements.calculateBtn.style.display = 'none';

  elements.numbersDisplay.scrollIntoView({ behavior: 'smooth' });
}

function showReading() {
  const lifePath = getLifePathMeaning(currentNumbers.lifePathNumber);

  elements.numberMeanings.innerHTML = `
    <div class="reading-block primary-reading">
      <div class="reading-header">
        <div class="number-badge">${currentNumbers.lifePathNumber}</div>
        <div>
          <h3>Life Path: ${lifePath.title}</h3>
          <div class="keywords">
            ${lifePath.keywords.map(k => `<span class="keyword">${k}</span>`).join('')}
          </div>
        </div>
      </div>
      <p class="reading-brief">${lifePath.brief}</p>
      <p class="reading-meaning">${lifePath.meaning}</p>
      <div class="traits-grid">
        <div class="traits strengths">
          <h4>Strengths</h4>
          <ul>
            ${lifePath.strengths.map(s => `<li>${s}</li>`).join('')}
          </ul>
        </div>
        <div class="traits challenges">
          <h4>Growth Areas</h4>
          <ul>
            ${lifePath.challenges.map(c => `<li>${c}</li>`).join('')}
          </ul>
        </div>
      </div>
    </div>

    <div class="premium-upsell">
      <h4>Unlock Your Full Numerology Chart</h4>
      <p>Get detailed interpretations of all your numbers, including:</p>
      <ul>
        <li>Expression Number - Your natural talents and abilities</li>
        <li>Soul Urge Number - Your deepest desires</li>
        <li>Personality Number - How others see you</li>
        <li>Personal Year Cycles - What's coming in your future</li>
        <li>Lucky numbers, days, and colors</li>
      </ul>
      <button class="premium-btn" onclick="showPremiumModal()">
        Get Premium Reading - $4.99
      </button>
    </div>
  `;

  elements.readingSection.style.display = 'block';
}

function reset() {
  currentNumbers = null;

  elements.nameInput.value = '';
  elements.birthDateInput.value = '';
  elements.numbersDisplay.style.display = 'none';
  elements.readingSection.style.display = 'none';
  elements.resetBtn.style.display = 'none';
  elements.calculateBtn.style.display = 'inline-block';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function shareReading() {
  if (!currentNumbers) return;

  const lifePath = getLifePathMeaning(currentNumbers.lifePathNumber);

  const text = `My Numerology Chart:

Life Path: ${currentNumbers.lifePathNumber} - ${lifePath.title}
Expression: ${currentNumbers.expressionNumber}
Soul Urge: ${currentNumbers.soulUrgeNumber}
Personality: ${currentNumbers.personalityNumber}

"${lifePath.brief}"

Discover your numbers at numerology.mdo3d.com`;

  if (navigator.share) {
    navigator.share({
      title: `Numerology: Life Path ${currentNumbers.lifePathNumber}`,
      text: text
    });
  } else {
    navigator.clipboard.writeText(text).then(() => {
      alert('Reading copied to clipboard!');
    });
  }
}

// Make showPremiumModal available globally for onclick
window.showPremiumModal = showPremiumModal;

document.addEventListener('DOMContentLoaded', init);
