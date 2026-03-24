import { tarotCards, drawCards } from '../../src/tarotDatabase.js';
import { SocialShare } from '../../../shared/ui-components/SocialShare.js';
import { ShareImageGenerator } from '../../../shared/ui-components/ShareImageGenerator.js';
import { apiClient } from './config/api.js';
import { firebaseConfig } from './config/firebase.js';
import { authService } from './services/authService.js';

class TarotApp {
    constructor() {
        this.api = apiClient;
        this.auth = authService;
        this.currentSpread = 'single';
        this.drawnCards = [];
        this.question = '';
        this.isReversed = [];
        
        // Initialize social sharing
        this.socialShare = new SocialShare({
            title: 'Tarot Reading',
            hashtags: ['Tarot', 'Spirituality', 'Guidance', 'Divination'],
            via: 'TarotReading'
        });
        
        this.initialize();
    }

    async initialize() {
        // Initialize Firebase
        await firebaseConfig.initialize();
        await this.auth.initialize();
        
        // Initialize event listeners
        this.initializeEventListeners();
        this.updateCharCount();
        
        // Check API health
        this.checkApiHealth();
    }

    async checkApiHealth() {
        try {
            const health = await this.api.checkHealth();
            console.log('API Status:', health.status);
        } catch (error) {
            console.error('API health check failed:', error);
            console.warn('Backend API may be offline. Premium features disabled.');
        }
    }

    initializeEventListeners() {
        // Question input character counter
        const questionInput = document.getElementById('question-input');
        questionInput.addEventListener('input', () => this.updateCharCount());

        // Spread selection
        const spreadOptions = document.querySelectorAll('.spread-option');
        spreadOptions.forEach(option => {
            option.addEventListener('click', () => this.selectSpread(option));
        });

        // Draw button
        const drawBtn = document.getElementById('draw-btn');
        drawBtn.addEventListener('click', () => this.drawCards());

        // New reading button
        const newReadingBtn = document.getElementById('new-reading-btn');
        newReadingBtn.addEventListener('click', () => this.resetReading());

        // Share button
        const shareBtn = document.getElementById('share-btn');
        shareBtn.addEventListener('click', () => this.shareReading());

        // Upgrade button
        const upgradeBtn = document.getElementById('upgrade-btn');
        upgradeBtn.addEventListener('click', () => this.handleUpgrade());
    }

    updateCharCount() {
        const questionInput = document.getElementById('question-input');
        const charCount = document.getElementById('char-count');
        charCount.textContent = questionInput.value.length;
    }

    selectSpread(option) {
        // Remove active class from all options
        document.querySelectorAll('.spread-option').forEach(opt => {
            opt.classList.remove('active');
        });
        
        // Add active class to selected option
        option.classList.add('active');
        
        // Update current spread
        this.currentSpread = option.dataset.spread;
        
        // Update premium price
        const prices = {
            'single': '0',
            'three': '4.99',
            'celtic': '9.99'
        };
        document.getElementById('premium-price').textContent = `$${prices[this.currentSpread]}`;
    }

    drawCards() {
        // Get question
        this.question = document.getElementById('question-input').value.trim();
        
        // Determine number of cards
        const cardCounts = {
            'single': 1,
            'three': 3,
            'celtic': 10
        };
        const numCards = cardCounts[this.currentSpread];
        
        // Check if premium spread
        if (this.currentSpread !== 'single') {
            alert('Premium spreads require payment. For demo purposes, showing free single card reading.');
            this.currentSpread = 'single';
            this.selectSpread(document.querySelector('[data-spread="single"]'));
            return;
        }
        
        // Draw random cards
        this.drawnCards = drawCards(numCards);
        
        // Randomly determine if cards are reversed (30% chance)
        this.isReversed = this.drawnCards.map(() => Math.random() < 0.3);
        
        // Display cards
        this.displayCards();
        
        // Show reading
        this.displayReading();
        
        // Scroll to cards
        document.getElementById('card-display').scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }

    displayCards() {
        const cardDisplay = document.getElementById('card-display');
        const cardsContainer = document.getElementById('cards-container');
        
        // Clear previous cards
        cardsContainer.innerHTML = '';
        
        // Create card elements
        this.drawnCards.forEach((card, index) => {
            const cardElement = document.createElement('div');
            cardElement.className = 'tarot-card';
            if (this.isReversed[index]) {
                cardElement.classList.add('reversed');
            }
            
            cardElement.innerHTML = `
                <div class="card-inner">
                    <div class="card-front">
                        <div class="card-header">
                            <h4>${card.name}</h4>
                            ${this.isReversed[index] ? '<span class="reversed-badge">Reversed</span>' : ''}
                        </div>
                        <div class="card-body">
                            <div class="card-number">${this.getCardDisplay(card)}</div>
                            <div class="card-suit">${this.getSuitSymbol(card.suit)}</div>
                            <div class="card-element">${card.element}</div>
                        </div>
                        <div class="card-keywords">
                            ${card.keywords.map(kw => `<span class="keyword">${kw}</span>`).join('')}
                        </div>
                    </div>
                </div>
            `;
            
            cardsContainer.appendChild(cardElement);
        });
        
        // Show card display
        cardDisplay.style.display = 'block';
        
        // Animate cards in
        setTimeout(() => {
            document.querySelectorAll('.tarot-card').forEach((card, index) => {
                setTimeout(() => {
                    card.classList.add('revealed');
                }, index * 200);
            });
        }, 100);
    }

