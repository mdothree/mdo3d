import Anthropic from '@anthropic-ai/sdk';

/**
 * Claude AI I Ching Interpretation Service
 * Generates personalized hexagram readings
 */

export class ClaudeIChingService {
  constructor(apiKey) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY
    });
  }

  async generateHexagramReading(hexagram, userQuestion, changingLines = []) {
    try {
      const prompt = this.buildReadingPrompt(hexagram, userQuestion, changingLines);

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
      throw new Error('Failed to generate I Ching reading');
    }
  }

  buildReadingPrompt(hexagram, userQuestion, changingLines) {
    const changingLinesText = changingLines.length > 0
      ? `\nCHANGING LINES: Lines ${changingLines.join(', ')} are changing, indicating transformation.`
      : '';

    return `You are a wise I Ching scholar and interpreter with deep knowledge of ancient Chinese philosophy, Taoist wisdom, and the profound symbolism of the 64 hexagrams. Generate a personalized reading for someone who has cast the following hexagram.

USER'S QUESTION: "${userQuestion || 'General guidance for my current situation'}"

HEXAGRAM RECEIVED:
Number: ${hexagram.id} - ${hexagram.name}
Chinese: ${hexagram.chinese}
Symbol: ${hexagram.symbol}
Upper Trigram: ${hexagram.trigrams?.upper || 'Unknown'}
Lower Trigram: ${hexagram.trigrams?.lower || 'Unknown'}
Keywords: ${hexagram.keywords?.join(', ') || 'N/A'}
Core Meaning: ${hexagram.upper?.meaning || hexagram.meaning || 'N/A'}
Traditional Guidance: ${hexagram.upper?.guidance || hexagram.guidance || 'N/A'}
The Image: ${hexagram.image || 'N/A'}
${changingLinesText}

Please provide a warm, insightful, and personalized reading that:

1. **Opening Reflection**: Acknowledge their question with wisdom and set a contemplative, supportive tone. Reference the hexagram's symbolic imagery.

2. **Hexagram Interpretation**: Explain what this hexagram represents in the context of their question. Draw from traditional I Ching wisdom while making it personally relevant. Discuss the interplay of the upper and lower trigrams.

3. **Deep Insights**: Provide 2-3 paragraphs of philosophical wisdom that goes beyond surface meanings. Connect to universal themes of change, balance, timing, and the Tao.

4. **Practical Guidance**: Give 3-4 specific, actionable steps they can take based on this reading. These should be grounded in the hexagram's wisdom.

5. **Closing Wisdom**: End with a brief meditation or affirmation that encapsulates the hexagram's message.

Format your response as JSON:
{
  "opening": "reflective opening paragraph",
  "interpretation": "detailed hexagram interpretation",
  "insights": ["insight 1", "insight 2", "insight 3"],
  "actionSteps": ["step 1", "step 2", "step 3", "step 4"],
  "closingWisdom": "meditation or affirmation"
}

Be philosophical yet accessible, ancient yet practical. Make the reading feel like wisdom channeled specifically for their situation.`;
  }

  parseReadingResponse(responseText) {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {
        opening: responseText.substring(0, 200),
        interpretation: responseText,
        insights: [],
        actionSteps: [],
        closingWisdom: "Trust in the wisdom of change."
      };
    } catch (error) {
      console.error('Error parsing Claude response:', error);
      return {
        opening: "The ancient oracle has spoken with wisdom for you today.",
        interpretation: responseText,
        insights: [],
        actionSteps: [],
        closingWisdom: "Embrace the flow of the Tao."
      };
    }
  }

  async generateQuickInsight(hexagram, userQuestion) {
    try {
      const message = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `As an I Ching scholar, provide a brief (2-3 sentences) insight for someone who received Hexagram ${hexagram.id} "${hexagram.name}" (${hexagram.chinese}) and asked: "${userQuestion || 'What guidance does the oracle offer?'}". Be wise, warm, and specific.`
        }]
      });

      return message.content[0].text.trim();
    } catch (error) {
      console.error('Claude API error:', error);
      return hexagram.upper?.brief || hexagram.meaning || 'Contemplate the changes before you.';
    }
  }
}
