import Anthropic from '@anthropic-ai/sdk';

/**
 * Claude AI Reading Service
 * Generates personalized oracle card readings
 */

export class ClaudeReadingService {
  constructor(apiKey) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY
    });
  }

  async generatePersonalizedReading(cards, userQuestion, spreadType = 'single') {
    try {
      const prompt = this.buildReadingPrompt(cards, userQuestion, spreadType);

      const message = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      return this.parseReadingResponse(message.content[0].text);
    } catch (error) {
      console.error('Claude API error:', error);
      throw new Error('Failed to generate reading');
    }
  }

  buildReadingPrompt(cards, userQuestion, spreadType) {
    const cardDescriptions = cards.map((card, index) => {
      const position = this.getPosition(index, spreadType);
      return `
${position}: ${card.name}
Element: ${card.element}
Theme: ${card.theme}
Keywords: ${card.keywords.join(', ')}
Upright Meaning: ${card.upright.meaning}
Guidance: ${card.upright.guidance}
`;
    }).join('\n');

    return `You are a compassionate and intuitive oracle card reader with deep spiritual wisdom. Generate a personalized reading for someone who drew these cards.

USER'S QUESTION: "${userQuestion || 'General guidance for today'}"

CARDS DRAWN:
${cardDescriptions}

SPREAD TYPE: ${spreadType}

Please provide a warm, insightful, and personalized reading that:

1. **Opening**: Acknowledge their question with empathy and set a supportive tone

2. **Card Interpretation**: Weave together the meanings of all cards drawn, showing how they relate to each other and the querent's situation. Be specific to their question.

3. **Deep Insights**: Provide 2-3 paragraphs of spiritual wisdom that goes beyond the basic card meanings. Connect to universal themes of growth, love, purpose, and transformation.

4. **Practical Guidance**: Give 3-4 specific, actionable steps they can take based on this reading

5. **Affirmation**: End with a powerful, personalized affirmation that reinforces the reading's message

Format your response as JSON:
{
  "opening": "warm opening paragraph",
  "interpretation": "detailed card interpretation",
  "insights": ["insight 1", "insight 2", "insight 3"],
  "actionSteps": ["step 1", "step 2", "step 3", "step 4"],
  "affirmation": "I am... (powerful affirmation)"
}

Be mystical yet grounded, spiritual yet practical. Make the reading feel personally channeled for them.`;
  }

  getPosition(index, spreadType) {
    if (spreadType === 'single') {
      return 'Your Card';
    } else if (spreadType === 'three') {
      const positions = ['Past Influences', 'Present Situation', 'Future Potential'];
      return positions[index];
    } else if (spreadType === 'celtic') {
      const positions = [
        'Present Situation',
        'Challenge/Opportunity',
        'Past Foundation',
        'Recent Past',
        'Potential Future',
        'Near Future',
        'Your Approach',
        'External Influences',
        'Hopes and Fears',
        'Final Outcome'
      ];
      return positions[index];
    }
    return `Card ${index + 1}`;
  }

  parseReadingResponse(responseText) {
    try {
      // Try to extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback: return raw text structured
      return {
        opening: responseText.substring(0, 200),
        interpretation: responseText,
        insights: [],
        actionSteps: [],
        affirmation: "I trust the wisdom of the universe."
      };
    } catch (error) {
      console.error('Error parsing Claude response:', error);
      return {
        opening: "The cards have spoken with wisdom for you today.",
        interpretation: responseText,
        insights: [],
        actionSteps: [],
        affirmation: "I am open to divine guidance."
      };
    }
  }

  async generateQuickInsight(card, userQuestion) {
    try {
      const message = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `As an oracle card reader, provide a brief (2-3 sentences) personalized insight for someone who drew the "${card.name}" card and asked: "${userQuestion || 'What do I need to know today?'}". Be warm, specific, and encouraging.`
        }]
      });

      return message.content[0].text.trim();
    } catch (error) {
      console.error('Claude API error:', error);
      return card.upright.brief;
    }
  }
}