    getCardDisplay(card) {
        if (card.arcana === 'major') {
            return card.number === 0 ? '0' : card.number;
        }
        const numbers = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'P', 'Kn', 'Q', 'K'];
        return numbers[card.number] || card.number;
    }

    getSuitSymbol(suit) {
        const symbols = {
            'wands': '🔥',
            'cups': '💧',
            'swords': '⚔️',
            'pentacles': '⭐'
        };
        return symbols[suit] || '';
    }

    displayReading() {
        const readingSection = document.getElementById('reading-section');
        const cardMeanings = document.getElementById('card-meanings');
        
        // Clear previous reading
        cardMeanings.innerHTML = '';
        
        // Display each card's meaning
        this.drawnCards.forEach((card, index) => {
            const isReversed = this.isReversed[index];
            const meaning = isReversed ? card.reversed : card.upright;
            
            const meaningElement = document.createElement('div');
            meaningElement.className = 'card-meaning';
            meaningElement.innerHTML = `
                <h4>${card.name} ${isReversed ? '(Reversed)' : ''}</h4>
                <p class="meaning-brief">${meaning.brief}</p>
                <div class="meaning-details">
                    <p><strong>Meaning:</strong> ${meaning.meaning}</p>
                    <p><strong>Guidance:</strong> ${meaning.guidance}</p>
                </div>
            `;
            
            cardMeanings.appendChild(meaningElement);
        });
        
        // Show reading section
        readingSection.style.display = 'block';
        
        // Show premium upsell for free tier
        if (this.currentSpread === 'single') {
            document.getElementById('premium-upsell').style.display = 'block';
        }
    }

    async shareReading() {
        try {
            // Generate share text
            const cardNames = this.drawnCards.map((card, index) => {
                const reversed = this.isReversed[index] ? ' (R)' : '';
                return card.name + reversed;
            }).join(', ');
            
            const shareText = this.question 
                ? `I asked: "${this.question}" and drew: ${cardNames}. Get your free tarot reading!`
                : `I drew: ${cardNames}. Get your free tarot reading!`;
            
            // Generate share image
            const imageBlob = await ShareImageGenerator.generateGenericImage({
                title: 'Tarot Reading',
                subtitle: this.drawnCards.map(c => c.name).join(' • '),
                brandColor: '#6b46c1'
            });
            
            // Share
            await this.socialShare.share({
                text: shareText,
                url: window.location.origin,
                image: imageBlob
            });
            
            this.trackShare();
            
        } catch (error) {
            console.error('Share error:', error);
            // Fallback without image
            const cardNames = this.drawnCards.map(c => c.name).join(', ');
            await this.socialShare.share({
                text: `I drew: ${cardNames}. Get your free tarot reading!`,
                url: window.location.origin
            });
        }
    }

    trackShare() {
        console.log('Share tracked:', {
            spread: this.currentSpread,
            cards: this.drawnCards.map(c => c.name),
            question: this.question
        });
        // TODO: Add Firebase Analytics tracking
    }

    async handleUpgrade() {
        try {
            const prices = {
                'single': 2.99,
                'three': 4.99,
                'celtic': 9.99
            };
            const price = prices[this.currentSpread];

            // Get user email
            const email = this.getUserEmail();
            if (!email) {
                alert('Please enter your email to continue with payment.');
                return;
            }

            // Show loading state
            const upgradeBtn = document.querySelector('.upgrade-btn');
            if (upgradeBtn) {
                upgradeBtn.textContent = 'Redirecting to checkout...';
                upgradeBtn.disabled = true;
            }

            // Create checkout session
            const response = await apiClient.createCheckoutSession({
                readingType: this.currentSpread,
                email: email,
                userId: this.userId || null
            });

            if (response.success && response.checkoutUrl) {
                // Redirect to Stripe Checkout
                window.location.href = response.checkoutUrl;
            } else {
                throw new Error(response.error || 'Failed to create checkout session');
            }

        } catch (error) {
            console.error('Upgrade error:', error);
            alert('Sorry, there was an error processing your payment. Please try again.');
            
            // Reset button state
            const upgradeBtn = document.querySelector('.upgrade-btn');
            if (upgradeBtn) {
                upgradeBtn.textContent = `Upgrade for $${prices[this.currentSpread]}`;
                upgradeBtn.disabled = false;
            }
        }
    }

    getUserEmail() {
        // Try to get from Firebase auth first
        if (window.authService && window.authService.currentUser) {
            return window.authService.currentUser.email;
        }

        // Prompt user for email
        const email = prompt('Please enter your email address:');
        if (email && this.isValidEmail(email)) {
            return email;
        }

        return null;
    }

    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    resetReading() {
        // Reset state
        this.drawnCards = [];
        this.isReversed = [];
        this.question = '';
        document.getElementById('question-input').value = '';
        this.updateCharCount();
        
        // Hide sections
        document.getElementById('card-display').style.display = 'none';
        document.getElementById('reading-section').style.display = 'none';
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new TarotApp();
});
