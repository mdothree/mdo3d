import Anthropic from '@anthropic-ai/sdk';

/**
 * Claude AI Astrology Interpretation Service
 * Generates personalized birth chart readings
 */

export class ClaudeAstrologyService {
  constructor(apiKey) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY
    });
  }

  async generateChartReading(chart, userQuestion) {
    try {
      const prompt = this.buildReadingPrompt(chart, userQuestion);

      const message = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      return this.parseReadingResponse(message.content[0].text);
    } catch (error) {
      console.error('Claude API error:', error);
      throw new Error('Failed to generate astrology reading');
    }
  }

  buildReadingPrompt(chart, userQuestion) {
    const { sun, moon, rising, birthDate, birthTime, location } = chart;

    return `You are an experienced astrologer with deep knowledge of natal chart interpretation, planetary aspects, and cosmic symbolism. Generate a personalized birth chart reading for someone with the following placements.

USER'S QUESTION OR FOCUS: "${userQuestion || 'General life path and personality insights'}"

BIRTH CHART DATA:
Birth Date: ${birthDate}
Birth Time: ${birthTime || 'Unknown'}
Location: ${location || 'Unknown'}

SUN SIGN: ${sun.sign.symbol} ${sun.sign.name}
- Element: ${sun.sign.element}
- Quality: ${sun.sign.quality}
- Ruler: ${sun.sign.ruler}
- Dates: ${sun.sign.dates}

MOON SIGN: ${moon.sign.symbol} ${moon.sign.name}
- Element: ${moon.sign.element}
- Quality: ${moon.sign.quality}
- Ruler: ${moon.sign.ruler}

RISING SIGN (Ascendant): ${rising.sign.symbol} ${rising.sign.name}
- Element: ${rising.sign.element}
- Quality: ${rising.sign.quality}
- Ruler: ${rising.sign.ruler}

Please provide a comprehensive, personalized birth chart reading that:

1. **Opening Cosmic Portrait**: Paint a vivid picture of who this person is at their core based on their "Big Three" (Sun, Moon, Rising). How do these energies combine to create their unique cosmic signature?

2. **Sun Sign Deep Dive**: Explore their Sun sign as their core identity, life purpose, and creative expression. What are they here to learn and express? How does their Sun element and quality shape their approach to life?

3. **Moon Sign Exploration**: Dive into their emotional nature, inner world, and subconscious patterns. How do they process feelings, what nurtures them, and what do they need for emotional security?

4. **Rising Sign Insights**: Analyze their social persona, first impressions, and life path direction. How do others perceive them, and what lessons are they learning through their ascendant?

5. **Elemental & Modal Balance**: Comment on the overall balance of elements and qualities in their Big Three. What patterns emerge? Any notable harmonies or tensions?

6. **Life Path Guidance**: Based on their cosmic blueprint, provide 3-4 specific insights about their life path, relationships, career direction, or personal growth.

7. **Affirmation**: End with a personalized cosmic affirmation that honors their unique chart.

Format your response as JSON:
{
  "cosmicPortrait": "opening synthesis paragraph",
  "sunSignReading": "detailed Sun sign interpretation",
  "moonSignReading": "detailed Moon sign interpretation",
  "risingSignReading": "detailed Rising sign interpretation",
  "elementalBalance": "analysis of elements and modalities",
  "lifePathInsights": ["insight 1", "insight 2", "insight 3", "insight 4"],
  "affirmation": "personalized cosmic affirmation"
}

Be insightful, warm, and empowering. Make the reading feel like a cosmic mirror reflecting their true self.`;
  }

  parseReadingResponse(responseText) {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {
        cosmicPortrait: responseText.substring(0, 300),
        sunSignReading: responseText,
        moonSignReading: '',
        risingSignReading: '',
        elementalBalance: '',
        lifePathInsights: [],
        affirmation: "I honor my unique cosmic blueprint."
      };
    } catch (error) {
      console.error('Error parsing Claude response:', error);
      return {
        cosmicPortrait: "The stars have aligned to reveal your cosmic story.",
        sunSignReading: responseText,
        moonSignReading: '',
        risingSignReading: '',
        elementalBalance: '',
        lifePathInsights: [],
        affirmation: "I embrace my celestial nature."
      };
    }
  }

  async generateQuickInsight(chart, userQuestion) {
    try {
      const message = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: `As an astrologer, provide a brief (3-4 sentences) insight for someone with Sun in ${chart.sun.sign.name}, Moon in ${chart.moon.sign.name}, and ${chart.rising.sign.name} Rising. They asked: "${userQuestion || 'What cosmic energies are most important for me to understand?'}". Be warm, specific, and empowering.`
        }]
      });

      return message.content[0].text.trim();
    } catch (error) {
      console.error('Claude API error:', error);
      return 'Your cosmic blueprint holds unique wisdom. Explore your birth chart to discover more.';
    }
  }

  async generateCompatibilityReading(chart1, chart2) {
    try {
      const message = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: `As an astrologer specializing in synastry, analyze the compatibility between:

Person 1: Sun in ${chart1.sun.sign.name}, Moon in ${chart1.moon.sign.name}, Rising ${chart1.rising.sign.name}
Person 2: Sun in ${chart2.sun.sign.name}, Moon in ${chart2.moon.sign.name}, Rising ${chart2.rising.sign.name}

Provide a compatibility reading covering:
1. Overall energetic compatibility
2. Emotional connection (Moon signs)
3. Core identity alignment (Sun signs)
4. Social dynamics (Rising signs)
5. Potential challenges and growth areas
6. Relationship advice

Format as JSON with keys: overview, emotionalConnection, identityAlignment, socialDynamics, challenges, advice`
        }]
      });

      return this.parseReadingResponse(message.content[0].text);
    } catch (error) {
      console.error('Claude API error:', error);
      throw new Error('Failed to generate compatibility reading');
    }
  }
}
