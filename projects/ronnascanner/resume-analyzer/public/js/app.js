import { apiClient } from './config/api.js';
import { UIManager } from './ui/uiManager.js';
import { authService } from './services/authService.js';
import { firebaseConfig } from './config/firebase.js';
import { SocialShare } from '../../../shared/ui-components/SocialShare.js';
import { ShareImageGenerator } from '../../../shared/ui-components/ShareImageGenerator.js';

class ResumeAnalyzerApp {
    constructor() {
        this.api = apiClient;
        this.ui = new UIManager();
        this.auth = authService;
        this.currentAnalysis = null;
        this.currentFile = null;
        this.socialShare = new SocialShare({
            title: 'Resume Analyzer - ATS Score',
            hashtags: ['Resume', 'Career', 'JobSearch', 'ATS'],
            via: 'ResumeAnalyzer'
        });
        
        this.initialize();
    }

    async initialize() {
        // Initialize Firebase
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
            console.warn('Backend API may be offline. Some features may not work.');
        }
    }

    initializeEventListeners() {
        // File upload
        const uploadBox = document.getElementById('upload-box');
        const fileInput = document.getElementById('file-input');
        const browseBtn = document.getElementById('browse-btn');

        browseBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Drag and drop
        uploadBox.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadBox.classList.add('dragover');
        });

        uploadBox.addEventListener('dragleave', () => {
            uploadBox.classList.remove('dragover');
        });

        uploadBox.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadBox.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.processFile(files[0]);
            }
        });

        uploadBox.addEventListener('click', () => fileInput.click());

        // Email form
        const emailForm = document.getElementById('email-form');
        emailForm.addEventListener('submit', (e) => this.handleEmailSubmit(e));

        // Upgrade button
        const upgradeBtn = document.getElementById('upgrade-btn');
        upgradeBtn.addEventListener('click', () => this.handleUpgrade());

        // Share button
        const shareBtn = document.getElementById('share-btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => this.shareScore());
        }
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    async processFile(file) {
        // Validate file
        if (!this.validateFile(file)) {
            return;
        }

        this.currentFile = file;

        try {
            // Show progress
            this.ui.showProgress();

            // Upload and analyze via API
            this.ui.updateProgress(30, 'Uploading resume...');
            this.ui.updateProgress(60, 'Analyzing ATS compatibility...');
            
            const result = await this.api.uploadAndAnalyze(file);

            if (!result.success) {
                throw new Error(result.error || 'Analysis failed');
            }

            this.currentAnalysis = {
                score: result.score,
                issues: result.issues,
                breakdown: result.breakdown
            };

            // Show results
            this.ui.updateProgress(100, 'Complete!');
            setTimeout(() => {
                this.ui.showResults(this.currentAnalysis);
            }, 500);

        } catch (error) {
            console.error('Error processing file:', error);
            alert('Error processing your resume. Please try again or contact support.');
            this.ui.hideProgress();
        }
    }

    validateFile(file) {
        const maxSize = 5 * 1024 * 1024; // 5MB
        const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

        if (file.size > maxSize) {
            alert('File is too large. Maximum size is 5MB.');
            return false;
        }

        if (!allowedTypes.includes(file.type)) {
            alert('Invalid file type. Please upload a PDF or Word document.');
            return false;
        }

        return true;
    }

    async handleEmailSubmit(event) {
        event.preventDefault();
        const email = document.getElementById('email-input').value;
        
        if (!this.currentAnalysis) {
            alert('Please upload and analyze a resume first.');
            return;
        }

        try {
            const result = await this.api.sendEmailReport(email, this.currentAnalysis);
            
            if (result.success) {
                alert(`Free report sent to ${email}! Check your inbox.`);
                this.trackEmailCapture(email);
            } else {
                throw new Error('Failed to send email');
            }
        } catch (error) {
            console.error('Email error:', error);
            alert('Failed to send email. Please try again.');
        }
    }

    async handleUpgrade() {
        if (!this.currentAnalysis) {
            alert('Please upload and analyze a resume first.');
            return;
        }

        try {
            const user = this.auth.getCurrentUser();
            const email = user?.email || prompt('Enter your email:');
            
            if (!email) return;

            // Create Stripe checkout session
            const result = await this.api.createCheckoutSession(
                user?.uid || 'guest',
                email,
                Date.now().toString()
            );

            if (result.success && result.url) {
                // Redirect to Stripe checkout
                window.location.href = result.url;
            } else {
                throw new Error('Failed to create checkout session');
            }
        } catch (error) {
            console.error('Upgrade error:', error);
            alert('Failed to initiate upgrade. Please try again.');
        }
    }

    async shareScore() {
        if (!this.currentAnalysis) {
            alert('Please upload and analyze a resume first.');
            return;
        }

        try {
            // Generate share image
            const imageBlob = await ShareImageGenerator.generateResumeScoreImage({
                score: this.currentAnalysis.score,
                label: this.getScoreLabel(this.currentAnalysis.score),
                topIssues: this.currentAnalysis.issues.slice(0, 3)
            });

            // Get score description for sharing
            const scoreLabel = this.getScoreLabel(this.currentAnalysis.score);
            const description = `I got a ${this.currentAnalysis.score}/100 ATS score (${scoreLabel})! Check your resume's compatibility with applicant tracking systems.`;

            // Share using the social share component
            await this.socialShare.share({
                text: description,
                url: window.location.origin,
                image: imageBlob
            });

            // Track share event
            this.trackShareEvent();

        } catch (error) {
            console.error('Share error:', error);
            // Still allow sharing even if image generation fails
            const scoreLabel = this.getScoreLabel(this.currentAnalysis.score);
            const fallbackText = `I got a ${this.currentAnalysis.score}/100 ATS score on Resume Analyzer! Find out if your resume will pass applicant tracking systems.`;
            
            await this.socialShare.share({
                text: fallbackText,
                url: window.location.origin
            });
        }
    }

    getScoreLabel(score) {
        if (score >= 90) return 'Excellent';
        if (score >= 80) return 'Great';
        if (score >= 70) return 'Good';
        if (score >= 60) return 'Fair';
        return 'Needs Improvement';
    }

    async trackShareEvent() {
        try {
            const db = firebaseConfig.getFirestore();
            if (db) {
                await db.collection('analytics').add({
                    event: 'share',
                    score: this.currentAnalysis.score,
                    timestamp: new Date(),
                    platform: 'resume_analyzer'
                });
                console.log('Share event tracked');
            }
        } catch (error) {
            console.error('Failed to track share:', error);
        }
    }

    async trackEmailCapture(email) {
        try {
            const db = firebaseConfig.getFirestore();
            if (db) {
                await db.collection('leads').add({
                    email,
                    score: this.currentAnalysis.score,
                    timestamp: new Date(),
                    source: 'free_tier'
                });
                console.log('Lead captured:', email);
            }
        } catch (error) {
            console.error('Failed to track lead:', error);
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ResumeAnalyzerApp();
});
