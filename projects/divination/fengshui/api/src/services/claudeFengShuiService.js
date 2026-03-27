import Anthropic from '@anthropic-ai/sdk';

/**
 * Claude AI Feng Shui Analysis Service
 * Generates personalized space energy readings
 */

export class ClaudeFengShuiService {
  constructor(apiKey) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY
    });
  }

  async generateSpaceAnalysis(spaceData, userGoals) {
    try {
      const prompt = this.buildAnalysisPrompt(spaceData, userGoals);

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
      throw new Error('Failed to generate Feng Shui analysis');
    }
  }

  buildAnalysisPrompt(spaceData, userGoals) {
    const {
      spaceType,
      roomType,
      direction,
      birthYear,
      elements,
      issues,
      dimensions,
      features
    } = spaceData;

    // Calculate Kua number if birth year provided
    const kuaInfo = birthYear ? this.calculateKuaNumber(birthYear) : null;

    return `You are an experienced Feng Shui master with deep knowledge of classical Chinese Feng Shui, the Bagua map, Five Elements theory, and modern space optimization. Generate a personalized space analysis based on the following information.

USER'S GOALS: "${userGoals || 'Improve overall energy flow and harmony in my space'}"

SPACE INFORMATION:
Space Type: ${spaceType || 'Home'}
Room Type: ${roomType || 'Living Room'}
Facing Direction: ${direction || 'Unknown'}
${dimensions ? `Dimensions: ${dimensions}` : ''}
${features ? `Notable Features: ${features.join(', ')}` : ''}

${kuaInfo ? `
PERSONAL KUA NUMBER: ${kuaInfo.number}
Lucky Directions: ${kuaInfo.luckyDirections.join(', ')}
Element: ${kuaInfo.element}
` : ''}

CURRENT ELEMENTS PRESENT: ${elements?.join(', ') || 'Not specified'}

REPORTED ISSUES: ${issues?.join(', ') || 'General optimization desired'}

Please provide a comprehensive Feng Shui analysis that:

1. **Energy Assessment**: Analyze the current Chi flow based on the information provided. Identify potential blockages, stagnant areas, or excessive energy.

2. **Bagua Analysis**: Map the space to the Bagua and identify which life areas are affected. Provide insights on how the current arrangement impacts these areas.

3. **Five Elements Balance**: Assess the elemental balance in the space. Identify which elements may be lacking or in excess.

4. **Specific Recommendations**: Provide 5-7 specific, actionable Feng Shui adjustments including:
   - Furniture placement suggestions
   - Color recommendations
   - Element additions or reductions
   - Symbolic objects or cures
   - Decluttering priorities

5. **Enhancement Tips**: Suggest ways to enhance specific life areas based on their goals (wealth, relationships, health, career, etc.)

6. **Dos and Don'ts**: List 3 things to do and 3 things to avoid in this space.

Format your response as JSON:
{
  "energyAssessment": "overview of current Chi flow",
  "baguaAnalysis": "bagua mapping and life area impacts",
  "elementsBalance": "five elements analysis",
  "recommendations": [
    {"area": "area name", "issue": "current issue", "solution": "recommended solution", "priority": "high/medium/low"},
    ...
  ],
  "enhancements": [
    {"lifeArea": "area name", "tip": "enhancement suggestion"},
    ...
  ],
  "dos": ["do 1", "do 2", "do 3"],
  "donts": ["don't 1", "don't 2", "don't 3"],
  "overallScore": 0-100,
  "summary": "brief summary paragraph"
}

Be practical, specific, and culturally respectful. Make recommendations that are achievable for someone without specialized Feng Shui knowledge.`;
  }

  calculateKuaNumber(birthYear) {
    // Simplified Kua number calculation
    const year = parseInt(birthYear);
    let sum = year.toString().split('').reduce((a, b) => a + parseInt(b), 0);
    while (sum > 9) {
      sum = sum.toString().split('').reduce((a, b) => a + parseInt(b), 0);
    }

    // This is simplified - in reality, Kua differs by gender
    const kuaNumber = sum <= 5 ? 11 - sum : sum;

    const kuaData = {
      1: { element: 'Water', luckyDirections: ['Southeast', 'East', 'South', 'North'] },
      2: { element: 'Earth', luckyDirections: ['Northeast', 'West', 'Northwest', 'Southwest'] },
      3: { element: 'Wood', luckyDirections: ['South', 'North', 'Southeast', 'East'] },
      4: { element: 'Wood', luckyDirections: ['North', 'South', 'East', 'Southeast'] },
      5: { element: 'Earth', luckyDirections: ['Northeast', 'West', 'Northwest', 'Southwest'] },
      6: { element: 'Metal', luckyDirections: ['West', 'Northeast', 'Southwest', 'Northwest'] },
      7: { element: 'Metal', luckyDirections: ['Northwest', 'Southwest', 'Northeast', 'West'] },
      8: { element: 'Earth', luckyDirections: ['Southwest', 'Northwest', 'West', 'Northeast'] },
      9: { element: 'Fire', luckyDirections: ['East', 'Southeast', 'North', 'South'] }
    };

    return {
      number: kuaNumber,
      ...kuaData[kuaNumber] || kuaData[5]
    };
  }

  parseReadingResponse(responseText) {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {
        energyAssessment: responseText.substring(0, 300),
        baguaAnalysis: '',
        elementsBalance: '',
        recommendations: [],
        enhancements: [],
        dos: [],
        donts: [],
        overallScore: 50,
        summary: responseText
      };
    } catch (error) {
      console.error('Error parsing Claude response:', error);
      return {
        energyAssessment: "Your space has been analyzed for energy flow.",
        baguaAnalysis: responseText,
        elementsBalance: '',
        recommendations: [],
        enhancements: [],
        dos: [],
        donts: [],
        overallScore: 50,
        summary: "Analysis complete. See details above."
      };
    }
  }

  async generateQuickTip(spaceType, issue) {
    try {
      const message = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `As a Feng Shui expert, provide a brief (2-3 sentences) tip for someone with a ${spaceType} who is experiencing: "${issue || 'general energy stagnation'}". Be practical and specific.`
        }]
      });

      return message.content[0].text.trim();
    } catch (error) {
      console.error('Claude API error:', error);
      return 'Consider adding flowing water elements and ensuring clear pathways for Chi to move freely through your space.';
    }
  }
}
