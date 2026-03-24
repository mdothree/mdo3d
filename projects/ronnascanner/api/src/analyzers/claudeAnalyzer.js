import Anthropic from '@anthropic-ai/sdk';

/**
 * Claude API integration for advanced resume analysis
 * Used for premium tier features
 */

export class ClaudeAnalyzer {
  constructor(apiKey) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY
    });
  }

  async analyzePremium(resumeText, atsScore, issues) {
    try {
      const message = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: this.buildPrompt(resumeText, atsScore, issues)
        }]
      });

      return this.parseResponse(message.content[0].text);
    } catch (error) {
      console.error('Claude API error:', error);
      throw new Error('Failed to generate AI analysis');
    }
  }

  buildPrompt(resumeText, atsScore, issues) {
    return `You are an expert resume reviewer and ATS optimization specialist. Analyze this resume and provide detailed, actionable feedback.

RESUME TEXT:
${resumeText}

CURRENT ATS SCORE: ${atsScore}/100

IDENTIFIED ISSUES:
${issues.map((issue, i) => `${i + 1}. ${issue.title}: ${issue.description}`).join('\n')}

Please provide:

1. DETAILED ISSUE ANALYSIS
   - Expand on each identified issue
   - Explain why it matters for ATS systems
   - Provide specific examples from the resume

2. KEYWORD OPTIMIZATION
   - List missing industry-standard keywords
   - Suggest where to naturally integrate them
   - Recommend technical skills to highlight

3. CONTENT IMPROVEMENTS
   - Identify weak bullet points
   - Suggest stronger action verbs
   - Recommend quantifiable achievements to add

4. SECTION-BY-SECTION REWRITE SUGGESTIONS
   For each major section (Summary, Experience, Skills):
   - Quote the current version
   - Provide an improved rewrite
   - Explain what makes it better

5. FORMATTING RECOMMENDATIONS
   - Suggest structural improvements
   - Recommend sections to add/remove
   - Advise on length and organization

Format your response as JSON with this structure:
{
  "detailedAnalysis": { "issues": [...] },
  "keywords": { "missing": [...], "suggestions": [...] },
  "improvements": { "bulletPoints": [...], "achievements": [...] },
  "rewrites": { "summary": {...}, "experience": [...], "skills": {...} },
  "formatting": { "recommendations": [...] }
}`;
  }

  parseResponse(responseText) {
    try {
      // Try to parse as JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // If not JSON, return structured fallback
      return {
        detailedAnalysis: { text: responseText },
        keywords: { missing: [], suggestions: [] },
        improvements: { bulletPoints: [], achievements: [] },
        rewrites: {},
        formatting: { recommendations: [] }
      };
    } catch (error) {
      console.error('Error parsing Claude response:', error);
      return { text: responseText };
    }
  }

  async generateSummaryRewrite(currentSummary, jobTarget = 'general') {
    try {
      const message = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `Rewrite this resume summary to be more ATS-friendly and impactful for ${jobTarget} positions:

CURRENT SUMMARY:
${currentSummary}

Requirements:
- Use strong action verbs
- Include relevant keywords
- Quantify achievements where possible
- Keep it concise (3-4 sentences)
- Make it ATS-scannable

Provide only the rewritten summary, no explanations.`
        }]
      });

      return message.content[0].text.trim();
    } catch (error) {
      console.error('Claude API error:', error);
      throw new Error('Failed to generate summary rewrite');
    }
  }

  async improveExperienceBullet(bulletPoint, role) {
    try {
      const message = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `Improve this resume bullet point for a ${role} position:

"${bulletPoint}"

Make it:
- Start with a strong action verb
- Include quantifiable results
- Be specific and impactful
- ATS-friendly

Provide only the improved bullet point, no explanations.`
        }]
      });

      return message.content[0].text.trim();
    } catch (error) {
      console.error('Claude API error:', error);
      throw new Error('Failed to improve bullet point');
    }
  }

  async suggestKeywords(resumeText, targetIndustry) {
    try {
      const message = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: `Analyze this resume for a ${targetIndustry} position and suggest missing keywords that would improve ATS compatibility:

${resumeText}

Provide:
1. Technical skills missing (10-15 keywords)
2. Soft skills to emphasize (5-8 keywords)
3. Industry-specific terms (5-10 keywords)
4. Action verbs to use (10 verbs)

Format as JSON:
{
  "technical": ["keyword1", "keyword2", ...],
  "soft": ["keyword1", "keyword2", ...],
  "industry": ["term1", "term2", ...],
  "actionVerbs": ["verb1", "verb2", ...]
}`
        }]
      });

      const responseText = message.content[0].text;
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return {
        technical: [],
        soft: [],
        industry: [],
        actionVerbs: []
      };
    } catch (error) {
      console.error('Claude API error:', error);
      throw new Error('Failed to suggest keywords');
    }
  }

  async compareVersions(originalText, improvedText) {
    try {
      const message = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Compare these two resume versions and explain the improvements:

ORIGINAL:
${originalText}

IMPROVED:
${improvedText}

Provide a side-by-side comparison highlighting:
1. New keywords added
2. Stronger action verbs used
3. Quantifiable results included
4. Structure improvements
5. Overall ATS score impact

Format as JSON:
{
  "improvements": [
    { "category": "keywords", "changes": [...] },
    { "category": "action_verbs", "changes": [...] },
    ...
  ],
  "estimatedScoreIncrease": 10
}`
        }]
      });

      const responseText = message.content[0].text;
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return { improvements: [], estimatedScoreIncrease: 0 };
    } catch (error) {
      console.error('Claude API error:', error);
      throw new Error('Failed to compare versions');
    }
  }
}
