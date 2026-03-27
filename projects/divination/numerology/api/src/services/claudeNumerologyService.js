import Anthropic from '@anthropic-ai/sdk';

/**
 * Claude AI Numerology Reading Service
 * Generates personalized numerology readings
 */

export class ClaudeNumerologyService {
  constructor(apiKey) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY
    });
  }

  async generateNumerologyReading(numerologyData, userQuestion) {
    try {
      const prompt = this.buildReadingPrompt(numerologyData, userQuestion);

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
      throw new Error('Failed to generate numerology reading');
    }
  }

  buildReadingPrompt(numerologyData, userQuestion) {
    const {
      name,
      birthDate,
      lifePathNumber,
      expressionNumber,
      soulUrgeNumber,
      personalityNumber,
      birthdayNumber
    } = numerologyData;

    return `You are an expert numerologist with deep knowledge of Pythagorean numerology, master numbers, and the mystical significance of numbers. Generate a comprehensive numerology reading based on the following calculations.

SEEKER'S INFORMATION:
Name: ${name}
Birth Date: ${birthDate}

CORE NUMBERS:
Life Path Number: ${lifePathNumber} ${this.getMasterNumberNote(lifePathNumber)}
Expression Number: ${expressionNumber} ${this.getMasterNumberNote(expressionNumber)}
Soul Urge Number: ${soulUrgeNumber} ${this.getMasterNumberNote(soulUrgeNumber)}
Personality Number: ${personalityNumber} ${this.getMasterNumberNote(personalityNumber)}
Birthday Number: ${birthdayNumber}

SEEKER'S QUESTION: "${userQuestion || 'What do my numbers reveal about my life purpose and potential?'}"

Please provide a comprehensive numerology reading that:

1. **Life Path Analysis**: Deep dive into their Life Path number - their life's purpose, challenges, and opportunities. This is the most important number in their chart.

2. **Expression Number Insights**: Explore their natural talents, abilities, and how they express themselves to the world. This reveals their potential.

3. **Soul Urge Revelation**: Uncover their heart's deepest desires, inner motivations, and what truly fulfills them at a soul level.

4. **Personality Number**: Describe how others perceive them and the face they show to the world.

5. **Core Numbers Synthesis**: Explain how these numbers work together - harmonies, tensions, and the overall picture they paint.

6. **Life Cycles**: Provide insight into their current numerological cycle and what energies are present.

7. **Practical Guidance**: Give 4-5 specific, actionable insights based on their numerology chart.

8. **Lucky Numbers & Days**: Share their lucky numbers and favorable days based on their chart.

Format your response as JSON:
{
  "lifePathAnalysis": {
    "number": ${lifePathNumber},
    "title": "title for this life path",
    "meaning": "detailed interpretation",
    "strengths": ["strength 1", "strength 2", "strength 3"],
    "challenges": ["challenge 1", "challenge 2"],
    "lifePurpose": "their life purpose"
  },
  "expressionNumber": {
    "number": ${expressionNumber},
    "meaning": "detailed interpretation",
    "talents": ["talent 1", "talent 2", "talent 3"]
  },
  "soulUrge": {
    "number": ${soulUrgeNumber},
    "meaning": "detailed interpretation",
    "deepDesires": "what they truly want"
  },
  "personalityNumber": {
    "number": ${personalityNumber},
    "meaning": "how others see them"
  },
  "synthesis": "how all numbers work together",
  "currentCycle": "insight into current life cycle",
  "guidance": ["insight 1", "insight 2", "insight 3", "insight 4", "insight 5"],
  "luckyElements": {
    "numbers": [1, 2, 3],
    "days": ["day 1", "day 2"],
    "colors": ["color 1", "color 2"]
  }
}

Be insightful, empowering, and specific. Make the reading feel like a personalized blueprint for their life.`;
  }

  getMasterNumberNote(num) {
    if (num === 11) return '(Master Number 11 - The Intuitive Illuminator)';
    if (num === 22) return '(Master Number 22 - The Master Builder)';
    if (num === 33) return '(Master Number 33 - The Master Teacher)';
    return '';
  }

  parseReadingResponse(responseText) {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {
        lifePathAnalysis: { meaning: responseText },
        expressionNumber: {},
        soulUrge: {},
        personalityNumber: {},
        synthesis: '',
        currentCycle: '',
        guidance: [],
        luckyElements: {}
      };
    } catch (error) {
      console.error('Error parsing Claude response:', error);
      return {
        lifePathAnalysis: { meaning: responseText },
        expressionNumber: {},
        soulUrge: {},
        personalityNumber: {},
        synthesis: '',
        currentCycle: '',
        guidance: [],
        luckyElements: {}
      };
    }
  }

  async generateQuickInsight(lifePathNumber, question) {
    try {
      const message = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `As a numerologist, provide a brief (2-3 sentences) insight for someone with Life Path Number ${lifePathNumber} who asks: "${question || 'What does my Life Path number reveal?'}". Be warm, specific, and empowering.`
        }]
      });

      return message.content[0].text.trim();
    } catch (error) {
      console.error('Claude API error:', error);
      return `Life Path ${lifePathNumber} carries unique vibrations. Discover your full numerology chart for deeper insights.`;
    }
  }

  // Static calculation methods
  static calculateLifePathNumber(birthDate) {
    const dateStr = birthDate.replace(/-/g, '');
    let sum = dateStr.split('').reduce((a, b) => a + parseInt(b), 0);

    // Check for master numbers before reducing
    if (sum === 11 || sum === 22 || sum === 33) return sum;

    while (sum > 9) {
      sum = sum.toString().split('').reduce((a, b) => a + parseInt(b), 0);
      if (sum === 11 || sum === 22 || sum === 33) return sum;
    }

    return sum;
  }

  static calculateExpressionNumber(name) {
    const letterValues = {
      a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9,
      j: 1, k: 2, l: 3, m: 4, n: 5, o: 6, p: 7, q: 8, r: 9,
      s: 1, t: 2, u: 3, v: 4, w: 5, x: 6, y: 7, z: 8
    };

    const cleanName = name.toLowerCase().replace(/[^a-z]/g, '');
    let sum = cleanName.split('').reduce((a, letter) => a + (letterValues[letter] || 0), 0);

    if (sum === 11 || sum === 22 || sum === 33) return sum;

    while (sum > 9) {
      sum = sum.toString().split('').reduce((a, b) => a + parseInt(b), 0);
      if (sum === 11 || sum === 22 || sum === 33) return sum;
    }

    return sum;
  }

  static calculateSoulUrgeNumber(name) {
    const vowelValues = { a: 1, e: 5, i: 9, o: 6, u: 3 };
    const cleanName = name.toLowerCase().replace(/[^a-z]/g, '');
    let sum = cleanName.split('').reduce((a, letter) => a + (vowelValues[letter] || 0), 0);

    if (sum === 11 || sum === 22 || sum === 33) return sum;

    while (sum > 9) {
      sum = sum.toString().split('').reduce((a, b) => a + parseInt(b), 0);
      if (sum === 11 || sum === 22 || sum === 33) return sum;
    }

    return sum;
  }

  static calculatePersonalityNumber(name) {
    const consonantValues = {
      b: 2, c: 3, d: 4, f: 6, g: 7, h: 8,
      j: 1, k: 2, l: 3, m: 4, n: 5, p: 7, q: 8, r: 9,
      s: 1, t: 2, v: 4, w: 5, x: 6, y: 7, z: 8
    };

    const cleanName = name.toLowerCase().replace(/[^a-z]/g, '');
    let sum = cleanName.split('').reduce((a, letter) => a + (consonantValues[letter] || 0), 0);

    if (sum === 11 || sum === 22 || sum === 33) return sum;

    while (sum > 9) {
      sum = sum.toString().split('').reduce((a, b) => a + parseInt(b), 0);
      if (sum === 11 || sum === 22 || sum === 33) return sum;
    }

    return sum;
  }

  static calculateBirthdayNumber(birthDate) {
    const day = parseInt(birthDate.split('-')[2]);
    if (day <= 9) return day;
    if (day === 11 || day === 22) return day;
    return day.toString().split('').reduce((a, b) => a + parseInt(b), 0);
  }
}
