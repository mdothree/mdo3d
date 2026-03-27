import {
  getAllNumbers,
  getLifePathMeaning,
  calculateLifePathNumber
} from './services/database.js';

let currentNumbers = null;

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

function init() {
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

  // Enter key support
  elements.nameInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') calculateNumbers();
  });
  elements.birthDateInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') calculateNumbers();
  });
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
