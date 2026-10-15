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
// Set when the API refuses the stored purchase (402/403) so checkout is offered.
let entitlementRejected = false;

function hasPurchase() {
  return !entitlementRejected && window.PremiumEntitlement?.has() === true;
}
// True once a reading has been shown in this session; input edits then keep the
// on-screen result in sync (recalculate when valid, clear when not).
let resultsShown = false;

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

const PENDING_KEY = 'numerology_pending_reading';

async function init() {
  // Attach handlers first so the form works immediately; Firebase sign-in and the
  // Firestore read used to block every button until both network calls finished.
  setupEventListeners();
  restorePendingReading();
  // Firebase is optional (off by default). Premium status never comes from a
  // client-readable Firestore doc: it is granted only by window.PremiumEntitlement
  // after the API verifies the Stripe session, and the API re-verifies on use.
  firebaseConfig.initialize();
}

// After a Stripe redirect the page reloads and the numbers are lost. Name and date
// are saved before checkout; if a verified credit exists on return, restore and deliver.
function savePendingReading() {
  if (!currentNumbers) return;
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ name: currentNumbers.name, birthDate: currentNumbers.birthDate }));
  } catch (e) { /* storage unavailable — user can re-enter */ }
}

function restorePendingReading() {
  let saved = null;
  try { saved = JSON.parse(sessionStorage.getItem(PENDING_KEY)); } catch (e) { saved = null; }
  if (!saved || !saved.name || !saved.birthDate || !window.PremiumEntitlement?.has()) return;
  try { sessionStorage.removeItem(PENDING_KEY); } catch (e) {}
  elements.nameInput.value = saved.name;
  elements.birthDateInput.value = saved.birthDate;
  // showReading() delivers the paid reading itself when a credit exists.
  calculateNumbers();
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

  // NUMEROLOGY-NO-RECALC: once a reading is on screen, editing the name or
  // date recalculates it so the numbers never sit stale beside new inputs.
  let recalcTimer = null;
  const recalcIfShowing = () => {
    clearTimeout(recalcTimer);
    recalcTimer = setTimeout(() => {
      if (!resultsShown) return;
      const name = elements.nameInput?.value.trim();
      const birthDate = elements.birthDateInput?.value;
      // C7B-COLOR-STALE-RESULT (numerology): an emptied or invalid input clears
      // the reading instead of leaving the previous numbers on screen.
      const dateError = validateBirthDate(birthDate);
      if (!name || dateError) {
        showNameError(name ? '' : 'Please enter your full name.');
        showBirthDateError(dateError);
        clearResults();
        return;
      }
      showNameError('');
      showBirthDateError('');
      if (currentNumbers && name === currentNumbers.name && birthDate === currentNumbers.birthDate) return;
      calculateNumbers({ scroll: false });
    }, 300);
  };
  elements.nameInput?.addEventListener('input', recalcIfShowing);
  if (elements.birthDateInput) elements.birthDateInput.max = todayISO();
  elements.birthDateInput?.addEventListener('input', recalcIfShowing);
  elements.birthDateInput?.addEventListener('change', recalcIfShowing);
}

