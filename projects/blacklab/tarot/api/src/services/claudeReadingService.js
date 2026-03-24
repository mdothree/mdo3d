import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Claude AI Service for Tarot Readings
 * Generates personalized tarot interpretations using Claude 3.5 Sonnet
 */

export class ClaudeReadingService {
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    this.model = 'claude-3-5-sonnet-20241022';
  }

  /**
   * Generate tarot reading interpretation
   * @param {Object} params - Reading parameters
   * @param {Array} params.cards - Array of drawn cards
   * @param {string} params.question - User's question
   * @param {string} params.spreadType - Type of spread (single, three, celtic)
   * @param {boolean} params.premium - Whether this is a premium reading
   * @returns {Promise<Object>} - Reading interpretation
   */
  async generateReading({ cards, question, spreadType, premium = false }) {
    try {
      const prompt = this.buildPrompt(cards, question, spreadType, premium);
      
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: premium ? 2000 : 800,
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
        cards: cards.map(card => ({
          name: card.name,
          suit: card.suit || 'Major Arcana',
          reversed: card.reversed || false,
          position: card.position
        })),
        spreadType,
        premium,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Claude reading error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Build prompt for Claude based on spread type and premium status
   */
  buildPrompt(cards, question, spreadType, premium) {
    let systemContext = `You are an expert tarot reader with deep knowledge of the 78-card tarot deck. Provide insightful, meaningful interpretations that help people gain clarity and perspective.

**Important Guidelines:**
- Be compassionate, insightful, and empowering
- Focus on personal growth and self-reflection
- Acknowledge both upright and reversed meanings
- Connect the cards to the user's specific question
- Use clear, accessible language
- Avoid absolute predictions; focus on possibilities and advice`;

    if (premium) {
      systemContext += `\n- This is a PREMIUM reading: provide extensive detail, psychological depth, and actionable guidance
- Include specific advice and concrete steps
- Explore multiple layers of meaning
- Connect patterns across the spread`;
    } else {
      systemContext += `\n- This is a FREE reading: provide a helpful overview with key insights
- Keep interpretation concise but meaningful`;
    }

    let cardDescriptions = '';
    
    if (spreadType === 'single') {
      const card = cards[0];
      cardDescriptions = `Card Drawn: ${card.name}${card.reversed ? ' (Reversed)' : ''}
Suit: ${card.suit || 'Major Arcana'}
Position: Single Card Reading`;

    } else if (spreadType === 'three') {
      cardDescriptions = cards.map((card, i) => {
        const positions = ['Past', 'Present', 'Future'];
        return `${positions[i]}: ${card.name}${card.reversed ? ' (Reversed)' : ''}\nSuit: ${card.suit || 'Major Arcana'}`;
      }).join('\n\n');

    } else if (spreadType === 'celtic') {
      const positions = [
        'Present Situation',
        'Challenge',
        'Past Foundation',
        'Recent Past',
        'Crown (Potential)',
        'Near Future',
        'Self Perception',
        'External Influences',
        'Hopes and Fears',
        'Outcome'
      ];
      
      cardDescriptions = cards.map((card, i) => {
        return `${i + 1}. ${positions[i]}: ${card.name}${card.reversed ? ' (Reversed)' : ''}\n   Suit: ${card.suit || 'Major Arcana'}`;
      }).join('\n\n');
    }

    const prompt = `${systemContext}

**User's Question:** "${question || 'General guidance'}"

**Spread Type:** ${spreadType === 'single' ? 'Single Card' : spreadType === 'three' ? 'Three Card (Past-Present-Future)' : 'Celtic Cross (10-card)'}

**Cards Drawn:**
${cardDescriptions}

Please provide a ${premium ? 'detailed, in-depth' : 'concise'} tarot reading interpretation that:
1. Explains the meaning of each card in its position
2. Addresses the user's question directly
3. Provides practical guidance and insights
4. ${premium ? 'Offers specific action steps and deep psychological insights' : 'Gives clear, actionable advice'}
5. Ends with an encouraging, empowering message`;

    return prompt;
  }

  /**
   * Generate quick card meaning (for free tier)
   */
  async getCardMeaning(cardName, reversed = false) {
    try {
      const prompt = `Provide a brief, insightful meaning for the tarot card "${cardName}"${reversed ? ' in reversed position' : ''}.

Keep it to 2-3 sentences that are practical and empowering.`;

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
      console.error('Card meaning error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
