import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Claude AI Service for Dream Interpretation
 * Generates personalized dream analysis using Claude 3.5 Sonnet
 */

export class ClaudeDreamService {
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    this.model = 'claude-3-5-sonnet-20241022';
  }

  /**
   * Generate dream interpretation
   * @param {Object} params - Dream parameters
   * @param {string} params.dreamText - User's dream description
   * @param {Array} params.detectedSymbols - Detected dream symbols
   * @param {boolean} params.premium - Whether this is a premium analysis
   * @returns {Promise<Object>} - Dream interpretation
   */
  async interpretDream({ dreamText, detectedSymbols = [], premium = false }) {
    try {
      const prompt = this.buildPrompt(dreamText, detectedSymbols, premium);
      
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: premium ? 2500 : 1000,
        temperature: 0.7,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const interpretation = message.content[0].text;

      return {
        success: true,
        interpretation,
        symbols: detectedSymbols,
        premium,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Claude dream interpretation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Build prompt for Claude based on premium status
   */
  buildPrompt(dreamText, detectedSymbols, premium) {
    let systemContext = `You are an expert dream analyst with knowledge of psychology, symbolism, and spiritual interpretation. Provide insightful, meaningful dream analysis that helps people understand their subconscious mind.

**Important Guidelines:**
- Be compassionate, insightful, and empowering
- Draw from Jungian psychology, archetypal symbolism, and universal dream meanings
- Consider both psychological and spiritual dimensions
- Connect symbols to personal growth and self-understanding
- Use clear, accessible language
- Acknowledge that dreams are highly personal`;

    if (premium) {
      systemContext += `\n\n**This is a PREMIUM analysis - provide:**
- Deep psychological insights and subconscious patterns
- Spiritual and symbolic meanings
- Connections between different symbols
- Specific actionable guidance
- Personal growth recommendations
- Emotional processing insights
- Integration suggestions`;
    } else {
      systemContext += `\n\n**This is a FREE analysis - provide:**
- Clear overview of main themes
- Key symbol meanings
- General insights
- Brief guidance`;
    }

    let symbolList = '';
    if (detectedSymbols.length > 0) {
      symbolList = `\n\n**Detected Symbols:**\n${detectedSymbols.map(s => `- ${s.name} (${s.category})`).join('\n')}`;
    }

    const prompt = `${systemContext}

**Dream Description:**
"${dreamText}"
${symbolList}

Please provide a ${premium ? 'comprehensive, in-depth' : 'concise'} dream interpretation that:

1. ${premium ? 'Explores the deep psychological and spiritual meanings' : 'Identifies the main themes and messages'}
2. ${premium ? 'Analyzes key symbols and their interconnections' : 'Explains the most significant symbols'}
3. ${premium ? 'Reveals subconscious patterns and emotional processing' : 'Provides basic insights into what the dream reveals'}
4. ${premium ? 'Offers specific guidance for personal growth and integration' : 'Gives brief practical guidance'}
5. ${premium ? 'Suggests concrete actions for working with the dream\'s wisdom' : 'Ends with an encouraging message'}

${premium ? 'Structure your response with clear sections: Overview, Symbol Analysis, Psychological Insights, Spiritual Meaning, and Personal Guidance.' : 'Keep your response organized and easy to understand.'}`;

    return prompt;
  }

  /**
   * Get quick symbol meaning
   */
  async getSymbolMeaning(symbolName) {
    try {
      const prompt = `Provide a brief dream interpretation for the symbol "${symbolName}".

Include both psychological and spiritual perspectives in 2-3 sentences.`;

      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 150,
        temperature: 0.7,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      return {
        success: true,
        meaning: message.content[0].text
      };

    } catch (error) {
      console.error('Symbol meaning error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Analyze dream patterns (for multiple dreams)
   */
  async analyzeDreamPatterns(dreams) {
    try {
      const dreamList = dreams.map((d, i) => 
        `Dream ${i + 1} (${new Date(d.date).toLocaleDateString()}):\n${d.text}`
      ).join('\n\n');

      const prompt = `As a dream analyst, identify recurring themes, symbols, and patterns across these dreams:

${dreamList}

Provide insights about:
1. Recurring symbols and themes
2. Emotional patterns
3. Possible meanings of these patterns
4. What the subconscious might be processing

Keep it concise but insightful (3-4 paragraphs).`;

      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 1000,
        temperature: 0.7,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      return {
        success: true,
        analysis: message.content[0].text,
        dreamCount: dreams.length
      };

    } catch (error) {
      console.error('Pattern analysis error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
