/**
 * ATS Analyzer - Analyzes resume for ATS compatibility
 * Checks formatting, keywords, sections, and other ATS-friendly criteria
 */

export class ATSAnalyzer {
    constructor() {
        // Common ATS-friendly keywords by category
        this.keywords = {
            technical: ['JavaScript', 'Python', 'Java', 'React', 'Node.js', 'SQL', 'AWS', 'Git', 'Docker'],
            soft: ['leadership', 'communication', 'teamwork', 'problem solving', 'analytical'],
            action: ['developed', 'led', 'implemented', 'improved', 'designed', 'created', 'managed']
        };

        // Required resume sections
        this.requiredSections = [
            'contact', 'email', 'phone',
            'experience', 'work',
            'education',
            'skills'
        ];
    }

    async analyze(resumeText) {
        const text = resumeText.toLowerCase();
        const lines = resumeText.split('\n');

        // Perform all analyses
        const scores = {
            keywords: this.analyzeKeywords(text),
            sections: this.analyzeSections(text),
            formatting: this.analyzeFormatting(lines),
            length: this.analyzeLength(text),
            contact: this.analyzeContact(resumeText)
        };

        // Calculate overall score
        const overallScore = this.calculateOverallScore(scores);

        // Identify top issues
        const issues = this.identifyIssues(scores, resumeText);

        return {
            score: overallScore,
            breakdown: scores,
            issues: issues,
            recommendations: this.generateRecommendations(scores, issues)
        };
    }

    analyzeKeywords(text) {
        const found = {
            technical: 0,
            soft: 0,
            action: 0
        };

        // Count keywords in each category
        for (const [category, keywords] of Object.entries(this.keywords)) {
            keywords.forEach(keyword => {
                if (text.includes(keyword.toLowerCase())) {
                    found[category]++;
                }
            });
        }

        // Calculate score (out of 100)
        const technicalScore = Math.min((found.technical / this.keywords.technical.length) * 100, 100);
        const softScore = Math.min((found.soft / this.keywords.soft.length) * 100, 100);
        const actionScore = Math.min((found.action / this.keywords.action.length) * 100, 100);

        const avgScore = (technicalScore + softScore + actionScore) / 3;

        return {
            score: Math.round(avgScore),
            found,
            total: this.keywords
        };
    }

    analyzeSections(text) {
        const foundSections = [];
        const missingSections = [];

        this.requiredSections.forEach(section => {
            if (text.includes(section)) {
                foundSections.push(section);
            } else {
                missingSections.push(section);
            }
        });

        const score = (foundSections.length / this.requiredSections.length) * 100;

        return {
            score: Math.round(score),
            found: foundSections,
            missing: missingSections
        };
    }

    analyzeFormatting(lines) {
        let score = 100;
        const issues = [];

        // Check for excessive blank lines
        const blankLines = lines.filter(line => line.trim() === '').length;
        if (blankLines > lines.length * 0.3) {
            score -= 15;
            issues.push('Too many blank lines');
        }

        // Check for consistent formatting
        const bulletPoints = lines.filter(line => line.trim().match(/^[•\-\*]/)).length;
        if (bulletPoints > 0 && bulletPoints < 3) {
            score -= 10;
            issues.push('Inconsistent bullet point usage');
        }

        // Check for ALL CAPS (ATS may have trouble)
        const allCapsLines = lines.filter(line => {
            const trimmed = line.trim();
            return trimmed.length > 5 && trimmed === trimmed.toUpperCase();
        }).length;
        
        if (allCapsLines > 3) {
            score -= 10;
            issues.push('Excessive use of ALL CAPS');
        }

        return {
            score: Math.max(score, 0),
            issues
        };
    }

    analyzeLength(text) {
        const wordCount = text.split(/\s+/).length;
        let score = 100;
        const issues = [];

        // Ideal resume: 400-800 words
        if (wordCount < 300) {
            score = 60;
            issues.push('Resume is too short - add more detail');
        } else if (wordCount > 1000) {
            score = 70;
            issues.push('Resume is too long - consider condensing');
        } else if (wordCount < 400) {
            score = 80;
        }

        return {
            score,
            wordCount,
            issues
        };
    }

    analyzeContact(text) {
        let score = 0;
        const found = [];

        // Email
        if (/[\w\.-]+@[\w\.-]+\.\w+/.test(text)) {
            score += 40;
            found.push('email');
        }

        // Phone
        if (/\(?\d{3}\)?[\s\.-]?\d{3}[\s\.-]?\d{4}/.test(text)) {
            score += 30;
            found.push('phone');
        }

        // LinkedIn
        if (/linkedin\.com/i.test(text)) {
            score += 30;
            found.push('linkedin');
        }

        return {
            score,
            found
        };
    }

    calculateOverallScore(scores) {
        // Weighted average of all scores
        const weights = {
            keywords: 0.30,
            sections: 0.25,
            formatting: 0.20,
            length: 0.15,
            contact: 0.10
        };

        let totalScore = 0;
        for (const [category, weight] of Object.entries(weights)) {
            totalScore += scores[category].score * weight;
        }

        return Math.round(totalScore);
    }

    identifyIssues(scores, text) {
        const issues = [];

        // Top 3 issues for free tier
        if (scores.contact.score < 100) {
            const missing = [];
            if (!scores.contact.found.includes('email')) missing.push('email');
            if (!scores.contact.found.includes('phone')) missing.push('phone number');
            if (!scores.contact.found.includes('linkedin')) missing.push('LinkedIn profile');
            
            if (missing.length > 0) {
                issues.push({
                    severity: 'high',
                    title: 'Missing Contact Information',
                    description: `Add ${missing.join(', ')} to make it easier for recruiters to reach you.`
                });
            }
        }

        if (scores.keywords.score < 50) {
            issues.push({
                severity: 'high',
                title: 'Insufficient Keywords',
                description: 'Your resume lacks industry-specific keywords that ATS systems look for. Add more technical skills and action verbs.'
            });
        }

        if (scores.sections.missing.length > 0) {
            issues.push({
                severity: 'medium',
                title: 'Missing Important Sections',
                description: `Consider adding these sections: ${scores.sections.missing.slice(0, 2).join(', ')}.`
            });
        }

        if (scores.formatting.issues.length > 0) {
            issues.push({
                severity: 'medium',
                title: 'Formatting Issues',
                description: scores.formatting.issues[0]
            });
        }

        if (scores.length.issues.length > 0) {
            issues.push({
                severity: 'low',
                title: 'Length Issue',
                description: scores.length.issues[0]
            });
        }

        // Return top 3 issues for free tier
        return issues.slice(0, 3);
    }

    generateRecommendations(scores, issues) {
        const recommendations = [];

        // Generate actionable recommendations
        if (scores.keywords.score < 70) {
            recommendations.push('Add more industry-specific keywords and technical skills');
        }

        if (scores.contact.score < 100) {
            recommendations.push('Include complete contact information (email, phone, LinkedIn)');
        }

        if (scores.sections.missing.length > 0) {
            recommendations.push('Add missing sections to create a complete resume');
        }

        return recommendations;
    }
}
