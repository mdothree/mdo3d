/**
 * Numerology Calculation Engine
 * Used across multiple platforms
 */

/**
 * Reduce a number to single digit (1-9) or master number (11, 22, 33)
 */
export function reduceToSingleDigit(num) {
  while (num > 9 && num !== 11 && num !== 22 && num !== 33) {
    num = num.toString().split('').reduce((sum, digit) => sum + parseInt(digit), 0);
  }
  return num;
}

/**
 * Calculate Life Path Number from birth date
 */
export function calculateLifePath(birthDate) {
  // birthDate format: YYYY-MM-DD or Date object
  const date = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  const yearSum = reduceToSingleDigit(year);
  const monthSum = reduceToSingleDigit(month);
  const daySum = reduceToSingleDigit(day);
  
  const total = yearSum + monthSum + daySum;
  return reduceToSingleDigit(total);
}

/**
 * Calculate Expression/Destiny Number from full name
 */
export function calculateExpression(fullName) {
  const values = {
    'A': 1, 'J': 1, 'S': 1,
    'B': 2, 'K': 2, 'T': 2,
    'C': 3, 'L': 3, 'U': 3,
    'D': 4, 'M': 4, 'V': 4,
    'E': 5, 'N': 5, 'W': 5,
    'F': 6, 'O': 6, 'X': 6,
    'G': 7, 'P': 7, 'Y': 7,
    'H': 8, 'Q': 8, 'Z': 8,
    'I': 9, 'R': 9
  };
  
  const cleanName = fullName.toUpperCase().replace(/[^A-Z]/g, '');
  const sum = cleanName.split('').reduce((total, letter) => {
    return total + (values[letter] || 0);
  }, 0);
  
  return reduceToSingleDigit(sum);
}

/**
 * Calculate Soul Urge Number (vowels only)
 */
export function calculateSoulUrge(fullName) {
  const values = {
    'A': 1, 'E': 5, 'I': 9, 'O': 6, 'U': 3
  };
  
  const vowels = fullName.toUpperCase().split('').filter(char => 
    ['A', 'E', 'I', 'O', 'U'].includes(char)
  );
  
  const sum = vowels.reduce((total, vowel) => total + values[vowel], 0);
  return reduceToSingleDigit(sum);
}

/**
 * Calculate Personality Number (consonants only)
 */
export function calculatePersonality(fullName) {
  const values = {
    'B': 2, 'C': 3, 'D': 4, 'F': 6, 'G': 7, 'H': 8,
    'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'P': 7,
    'Q': 8, 'R': 9, 'S': 1, 'T': 2, 'V': 4, 'W': 5,
    'X': 6, 'Y': 7, 'Z': 8
  };
  
  const consonants = fullName.toUpperCase().split('').filter(char => 
    char.match(/[B-DF-HJ-NP-TV-Z]/)
  );
  
  const sum = consonants.reduce((total, consonant) => total + (values[consonant] || 0), 0);
  return reduceToSingleDigit(sum);
}

/**
 * Get meaning for a number
 */
