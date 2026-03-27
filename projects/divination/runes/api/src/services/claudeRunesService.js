import Anthropic from '@anthropic-ai/sdk';

/**
 * Claude AI Runes Interpretation Service
 * Generates personalized rune readings
 */

export class ClaudeRunesService {
  constructor(apiKey) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY
    });
  }

  async generateRuneReading(runes, userQuestion, spreadType = 'single') {
    try {
      const prompt = this.buildReadingPrompt(runes, userQuestion, spreadType);

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
      throw new Error('Failed to generate rune reading');
    }
  }

  buildReadingPrompt(runes, userQuestion, spreadType) {
    const positions = this.getPositions(spreadType);

    const runeDescriptions = runes.map((rune, index) => {
      const position = positions[index] || `Rune ${index + 1}`;
      const isReversed = rune.isReversed || false;
      const meaning = isReversed ? rune.reversed : rune.upright;

      return `
${position}: ${rune.symbol} ${rune.name} ${isReversed ? '(Reversed)' : '(Upright)'}
Phonetic Sound: ${rune.phoneticSound || 'N/A'}
Element: ${rune.element || 'N/A'}
Core Meaning: ${rune.meaning}
${isReversed ? 'Reversed' : 'Upright'} Interpretation: ${meaning?.meaning || 'N/A'}
Guidance: ${meaning?.guidance || 'N/A'}
`;
    }).join('\n');

    return `You are a wise Norse rune reader and seer, deeply versed in the Elder Futhark, Scandinavian mythology, and the ancestral wisdom of the Northern traditions. Generate a personalized rune reading for someone who has cast the following runes.

USER'S QUESTION: "${userQuestion || 'General guidance for my path ahead'}"

RUNES CAST:
${runeDescriptions}

SPREAD TYPE: ${spreadType} (${runes.length} rune${runes.length > 1 ? 's' : ''})

Please provide a warm, insightful, and personalized reading that:

1. **Opening Invocation**: Begin with a respectful acknowledgment of the ancient wisdom. Set a contemplative, empowering tone that honors the Norse traditions.

2. **Rune Interpretation**: Weave together the meanings of all runes cast, showing how they relate to each other and the seeker's question. Explain each rune's symbolism and how it applies to their situation.

3. **Deep Insights**: Provide 2-3 paragraphs of wisdom that goes beyond surface meanings. Connect to themes of fate (wyrd), personal power, transformation, and the cycles of life. Reference relevant Norse mythology where appropriate.

4. **Practical Guidance**: Give 3-4 specific, actionable steps they can take based on this reading. Ground these in the runes' teachings.

5. **Closing Blessing**: End with a traditional-style blessing or affirmation that encapsulates the reading's message.

Format your response as JSON:
{
  "opening": "invocation and opening paragraph",
  "interpretation": "detailed rune interpretation",
  "insights": ["insight 1", "insight 2", "insight 3"],
  "actionSteps": ["step 1", "step 2", "step 3", "step 4"],
  "blessing": "closing blessing or affirmation"
}

Be mystical yet grounded, ancient yet practical. Make the reading feel like guidance from the ancestors themselves.`;
  }

  getPositions(spreadType) {
    switch (spreadType) {
      case 'single':
        return ['Present Guidance'];
      case 'three':
        return ['Past Influences', 'Present Situation', 'Future Potential'];
      case 'five':
        return ['Past', 'Present', 'Future', 'Root Cause', 'Higher Guidance'];
      default:
        return Array.from({ length: 10 }, (_, i) => `Position ${i + 1}`);
    }
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
        blessing: "May the runes guide your path."
      };
    } catch (error) {
      console.error('Error parsing Claude response:', error);
      return {
        opening: "The runes have spoken with ancient wisdom for you today.",
        interpretation: responseText,
        insights: [],
        actionSteps: [],
        blessing: "Walk with the wisdom of the ancestors."
      };
    }
  }

  async generateQuickInsight(rune, userQuestion) {
    try {
      const message = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `As a Norse rune reader, provide a brief (2-3 sentences) insight for someone who drew the rune "${rune.symbol} ${rune.name}" and asked: "${userQuestion || 'What message do the runes have for me?'}". Be wise, warm, and specific to their situation.`
        }]
      });

      return message.content[0].text.trim();
    } catch (error) {
      console.error('Claude API error:', error);
      return rune.upright?.brief || rune.meaning || 'The runes invite you to reflect.';
    }
  }
}
