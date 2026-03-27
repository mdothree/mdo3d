import { oracleCards, drawCards } from '../../src/cardDatabase.js';
import { CardRenderer3D } from './components/CardRenderer3D.js';
import { SocialShare } from '../../../shared/ui-components/SocialShare.js';
import { ShareImageGenerator } from '../../../shared/ui-components/ShareImageGenerator.js';
import { apiClient } from './config/api.js';
import { firebaseConfig } from './config/firebase.js';
import { authService } from './services/authService.js';

class OracleCardsApp {
    constructor() {
        this.api = apiClient;
        this.auth = authService;
        this.selectedSpread = 'single';
        this.drawnCards = [];
        this.userQuestion = '';
        this.currentReading = null;
        this.cardRenderer = null;
        this.socialShare = new SocialShare({
            title: 'Oracle Cards Reading',
            hashtags: ['OracleCards', 'Spirituality', 'DailyGuidance'],
            via: 'OracleCardsApp'
        });
        
        this.initialize();
    }

    async initialize() {
        // Initialize Firebase and Auth
        await firebaseConfig.initialize();
        await this.auth.initialize();
        
        // Initialize event listeners
        this.initializeEventListeners();
        
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
        // Start reading button
        document.getElementById('start-reading-btn')?.addEventListener('click', () => {
            this.showCardSection();
        });

        // Question input character count
        const questionInput = document.getElementById('user-question');
        questionInput?.addEventListener('input', (e) => {
            const count = e.target.value.length;
            document.getElementById('char-count').textContent = count;
            this.userQuestion = e.target.value;
        });

        // Spread selection
        document.querySelectorAll('.spread-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const spreadType = e.currentTarget.dataset.spread;
                
                // Check if premium spread
                if (spreadType !== 'single' && !this.isPremiumUser()) {
                    this.showPremiumPrompt(spreadType);
                    return;
                }

                // Update selection
                document.querySelectorAll('.spread-option').forEach(opt => {
                    opt.classList.remove('active');
                });
                e.currentTarget.classList.add('active');
                this.selectedSpread = spreadType;
            });
        });

        // Draw cards button
        document.getElementById('draw-cards-btn')?.addEventListener('click', () => {
            this.performDrawing();
        });

        // Action buttons
        document.getElementById('save-reading-btn')?.addEventListener('click', () => {
            this.saveReading();
        });

        document.getElementById('share-reading-btn')?.addEventListener('click', () => {
            this.shareReading();
        });

        document.getElementById('new-reading-btn')?.addEventListener('click', () => {
            this.resetReading();
        });

        document.getElementById('upgrade-btn')?.addEventListener('click', () => {
            this.upgradeToPremium();
        });
    }

    showCardSection() {
        document.querySelector('.hero').style.display = 'none';
        document.getElementById('card-section').style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    getCardCount() {
        switch(this.selectedSpread) {
            case 'single': return 1;
            case 'three': return 3;
            case 'celtic': return 10;
            default: return 1;
        }
    }

    performDrawing() {
        const cardCount = this.getCardCount();
        
        // Hide setup, show card display
        document.querySelector('.reading-setup').style.display = 'none';
        const cardDisplay = document.getElementById('card-display');
        cardDisplay.style.display = 'block';

        // Draw random cards
        this.drawnCards = drawCards(cardCount);

        // Initialize 3D card renderer
        this.display3DCardDeck(cardCount);
    }

    display3DCardDeck(cardCount) {
        const cardDeck = document.querySelector('.card-deck');
        cardDeck.innerHTML = '';
        
        // Create 3D container
        const canvas3D = document.createElement('div');
        canvas3D.id = 'card-canvas-3d';
        canvas3D.style.width = '100%';
        canvas3D.style.height = '400px';
        canvas3D.style.position = 'relative';
        cardDeck.appendChild(canvas3D);

        // Initialize Three.js renderer
        this.cardRenderer = new CardRenderer3D(canvas3D);
        this.cardRenderer.createCardDeck(cardCount);

        // Listen for card reveal events
        canvas3D.addEventListener('cardRevealed', (e) => {
            this.onCardRevealed(e.detail.index);
        });
    }

    onCardRevealed(index) {
        console.log('Card revealed:', index, this.drawnCards[index]);

        // Check if all cards revealed
        const allRevealed = this.cardRenderer.cards.every(c => c.isRevealed);
        
        if (allRevealed) {
            setTimeout(() => this.showReading(), 1500);
        }
    }

    async showReading() {
        // Hide card display
        document.getElementById('card-display').style.display = 'none';
        
        // Show reading display
        const readingDisplay = document.getElementById('reading-display');
        readingDisplay.style.display = 'block';

        // Set date
        document.getElementById('reading-date').textContent = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Display drawn cards
        this.displayDrawnCards();

        // Generate and display reading
        await this.generateReading();

        // Show premium upsell for free tier
        if (!this.isPremiumUser() && this.selectedSpread === 'single') {
            document.getElementById('premium-upsell').style.display = 'block';
        } else {
            document.getElementById('premium-upsell').style.display = 'none';
        }

        // Scroll to reading
        readingDisplay.scrollIntoView({ behavior: 'smooth' });
    }

    displayDrawnCards() {
        const cardsDrawnEl = document.getElementById('cards-drawn');
        cardsDrawnEl.innerHTML = '';

        this.drawnCards.forEach((card, index) => {
            const cardContainer = document.createElement('div');
            cardContainer.className = 'drawn-card';

            const position = this.getCardPosition(index);

            cardContainer.innerHTML = `
                <div class="drawn-card-img">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">✨</div>
                    <div style="font-weight: 600;">${card.name}</div>
                </div>
                <div class="drawn-card-name">${position}</div>
                <div class="drawn-card-keywords">${card.keywords.join(' • ')}</div>
            `;

            cardsDrawnEl.appendChild(cardContainer);
        });
    }

    getCardPosition(index) {
        if (this.selectedSpread === 'single') {
            return 'Your Card';
        } else if (this.selectedSpread === 'three') {
            const positions = ['Past', 'Present', 'Future'];
            return positions[index];
        } else if (this.selectedSpread === 'celtic') {
            const positions = [
                'Present', 'Challenge', 'Past', 'Future',
                'Above', 'Below', 'Advice', 'External',
                'Hopes/Fears', 'Outcome'
            ];
            return positions[index];
        }
        return '';
    }

    async generateReading() {
        const readingContent = document.getElementById('reading-content');
        readingContent.innerHTML = '<div class="loading">✨ Channeling your reading...</div>';

        // For free tier, show basic interpretation
        if (!this.isPremiumUser() && this.selectedSpread === 'single') {
            setTimeout(() => {
                this.displayFreeReading();
            }, 1500);
            return;
        }

        // For premium, call Claude API
        // TODO: Implement API call to backend
        setTimeout(() => {
            this.displayPremiumReading();
        }, 2000);
    }

    displayFreeReading() {
        const card = this.drawnCards[0];
        const readingContent = document.getElementById('reading-content');

        readingContent.innerHTML = `
            <div class="reading-section">
                <h3>Card Meaning</h3>
                <p>${card.upright.brief}</p>
            </div>

            <div class="reading-section">
                <h3>Message for You</h3>
                <p>${card.upright.meaning}</p>
            </div>

            <div class="reading-section">
                <h3>Guidance</h3>
                <p>${card.upright.guidance}</p>
            </div>

            <div class="reading-section">
                <h3>Keywords</h3>
                <p>${card.keywords.map(k => `<span style="background: #F3E8FF; padding: 0.25rem 0.75rem; border-radius: 20px; margin: 0.25rem; display: inline-block;">${k}</span>`).join('')}</p>
            </div>
        `;
    }

    displayPremiumReading() {
        // Mock premium reading - will be replaced with Claude API response
        const readingContent = document.getElementById('reading-content');

        readingContent.innerHTML = `
            <div class="reading-section">
                <h3>✨ Personalized Interpretation</h3>
                <p>Based on your question: "${this.userQuestion || 'General guidance'}"</p>
                <p>The cards speak directly to your current situation. The energies present suggest a time of transformation and inner wisdom. Trust the journey you're on - every step is leading you exactly where you need to be.</p>
            </div>

            <div class="reading-section">
                <h3>💫 Deep Insights</h3>
                <p>The universe is asking you to pause and listen to your inner voice. There's wisdom within you that's trying to emerge. This is not a time for rushing or forcing outcomes. Instead, allow things to unfold naturally while staying aligned with your highest truth.</p>
            </div>

            <div class="reading-section">
                <h3>🔮 Action Steps</h3>
                <ul style="line-height: 2;">
                    <li>Spend 10 minutes in quiet reflection each morning</li>
                    <li>Journal your thoughts and feelings about this situation</li>
                    <li>Notice synchronicities and signs appearing in your life</li>
                    <li>Trust your first instinct when making decisions</li>
                </ul>
            </div>

            <div class="reading-section">
                <h3>🌟 Affirmation</h3>
                <p style="font-size: 1.25rem; font-style: italic; text-align: center; padding: 1.5rem; background: #F3E8FF; border-radius: 12px;">
                    "I trust my inner wisdom and follow my heart's guidance."
                </p>
            </div>
        `;
    }

    isPremiumUser() {
        // TODO: Check actual premium status from Firebase
        return false;
    }

    showPremiumPrompt(spreadType) {
        const prices = {
            'three': '$4.99',
            'celtic': '$9.99'
        };
        
        alert(`This spread requires a premium reading (${prices[spreadType]}). Upgrade to unlock all spreads and detailed AI interpretations!`);
    }

    saveReading() {
        // TODO: Save to Firebase
        console.log('Saving reading...');
        alert('Reading saved! (Feature coming soon)');
    }

    async shareReading() {
        const card = this.drawnCards[0];
        const shareText = `I just drew "${card.name}" from Oracle Cards! ${card.upright.brief} 🔮✨`;
        
        // Generate share image
        const imageGenerator = new ShareImageGenerator();
        const shareImageUrl = await imageGenerator.generateOracleCardImage({
            cardName: card.name,
            message: card.upright.brief,
            gradient: ['#8B5CF6', '#EC4899']
        });

        // Share with image
        await this.socialShare.share({
            title: `My Oracle Card: ${card.name}`,
            text: shareText,
            url: window.location.href,
            imageUrl: shareImageUrl,
            contentType: 'oracle_reading',
            itemId: card.id
        });
    }

    resetReading() {
        // Reset state
        this.drawnCards = [];
        this.userQuestion = '';
        this.currentReading = null;

        // Cleanup 3D renderer
        if (this.cardRenderer) {
            this.cardRenderer.destroy();
            this.cardRenderer = null;
        }

        // Reset UI
        document.querySelector('.reading-setup').style.display = 'block';
        document.getElementById('card-display').style.display = 'none';
        document.getElementById('reading-display').style.display = 'none';
        document.getElementById('user-question').value = '';
        document.getElementById('char-count').textContent = '0';

        // Scroll to top
        document.getElementById('card-section').scrollIntoView({ behavior: 'smooth' });
    }

    async upgradeToPremium() {
        try {
            // Get user email (from auth or prompt)
            const email = this.getUserEmail();
            if (!email) {
                alert('Please enter your email to continue with payment.');
                return;
            }

            // Determine reading type based on current spread
            const readingType = this.spreadType === 'single' ? 'single-premium' : this.spreadType;

            // Show loading state
            const upgradeBtn = document.querySelector('.upgrade-btn');
            if (upgradeBtn) {
                upgradeBtn.textContent = 'Redirecting to checkout...';
                upgradeBtn.disabled = true;
            }

            // Create checkout session
            const response = await apiClient.createCheckoutSession({
                readingType: readingType,
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
                upgradeBtn.textContent = 'Upgrade to Premium';
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
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    new OracleCardsApp();
});
