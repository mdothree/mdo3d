import { dreamSymbols, searchSymbols, getSymbolsByCategory, categories } from '../../src/dreamSymbols.js';
import { SocialShare } from '../../../shared/ui-components/SocialShare.js';
import { ShareImageGenerator } from '../../../shared/ui-components/ShareImageGenerator.js';
import { apiClient } from './config/api.js';
import { firebaseConfig } from './config/firebase.js';
import { authService } from './services/authService.js';

class DreamInterpreterApp {
    constructor() {
        this.api = apiClient;
        this.auth = authService;
        this.currentDream = '';
        this.detectedSymbols = [];
        this.currentInterpretation = null;
        this.dreamJournal = this.loadJournal();
        
        // Initialize social sharing
        this.socialShare = new SocialShare({
            title: 'BlackLabb Dreams',
            hashtags: ['Dreams', 'DreamMeaning', 'Spirituality', 'BlackLabb'],
            via: 'BlackLabb'
        });
        
        this.initialize();
    }

    async initialize() {
        // Initialize Firebase and Auth
        await firebaseConfig.initialize();
        await this.auth.initialize();
        
        // Initialize event listeners and UI
        this.initializeEventListeners();
        this.updateCharCount();
        this.loadSymbolDatabase();
        this.displayJournal();
        
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
        // Dream input character counter
        const dreamInput = document.getElementById('dream-input');
        dreamInput.addEventListener('input', () => this.updateCharCount());

        // Interpret button
        const interpretBtn = document.getElementById('interpret-btn');
        interpretBtn.addEventListener('click', () => this.interpretDream());

        // Symbol search
        const searchBtn = document.getElementById('search-btn');
        const symbolSearch = document.getElementById('symbol-search');
        searchBtn.addEventListener('click', () => this.searchSymbol());
        symbolSearch.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchSymbol();
        });

        // Category tabs
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => this.filterByCategory(tab.dataset.category));
        });

        // Share button
        const shareBtn = document.getElementById('share-btn');
        shareBtn.addEventListener('click', () => this.shareInterpretation());

        // Save to journal
        const saveBtn = document.getElementById('save-journal-btn');
        saveBtn.addEventListener('click', () => this.saveToJournal());

        // New dream button
        const newDreamBtn = document.getElementById('new-dream-btn');
        newDreamBtn.addEventListener('click', () => this.resetDream());

        // Upgrade button
        const upgradeBtn = document.getElementById('upgrade-btn');
        upgradeBtn.addEventListener('click', () => this.handleUpgrade());
    }

    updateCharCount() {
        const dreamInput = document.getElementById('dream-input');
        const charCount = document.getElementById('char-count');
        charCount.textContent = dreamInput.value.length;
    }

    interpretDream() {
        const dreamInput = document.getElementById('dream-input');
        this.currentDream = dreamInput.value.trim();
        
        if (!this.currentDream || this.currentDream.length < 10) {
            alert('Please describe your dream in more detail (at least 10 characters).');
            return;
        }
        
        // Detect symbols in the dream text
        this.detectedSymbols = this.detectSymbols(this.currentDream);
        
        if (this.detectedSymbols.length === 0) {
            alert('No recognizable symbols found in your dream. Try adding more details about what you saw, felt, or experienced.');
            return;
        }
        
        // Display results
        this.displayResults();
        
        // Scroll to results
        document.getElementById('results-section').scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }

    detectSymbols(dreamText) {
        const text = dreamText.toLowerCase();
        const found = [];
        
        dreamSymbols.forEach(symbol => {
            // Check if any keyword appears in the dream text
            const matched = symbol.keywords.some(keyword => 
                text.includes(keyword.toLowerCase())
            );
            
            if (matched) {
                found.push(symbol);
            }
        });
        
        return found;
    }

    displayResults() {
        const resultsSection = document.getElementById('results-section');
        const symbolGrid = document.getElementById('symbol-grid');
        const basicMeaning = document.getElementById('basic-meaning');
        
        // Clear previous results
        symbolGrid.innerHTML = '';
        basicMeaning.innerHTML = '';
        
        // Display detected symbols
        this.detectedSymbols.forEach(symbol => {
            const symbolCard = document.createElement('div');
            symbolCard.className = 'symbol-card-mini';
            symbolCard.innerHTML = `
                <h5>${symbol.symbol}</h5>
                <p class="category">${symbol.category}</p>
            `;
            symbolCard.addEventListener('click', () => this.showSymbolDetail(symbol));
            symbolGrid.appendChild(symbolCard);
        });
        
        // Generate basic interpretation
        const interpretation = this.generateBasicInterpretation();
        basicMeaning.innerHTML = `
            <p class="interpretation-text">${interpretation}</p>
            <p class="disclaimer">This is a basic interpretation based on common symbol meanings. Upgrade for personalized AI analysis.</p>
        `;
        
        // Show results section
        resultsSection.style.display = 'block';
    }

    generateBasicInterpretation() {
        if (this.detectedSymbols.length === 0) {
            return "No clear symbols detected in your dream.";
        }
        
        let interpretation = "Your dream contains several meaningful symbols:\n\n";
        
        this.detectedSymbols.slice(0, 3).forEach((symbol, index) => {
            interpretation += `<strong>${symbol.symbol}:</strong> ${symbol.meanings.general}\n\n`;
        });
        
        if (this.detectedSymbols.length > 3) {
            interpretation += `\n<em>...and ${this.detectedSymbols.length - 3} more symbols detected.</em>`;
        }
        
        return interpretation.replace(/\n/g, '<br>');
    }

    showSymbolDetail(symbol) {
        const modal = document.createElement('div');
        modal.className = 'symbol-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <button class="close-modal">&times;</button>
                <h3>${symbol.symbol}</h3>
                <p class="category-badge">${symbol.category}</p>
                
                <div class="symbol-meanings">
                    <div class="meaning-section">
                        <h4>General Meaning</h4>
                        <p>${symbol.meanings.general}</p>
                    </div>
                    
                    <div class="meaning-section">
                        <h4>Positive Aspects</h4>
                        <p>${symbol.meanings.positive}</p>
                    </div>
                    
                    <div class="meaning-section">
                        <h4>Negative Aspects</h4>
                        <p>${symbol.meanings.negative}</p>
                    </div>
                    
                    <div class="meaning-section">
                        <h4>Spiritual Significance</h4>
                        <p>${symbol.meanings.spiritual}</p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.classList.contains('close-modal')) {
                modal.remove();
            }
        });
    }

    searchSymbol() {
        const searchInput = document.getElementById('symbol-search');
        const query = searchInput.value.trim();
        
        if (!query) {
            this.loadSymbolDatabase();
            return;
        }
        
        const results = searchSymbols(query);
        this.displaySymbolDatabase(results);
        
        if (results.length === 0) {
            const database = document.getElementById('symbols-database');
            database.innerHTML = '<p class="empty-state">No symbols found. Try a different search term.</p>';
        }
    }

    filterByCategory(category) {
        // Update active tab
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.category === category) {
                tab.classList.add('active');
            }
        });
        
        // Filter symbols
        if (category === 'all') {
            this.displaySymbolDatabase(dreamSymbols);
        } else {
            const filtered = getSymbolsByCategory(category);
            this.displaySymbolDatabase(filtered);
        }
    }

    loadSymbolDatabase() {
        this.displaySymbolDatabase(dreamSymbols);
    }

    displaySymbolDatabase(symbols) {
        const database = document.getElementById('symbols-database');
        database.innerHTML = '';
        
        symbols.forEach(symbol => {
            const card = document.createElement('div');
            card.className = 'symbol-card';
            card.innerHTML = `
                <h4>${symbol.symbol}</h4>
                <p class="category-badge">${symbol.category}</p>
                <p class="symbol-preview">${symbol.meanings.general.substring(0, 100)}...</p>
            `;
            card.addEventListener('click', () => this.showSymbolDetail(symbol));
            database.appendChild(card);
        });
    }

    async shareInterpretation() {
        try {
            const symbolNames = this.detectedSymbols.map(s => s.symbol).join(', ');
            const shareText = `I interpreted my dream and found these symbols: ${symbolNames}. Discover what your dreams mean!`;
            
            // Generate share image
            const imageBlob = await ShareImageGenerator.generateGenericImage({
                title: 'Dream Interpretation',
                subtitle: symbolNames,
                brandColor: '#7c3aed'
            });
            
            await this.socialShare.share({
                text: shareText,
                url: window.location.origin,
                image: imageBlob
            });
            
            this.trackShare();
            
        } catch (error) {
            console.error('Share error:', error);
            const symbolNames = this.detectedSymbols.map(s => s.symbol).join(', ');
            await this.socialShare.share({
                text: `I interpreted my dream and found: ${symbolNames}`,
                url: window.location.origin
            });
        }
    }

    trackShare() {
        console.log('Share tracked:', {
            symbols: this.detectedSymbols.map(s => s.symbol),
            dreamLength: this.currentDream.length
        });
        // TODO: Add Firebase Analytics tracking
    }

    saveToJournal() {
        if (!this.currentDream || this.detectedSymbols.length === 0) {
            alert('Please interpret a dream first before saving to journal.');
            return;
        }
        
        const entry = {
            id: Date.now(),
            date: new Date().toISOString(),
            dream: this.currentDream,
            symbols: this.detectedSymbols.map(s => s.symbol),
            interpretation: this.generateBasicInterpretation()
        };
        
        this.dreamJournal.unshift(entry);
        this.saveJournal();
        this.displayJournal();
        
        alert('Dream saved to your journal!');
    }

    loadJournal() {
        try {
            const saved = localStorage.getItem('dreamJournal');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Error loading journal:', error);
            return [];
        }
    }

    saveJournal() {
        try {
            localStorage.setItem('dreamJournal', JSON.stringify(this.dreamJournal));
        } catch (error) {
            console.error('Error saving journal:', error);
        }
    }

    displayJournal() {
        const journalEntries = document.getElementById('journal-entries');
        
        if (this.dreamJournal.length === 0) {
            journalEntries.innerHTML = '<p class="empty-state">No dreams saved yet. Interpret your first dream to start your journal!</p>';
            return;
        }
        
        journalEntries.innerHTML = '';
        
        this.dreamJournal.forEach(entry => {
            const entryEl = document.createElement('div');
            entryEl.className = 'journal-entry';
            const date = new Date(entry.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            entryEl.innerHTML = `
                <div class="entry-header">
                    <h4>${date}</h4>
                    <button class="delete-entry" data-id="${entry.id}">Delete</button>
                </div>
                <p class="entry-dream">${entry.dream.substring(0, 150)}${entry.dream.length > 150 ? '...' : ''}</p>
                <div class="entry-symbols">
                    ${entry.symbols.map(s => `<span class="symbol-tag">${s}</span>`).join('')}
                </div>
            `;
            
            journalEntries.appendChild(entryEl);
        });
        
        // Delete handlers
        document.querySelectorAll('.delete-entry').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);
                this.deleteJournalEntry(id);
            });
        });
    }

    deleteJournalEntry(id) {
        if (confirm('Are you sure you want to delete this dream?')) {
            this.dreamJournal = this.dreamJournal.filter(entry => entry.id !== id);
            this.saveJournal();
            this.displayJournal();
        }
    }

    async handleUpgrade() {
        try {
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
                readingType: 'dream-analysis',
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
                upgradeBtn.textContent = 'Upgrade for $4.99';
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

    resetDream() {
        this.currentDream = '';
        this.detectedSymbols = [];
        document.getElementById('dream-input').value = '';
        this.updateCharCount();
        document.getElementById('results-section').style.display = 'none';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new DreamInterpreterApp();
});