async function handlePremiumPurchase() {
  // A verified purchase (recorded by success.html) unlocks — no second charge.
  if (hasPurchase()) {
    isPremium = true;
    hidePremiumModal();
    if (!currentNumbers) {
      alert('Your premium credit is ready. Enter your name and birth date and calculate your numbers first, then choose "Get Premium Reading" to use it.');
      elements.nameInput?.focus();
      return;
    }
    await deliverPremiumReading();
    return;
  }
  const email = prompt('Enter your email for your Stripe receipt. Your reading appears on this site after payment:');
  if (!email) return;
  try {
    const response = await fetch(`${API_URL}/api/payment/create-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ readingType: 'core-numbers', email })
    });
    const data = await response.json();
    if (data.success && data.checkoutUrl) {
      savePendingReading();
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
    if (res.status === 402 || res.status === 403) {
      // The purchase on this device was used up or doesn't cover this reading.
      entitlementRejected = true;
      banner.remove();
      showReading();
      return;
    }
    const data = await res.json();
    const r = data.reading || data;
    if (!r || !r.lifePathAnalysis) throw new Error('Empty reading');
    window.PremiumEntitlement?.consume();

    const section = (title, body) => body ? `<div class="reading-section"><h3>${title}</h3>${body}</div>` : '';
    const list = (arr) => Array.isArray(arr) && arr.length ? `<ul>${arr.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
    // The API returns luckyElements {numbers, days, colors}; it was sold but never rendered.
    const luckyBlock = (l) => {
      if (!l || typeof l !== 'object') return '';
      const row = (label, arr) => Array.isArray(arr) && arr.length ? `<p><strong>${label}:</strong> ${arr.map(esc).join(', ')}</p>` : '';
      return section('Lucky Numbers, Days &amp; Colors', row('Numbers', l.numbers) + row('Days', l.days) + row('Colors', l.colors));
    };
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
      ${luckyBlock(r.luckyElements)}
    `;
    // The reading has been delivered — don't keep selling it.
    target.querySelectorAll('.premium-upsell').forEach(el => { el.style.display = 'none'; });
    if (elements.upgradeBtn) elements.upgradeBtn.style.display = 'none';
    banner.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) {
    console.error('Premium reading error:', e);
    banner.innerHTML = '<p>Your purchase is confirmed, but the reading service is momentarily unavailable. Please try again shortly — you will not be charged again.</p>';
    // keep the entitlement so the reading can be retried
  }
}

function showPremiumModal() {
  if (elements.premiumModal) {
    elements.premiumModal.classList.add('active');
    elements.modalOverlay?.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function hidePremiumModal() {
  if (elements.premiumModal) {
    elements.premiumModal.classList.remove('active');
    elements.modalOverlay?.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Returns an error message, or '' when the date is usable.
function validateBirthDate(value) {
  if (!value) return 'Please enter your birth date.';
  const m = /^(\d{4,})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return 'Please enter a valid birth date.';
  const year = Number(m[1]);
  if (year < 1900) return 'Please enter a birth year of 1900 or later.';
  const date = new Date(year, Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(date.getTime()) || date.getMonth() !== Number(m[2]) - 1) {
    return 'Please enter a valid birth date.';
  }
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (date > today) return 'Your birth date cannot be in the future.';
  return '';
}

function showBirthDateError(message) {
  const el = document.getElementById('birth-date-error');
  if (el) {
    el.textContent = message;
    el.hidden = !message;
  }
  elements.birthDateInput?.setAttribute('aria-invalid', message ? 'true' : 'false');
}

function showNameError(message) {
  const input = elements.nameInput;
  if (!input) return;
  let el = document.getElementById('name-error');
  if (!el && message) {
    el = document.createElement('p');
    el.id = 'name-error';
    el.className = 'field-error';
    el.setAttribute('role', 'alert');
    input.insertAdjacentElement('afterend', el);
    input.setAttribute('aria-describedby', 'name-error');
  }
  if (el) {
    el.textContent = message;
    el.hidden = !message;
  }
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
}

// Hide the on-screen reading (inputs are kept so the user can fix them).
function clearResults() {
  currentNumbers = null;
  if (elements.numbersDisplay) elements.numbersDisplay.style.display = 'none';
  if (elements.readingSection) elements.readingSection.style.display = 'none';
  if (elements.resetBtn) elements.resetBtn.style.display = 'none';
  if (elements.calculateBtn) elements.calculateBtn.style.display = 'inline-block';
}

function calculateNumbers(opts = {}) {
  const name = elements.nameInput?.value.trim();
  const birthDate = elements.birthDateInput?.value;

  // Inline message instead of alert(); a failed attempt never leaves an older reading up.
  showNameError(name ? '' : 'Please enter your full name.');

  // C7B-NUMEROLOGY-FUTURE-DATE: reject empty, future and pre-1900 dates inline.
  const dateError = validateBirthDate(birthDate);
  showBirthDateError(dateError);
  if (!name || dateError) {
    clearResults();
    (!name ? elements.nameInput : elements.birthDateInput)?.focus();
    return;
  }

  entitlementRejected = false;
  currentNumbers = getAllNumbers(name, birthDate);
  currentNumbers.name = name;
  currentNumbers.birthDate = birthDate;

  showNumbers(opts.scroll !== false);
}

function showNumbers(scroll = true) {
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
  resultsShown = true;
  if (elements.upgradeBtn) elements.upgradeBtn.style.display = '';

  showReading();

  elements.resetBtn.style.display = 'inline-block';
  elements.calculateBtn.style.display = 'none';

  if (scroll) elements.numbersDisplay.scrollIntoView({ behavior: 'smooth' });
}

// Paid from first use (JARVIS #94): the numbers are arithmetic; their reading
// is the paid AI interpretation. With a verified purchase it is delivered here;
// without one, only the checkout prompt shows.
function showReading() {
  if (hasPurchase()) {
    elements.numberMeanings.innerHTML = '';
    elements.readingSection.style.display = 'block';
    deliverPremiumReading();
    return;
  }

  elements.numberMeanings.innerHTML = `
    <div class="premium-upsell">
      <h4>Unlock Your Full Numerology Chart</h4>
      <p>Get detailed interpretations of all your numbers, including:</p>
      <ul>
        <li>Life Path - Your purpose, strengths and growth areas</li>
        <li>Expression Number - Your natural talents and abilities</li>
        <li>Soul Urge Number - Your deepest desires</li>
        <li>Personality Number - How others see you</li>
        <li>Personal Year Cycles - What's coming in your future</li>
        <li>Lucky numbers, days, and colors</li>
      </ul>
      <button class="premium-btn" onclick="showPremiumModal()">
        Get Premium Reading - <span data-price="core-numbers">${window.MdoPricing ? window.MdoPricing.price('core-numbers') : ''}</span>
      </button>
    </div>
  `;

  elements.readingSection.style.display = 'block';
}

function reset() {
  currentNumbers = null;
  resultsShown = false;
  showNameError('');

  elements.nameInput.value = '';
  elements.birthDateInput.value = '';
  showBirthDateError('');
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
