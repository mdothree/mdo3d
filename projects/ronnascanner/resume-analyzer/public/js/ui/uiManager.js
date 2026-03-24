/**
 * UI Manager - Handles all UI updates and animations
 */

export class UIManager {
    constructor() {
        this.uploadSection = document.getElementById('upload-section');
        this.progressSection = document.getElementById('upload-progress');
        this.resultsSection = document.getElementById('results-section');
    }

    showProgress() {
        this.uploadSection.querySelector('.upload-box').style.display = 'none';
        this.progressSection.style.display = 'block';
    }

    hideProgress() {
        this.uploadSection.querySelector('.upload-box').style.display = 'block';
        this.progressSection.style.display = 'none';
    }

    updateProgress(percent, text) {
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        
        progressFill.style.width = `${percent}%`;
        progressText.textContent = text;
    }

    showResults(analysis) {
        // Hide upload section
        this.uploadSection.style.display = 'none';
        
        // Show results section
        this.resultsSection.style.display = 'block';
        
        // Animate score
        this.animateScore(analysis.score);
        
        // Update score label
        this.updateScoreLabel(analysis.score);
        
        // Display issues
        this.displayIssues(analysis.issues);
        
        // Scroll to results
        this.resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    animateScore(targetScore) {
        const scoreNumber = document.getElementById('score-number');
        const scoreCircle = document.getElementById('score-circle');
        const circumference = 2 * Math.PI * 90; // radius is 90
        
        let currentScore = 0;
        const duration = 2000; // 2 seconds
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            currentScore = Math.round(targetScore * easeOut);
            
            // Update number
            scoreNumber.textContent = currentScore;
            
            // Update circle
            const offset = circumference - (currentScore / 100) * circumference;
            scoreCircle.style.strokeDashoffset = offset;
            
            // Update color based on score
            if (currentScore < 50) {
                scoreCircle.style.stroke = '#ef4444'; // red
            } else if (currentScore < 75) {
                scoreCircle.style.stroke = '#f59e0b'; // orange
            } else {
                scoreCircle.style.stroke = '#10b981'; // green
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }

    updateScoreLabel(score) {
        const label = document.getElementById('score-label');
        
        if (score < 50) {
            label.textContent = 'Needs Significant Improvement';
            label.style.color = '#ef4444';
        } else if (score < 70) {
            label.textContent = 'Needs Improvement';
            label.style.color = '#f59e0b';
        } else if (score < 85) {
            label.textContent = 'Good';
            label.style.color = '#10b981';
        } else {
            label.textContent = 'Excellent';
            label.style.color = '#10b981';
        }
    }

    displayIssues(issues) {
        const issuesList = document.getElementById('issues-list');
        issuesList.innerHTML = '';
        
        if (issues.length === 0) {
            issuesList.innerHTML = '<li>No major issues found! Your resume looks good.</li>';
            return;
        }
        
        issues.forEach(issue => {
            const li = document.createElement('li');
            li.innerHTML = `
                <strong>${issue.title}</strong><br>
                <span style="color: var(--text-light);">${issue.description}</span>
            `;
            
            // Color code based on severity
            if (issue.severity === 'high') {
                li.style.borderLeftColor = '#ef4444';
            } else if (issue.severity === 'medium') {
                li.style.borderLeftColor = '#f59e0b';
            } else {
                li.style.borderLeftColor = '#3b82f6';
            }
            
            issuesList.appendChild(li);
        });
    }

    showError(message) {
        alert(message);
    }
}
