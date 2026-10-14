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
        // Firebase is optional (off by default) — never block the UI on it.
        firebaseConfig.initialize();
        await this.auth.initialize();
        
        // Initialize event listeners
        this.initializeEventListeners();
        this.updateCharCount();

        // DIV-HEALTH-CORS: the diagnostic /health ping is cross-origin to the
        // Vercel API and fails CORS with no functional effect on the free loop.
        // Stop calling it on init; premium verifies via its own request path.
        // this.checkApiHealth();
    }

    async checkApiHealth() {
        try {
            await this.api.checkHealth();
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

        // Upgrade button(s) — pass the clicked button so it gets the loading state
        document.querySelectorAll('.btn-premium').forEach(b => b.addEventListener('click', () => this.handleUpgrade(b)));
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
        
        // Show this spread's price from js/config/pricing.json, the same file the
        // API charges from (JARVIS #63): shown price == charged price.
        const priceEl = document.getElementById('premium-price');
        priceEl.dataset.price = this.currentSpread;
        priceEl.textContent = window.MdoPricing ? window.MdoPricing.price(this.currentSpread, priceEl.textContent) : priceEl.textContent;
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
        
        // Every spread is a paid reading (JARVIS #94); displayReading() shows the
        // checkout prompt when there is no verified purchase.

        // Draw random cards
        this.entitlementRejected = false;
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
        // HID-003: announce the draw (the cards render as visuals).
        const names = this.drawnCards.map((c, i) => c.name + (this.isReversed[i] ? ' (reversed)' : ''));
        const st = document.getElementById('a11y-status');
        if (st) { st.textContent = ''; setTimeout(() => { st.textContent = `Cards drawn: ${names.join(', ')}.`; }, 50); }
        
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
        const upsell = document.getElementById('premium-upsell');

        // Clear previous reading
        cardMeanings.innerHTML = '';

        // Show reading section
        readingSection.style.display = 'block';

        // Paid from first use (JARVIS #94): the reading is the paid AI
        // interpretation. With a verified purchase it is delivered in place;
        // without one, only the checkout prompt (priced for this spread) shows.
        if (window.PremiumEntitlement?.has() && !this.entitlementRejected) {
            if (upsell) upsell.style.display = 'none';
            this.deliverPremiumReading();
        } else if (upsell) {
            upsell.style.display = 'block';
        }
    }

    async deliverPremiumReading() {
        const cardMeanings = document.getElementById('card-meanings');
        if (!cardMeanings) return;
        let block = document.getElementById('premium-interpretation');
        if (!block) {
            block = document.createElement('div');
            block.id = 'premium-interpretation';
            block.className = 'card-meaning premium';
            cardMeanings.appendChild(block);
        }
        block.innerHTML = '<p>✨ Channeling your personalized AI reading...</p>';
        try {
            const data = await apiClient.generateReading({
                cards: this.drawnCards,
                question: this.question,
                spreadType: this.currentSpread,
                premium: true,
                sessionId: window.PremiumEntitlement?.activeSessionId()
            });
            const text = data.interpretation || (data.reading && data.reading.interpretation);
            if (!text) throw new Error('Empty reading');
            // Real premium content delivered — consume the paid credit now.
            window.PremiumEntitlement?.consume();
            block.innerHTML = `<h4>✨ Your Personalized Reading</h4>${this.mdLite(text)}`;
        } catch (e) {
            console.error('Premium reading error:', e);
            if (/API Error: 40[23]\b/.test(e && e.message)) {
                // The purchase on this device doesn't cover this spread (or was
                // used up): offer checkout for this spread instead.
                this.entitlementRejected = true;
                block.remove();
                const upsell = document.getElementById('premium-upsell');
                if (upsell) upsell.style.display = 'block';
                return;
            }
            block.innerHTML = `<p>Your purchase is confirmed, but the reading service is momentarily
                unavailable. Please try again shortly — you will not be charged again.</p>`;
            // keep the entitlement so the reading can be retried
        }
    }

    // Minimal, safe Markdown → HTML for AI reading text.
    mdLite(s) {
        const esc = String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
        return '<p>' + esc
            .replace(/^\s*#{1,6}\s*(.+)$/gm, '</p><h4>$1</h4><p>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/^\s*[-*]\s+(.+)$/gm, '• $1')
            .replace(/\n{2,}/g, '</p><p>')
            .replace(/\n/g, '<br>') + '</p>';
    }

    async shareReading() {
        try {
            // Generate share text
            const cardNames = this.drawnCards.map((card, index) => {
                const reversed = this.isReversed[index] ? ' (R)' : '';
                return card.name + reversed;
            }).join(', ');
            
            const shareText = this.question 
                ? `I asked: "${this.question}" and drew: ${cardNames}. Get your own tarot reading!`
                : `I drew: ${cardNames}. Get your own tarot reading!`;
            
            // Generate share image
            // generateGenericImage is an instance method (calling it statically threw)
            const imageUrl = await new ShareImageGenerator().generateGenericImage({
                title: 'Tarot Reading',
                subtitle: this.drawnCards.map(c => c.name).join(' • '),
                gradient: ['#6b46c1', '#ec4899'],
                icon: '🃏'
            });
            
            // Share
            await this.socialShare.share({
                text: shareText,
                url: window.location.origin,
                imageUrl
            });
            
            this.trackShare();
            
        } catch (error) {
            console.error('Share error:', error);
            // Fallback without image
            const cardNames = this.drawnCards.map(c => c.name).join(', ');
            await this.socialShare.share({
                text: `I drew: ${cardNames}. Get your own tarot reading!`,
                url: window.location.origin
            });
        }
    }

    trackShare() {
        // Share analytics not enabled.
    }

    async handleUpgrade(upgradeBtn = null) {
        // Prevent a double-click from creating two checkout sessions.
        if (this.checkoutInFlight) return;
        const originalLabel = upgradeBtn ? upgradeBtn.innerHTML : null;
        try {
            // (unless the API just said that purchase doesn't cover this spread)
            if (window.PremiumEntitlement?.has() && !this.entitlementRejected) {
                // Already paid (verified by /success): deliver, never charge twice.
                // deliverPremiumReading() consumes the credit only after a reading renders.
                const upsell = document.getElementById('premium-upsell');
                if (upsell) upsell.style.display = 'none';
                if (!this.drawnCards.length) {
                    // Nothing drawn yet (pricing button): go draw first.
                    document.getElementById('draw-btn').scrollIntoView({ behavior: 'smooth' });
                    return;
                }
                this.displayReading();
                return;
            }
            // Get user email
            const email = this.getUserEmail();
            if (!email) {
                alert('Please enter your email to continue with payment.');
                return;
            }

            // Show loading state on the button that was clicked
            this.checkoutInFlight = true;
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
            this.checkoutInFlight = false;
            if (upgradeBtn) {
                upgradeBtn.innerHTML = originalLabel;
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