export function getNumberMeaning(number) {
  const meanings = {
    1: {
      trait: 'Leadership',
      description: 'Independent, ambitious, innovative, pioneering',
      strengths: ['Leadership', 'Independence', 'Creativity', 'Courage'],
      challenges: ['Arrogance', 'Stubbornness', 'Impatience'],
      career: ['Entrepreneur', 'CEO', 'Innovator', 'Pioneer']
    },
    2: {
      trait: 'Cooperation',
      description: 'Diplomatic, sensitive, harmonious, supportive',
      strengths: ['Diplomacy', 'Teamwork', 'Sensitivity', 'Balance'],
      challenges: ['Indecision', 'Over-sensitivity', 'Passivity'],
      career: ['Counselor', 'Mediator', 'Team Player', 'Diplomat']
    },
    3: {
      trait: 'Expression',
      description: 'Creative, expressive, optimistic, social',
      strengths: ['Creativity', 'Communication', 'Optimism', 'Inspiration'],
      challenges: ['Scattered energy', 'Superficiality', 'Exaggeration'],
      career: ['Artist', 'Writer', 'Entertainer', 'Speaker']
    },
    4: {
      trait: 'Stability',
      description: 'Practical, disciplined, organized, loyal',
      strengths: ['Organization', 'Discipline', 'Reliability', 'Hard work'],
      challenges: ['Rigidity', 'Stubbornness', 'Over-seriousness'],
      career: ['Manager', 'Accountant', 'Builder', 'Engineer']
    },
    5: {
      trait: 'Freedom',
      description: 'Adventurous, versatile, progressive, freedom-loving',
      strengths: ['Adaptability', 'Freedom', 'Progressive thinking', 'Versatility'],
      challenges: ['Restlessness', 'Irresponsibility', 'Inconsistency'],
      career: ['Traveler', 'Salesperson', 'Promoter', 'Explorer']
    },
    6: {
      trait: 'Responsibility',
      description: 'Nurturing, responsible, protective, harmonious',
      strengths: ['Responsibility', 'Nurturing', 'Service', 'Harmony'],
      challenges: ['Over-protective', 'Worrying', 'Self-sacrificing'],
      career: ['Teacher', 'Healer', 'Counselor', 'Parent']
    },
    7: {
      trait: 'Wisdom',
      description: 'Analytical, spiritual, introspective, wise',
      strengths: ['Analysis', 'Spirituality', 'Intuition', 'Wisdom'],
      challenges: ['Isolation', 'Skepticism', 'Aloofness'],
      career: ['Researcher', 'Philosopher', 'Analyst', 'Spiritual Teacher']
    },
    8: {
      trait: 'Power',
      description: 'Ambitious, authoritative, successful, material',
      strengths: ['Authority', 'Success', 'Material mastery', 'Efficiency'],
      challenges: ['Materialism', 'Workaholism', 'Intensity'],
      career: ['Executive', 'Entrepreneur', 'Banker', 'Leader']
    },
    9: {
      trait: 'Completion',
      description: 'Humanitarian, compassionate, wise, idealistic',
      strengths: ['Compassion', 'Generosity', 'Wisdom', 'Idealism'],
      challenges: ['Over-giving', 'Martyrdom', 'Moodiness'],
      career: ['Humanitarian', 'Artist', 'Teacher', 'Healer']
    },
    11: {
      trait: 'Illumination',
      description: 'Intuitive, inspirational, idealistic, visionary (Master Number)',
      strengths: ['Intuition', 'Inspiration', 'Spiritual insight', 'Vision'],
      challenges: ['Nervous tension', 'Impracticality', 'Fanaticism'],
      career: ['Spiritual leader', 'Inventor', 'Artist', 'Visionary']
    },
    22: {
      trait: 'Master Builder',
      description: 'Practical idealist, master builder, visionary pragmatist (Master Number)',
      strengths: ['Large-scale vision', 'Practical manifestation', 'Leadership', 'Building'],
      challenges: ['Overwhelming responsibility', 'Self-doubt', 'Pressure'],
      career: ['Architect', 'Diplomat', 'Entrepreneur', 'Visionary leader']
    },
    33: {
      trait: 'Master Teacher',
      description: 'Compassionate, nurturing, healing, teaching (Master Number)',
      strengths: ['Healing', 'Teaching', 'Compassion', 'Service'],
      challenges: ['Emotional burden', 'Self-sacrifice', 'Sensitivity'],
      career: ['Healer', 'Teacher', 'Artist', 'Humanitarian leader']
    }
  };
  
  return meanings[number] || meanings[1];
}

/**
 * Calculate complete numerology profile
 */
export function calculateNumerologyProfile(fullName, birthDate) {
  const lifePath = calculateLifePath(birthDate);
  const expression = calculateExpression(fullName);
  const soulUrge = calculateSoulUrge(fullName);
  const personality = calculatePersonality(fullName);
  
  return {
    lifePath: {
      number: lifePath,
      meaning: getNumberMeaning(lifePath)
    },
    expression: {
      number: expression,
      meaning: getNumberMeaning(expression)
    },
    soulUrge: {
      number: soulUrge,
      meaning: getNumberMeaning(soulUrge)
    },
    personality: {
      number: personality,
      meaning: getNumberMeaning(personality)
    }
  };
}
