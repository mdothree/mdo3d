import Anthropic from '@anthropic-ai/sdk';

/**
 * Claude AI Past Life Reading Service
 * Generates personalized past life narratives
 */

export class ClaudePastLifeService {
  constructor(apiKey) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY
    });
  }

  async generatePastLifeReading(birthData, userQuestion) {
    try {
      const prompt = this.buildReadingPrompt(birthData, userQuestion);

      const message = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2500,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      return this.parseReadingResponse(message.content[0].text);
    } catch (error) {
      console.error('Claude API error:', error);
      throw new Error('Failed to generate past life reading');
    }
  }

  buildReadingPrompt(birthData, userQuestion) {
    const {
      birthDate,
      birthTime,
      birthPlace,
      name,
      currentChallenges,
      interests,
      fears,
      talents
    } = birthData;

    return `You are a gifted past life reader and spiritual guide with the ability to perceive soul memories across lifetimes. Using the birth data and personal information provided, channel a detailed past life reading that feels authentic, meaningful, and transformative.

SEEKER'S INFORMATION:
${name ? `Name: ${name}` : ''}
Birth Date: ${birthDate}
${birthTime ? `Birth Time: ${birthTime}` : ''}
${birthPlace ? `Birth Place: ${birthPlace}` : ''}

${currentChallenges ? `Current Life Challenges: ${currentChallenges}` : ''}
${interests ? `Strong Interests/Passions: ${interests}` : ''}
${fears ? `Unexplained Fears or Phobias: ${fears}` : ''}
${talents ? `Natural Talents: ${talents}` : ''}

SEEKER'S QUESTION: "${userQuestion || 'What past life is most relevant to my current journey?'}"

Please provide a detailed past life reading that:

1. **Past Life Vision**: Describe a vivid, specific past life including:
   - Time period and geographical location
   - The person's role, occupation, and social status
   - Physical appearance and distinctive features
   - Key relationships and their dynamics
   - Major life events and turning points

2. **Soul Lessons**: Explain what the soul was learning in that lifetime and how those lessons connect to the current life challenges or patterns.

3. **Karmic Connections**: Identify any karmic patterns, unfinished business, or soul contracts that may be influencing this lifetime.

4. **Trauma & Healing**: Gently explore any past life trauma that may be manifesting as current fears, blocks, or physical issues. Offer healing perspective.

5. **Gifts Carried Forward**: Describe talents, wisdom, or strengths developed in the past life that the seeker can access now.

6. **Integration Guidance**: Provide 3-4 specific practices or meditations to help integrate this past life awareness for healing and growth.

7. **Soul Message**: End with a direct message from the past life self to the current self.

Format your response as JSON:
{
  "pastLifeVision": {
    "timePeriod": "specific era",
    "location": "geographical location",
    "role": "occupation/role",
    "physicalDescription": "appearance details",
    "narrative": "detailed story of that life (2-3 paragraphs)"
  },
  "soulLessons": "explanation of soul lessons",
  "karmicConnections": "karmic patterns and connections",
  "traumaAndHealing": "past life trauma insights and healing perspective",
  "giftsCarriedForward": ["gift 1", "gift 2", "gift 3"],
  "integrationPractices": [
    {"practice": "practice name", "description": "how to do it"},
    ...
  ],
  "soulMessage": "direct message from past life self"
}

Be evocative, specific, and compassionate. Create a narrative that feels real and resonant while offering genuine spiritual insight and healing potential.`;
  }

  parseReadingResponse(responseText) {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {
        pastLifeVision: {
          timePeriod: 'Ancient times',
          location: 'A distant land',
          role: 'Seeker of wisdom',
          physicalDescription: '',
          narrative: responseText
        },
        soulLessons: '',
        karmicConnections: '',
        traumaAndHealing: '',
        giftsCarriedForward: [],
        integrationPractices: [],
        soulMessage: 'Your soul carries ancient wisdom.'
      };
    } catch (error) {
      console.error('Error parsing Claude response:', error);
      return {
        pastLifeVision: {
          timePeriod: 'Ancient times',
          location: 'A distant land',
          role: 'Seeker of wisdom',
          physicalDescription: '',
          narrative: responseText
        },
        soulLessons: '',
        karmicConnections: '',
        traumaAndHealing: '',
        giftsCarriedForward: [],
        integrationPractices: [],
        soulMessage: 'Trust in the journey of your eternal soul.'
      };
    }
  }

  async generateQuickInsight(birthDate, question) {
    try {
      const message = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: `As a past life reader, provide a brief (3-4 sentences) glimpse into a past life for someone born on ${birthDate} who asks: "${question || 'What past life energy am I carrying?'}". Be evocative, specific, and meaningful.`
        }]
      });

      return message.content[0].text.trim();
    } catch (error) {
      console.error('Claude API error:', error);
      return 'Your soul carries memories of many lifetimes. A deeper reading can reveal the stories waiting to be remembered.';
    }
  }

  async generateMultipleLives(birthData) {
    try {
      const message = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `As a past life reader, provide brief visions of 3 different past lives for someone born on ${birthData.birthDate}.

For each life, provide:
- Time period and location
- Role/occupation
- One key lesson learned
- How it connects to current life

Format as JSON:
{
  "lives": [
    {
      "timePeriod": "era",
      "location": "place",
      "role": "occupation",
      "keyLesson": "lesson",
      "currentConnection": "how it affects now"
    },
    ...
  ],
  "overarchingTheme": "soul theme across lifetimes"
}`
        }]
      });

      return this.parseReadingResponse(message.content[0].text);
    } catch (error) {
      console.error('Claude API error:', error);
      throw new Error('Failed to generate multiple lives reading');
    }
  }
}
