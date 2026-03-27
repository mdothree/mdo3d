/**
 * Numerology Database and Calculation Service
 * Contains number meanings and calculation logic
 */

export const lifePathMeanings = {
  1: {
    title: 'The Leader',
    keywords: ['Independence', 'Innovation', 'Ambition', 'Courage'],
    brief: 'You are a natural-born leader with original ideas and the drive to make them happen.',
    meaning: 'Life Path 1 individuals are pioneers, innovators, and independent thinkers. You have strong willpower and determination to succeed. Your journey is about developing self-reliance, confidence, and learning to stand on your own two feet.',
    strengths: ['Leadership', 'Originality', 'Self-motivation', 'Courage'],
    challenges: ['Stubbornness', 'Self-centeredness', 'Impatience', 'Aggression']
  },
  2: {
    title: 'The Peacemaker',
    keywords: ['Diplomacy', 'Cooperation', 'Sensitivity', 'Balance'],
    brief: 'You are a natural mediator with the gift of bringing harmony to relationships.',
    meaning: 'Life Path 2 individuals are peacemakers, diplomats, and partners. You have deep sensitivity and intuition. Your journey is about cooperation, patience, and finding balance in relationships and life.',
    strengths: ['Diplomacy', 'Intuition', 'Cooperation', 'Patience'],
    challenges: ['Over-sensitivity', 'Indecision', 'Self-doubt', 'Dependency']
  },
  3: {
    title: 'The Creative',
    keywords: ['Expression', 'Joy', 'Creativity', 'Communication'],
    brief: 'You are a natural communicator with the gift of creative self-expression.',
    meaning: 'Life Path 3 individuals are artists, communicators, and entertainers. You have a gift for bringing joy and inspiration to others. Your journey is about expressing yourself authentically and spreading optimism.',
    strengths: ['Creativity', 'Self-expression', 'Optimism', 'Social skills'],
    challenges: ['Scattered energy', 'Superficiality', 'Moodiness', 'Self-doubt']
  },
  4: {
    title: 'The Builder',
    keywords: ['Stability', 'Discipline', 'Hard work', 'Foundation'],
    brief: 'You are a master builder with the ability to create lasting structures.',
    meaning: 'Life Path 4 individuals are builders, organizers, and hard workers. You value stability and order. Your journey is about building solid foundations, developing discipline, and creating something that lasts.',
    strengths: ['Reliability', 'Discipline', 'Practicality', 'Organization'],
    challenges: ['Rigidity', 'Stubbornness', 'Workaholic tendencies', 'Pessimism']
  },
  5: {
    title: 'The Freedom Seeker',
    keywords: ['Adventure', 'Change', 'Freedom', 'Versatility'],
    brief: 'You are a free spirit with an insatiable hunger for life experiences.',
    meaning: 'Life Path 5 individuals are adventurers, travelers, and freedom lovers. You thrive on change and variety. Your journey is about embracing change, exploring life fully, and learning through diverse experiences.',
    strengths: ['Adaptability', 'Curiosity', 'Resourcefulness', 'Charm'],
    challenges: ['Restlessness', 'Irresponsibility', 'Inconsistency', 'Excess']
  },
  6: {
    title: 'The Nurturer',
    keywords: ['Responsibility', 'Love', 'Harmony', 'Service'],
    brief: 'You are a natural caretaker with a deep desire to nurture and protect.',
    meaning: 'Life Path 6 individuals are nurturers, healers, and caregivers. You have a strong sense of responsibility to family and community. Your journey is about love, service, and creating harmony in your world.',
    strengths: ['Compassion', 'Responsibility', 'Nurturing', 'Artistic ability'],
    challenges: ['Self-sacrifice', 'Perfectionism', 'Worry', 'Interference']
  },
  7: {
    title: 'The Seeker',
    keywords: ['Wisdom', 'Analysis', 'Spirituality', 'Introspection'],
    brief: 'You are a deep thinker on a quest for truth and spiritual understanding.',
    meaning: 'Life Path 7 individuals are seekers, philosophers, and analysts. You have a powerful mind and deep intuition. Your journey is about seeking truth, developing wisdom, and connecting with the spiritual dimension of life.',
    strengths: ['Analytical mind', 'Intuition', 'Wisdom', 'Technical ability'],
    challenges: ['Isolation', 'Skepticism', 'Secrecy', 'Coldness']
  },
  8: {
    title: 'The Achiever',
    keywords: ['Power', 'Success', 'Authority', 'Abundance'],
    brief: 'You are a natural executive with the power to manifest material success.',
    meaning: 'Life Path 8 individuals are achievers, executives, and manifestors. You have natural authority and business acumen. Your journey is about mastering the material world, achieving success, and learning to use power wisely.',
    strengths: ['Leadership', 'Business sense', 'Efficiency', 'Vision'],
    challenges: ['Workaholism', 'Materialism', 'Dominance', 'Impatience']
  },
  9: {
    title: 'The Humanitarian',
    keywords: ['Compassion', 'Wisdom', 'Service', 'Completion'],
    brief: 'You are an old soul with a mission to serve and uplift humanity.',
    meaning: 'Life Path 9 individuals are humanitarians, artists, and wise souls. You have a broad perspective and deep compassion. Your journey is about selfless service, letting go, and contributing to the greater good.',
    strengths: ['Compassion', 'Creativity', 'Wisdom', 'Generosity'],
    challenges: ['Aloofness', 'Disappointment', 'Scattered focus', 'Escapism']
  },
  11: {
    title: 'The Intuitive Illuminator',
    keywords: ['Intuition', 'Inspiration', 'Spirituality', 'Visionary'],
    brief: 'You are a master number with heightened spiritual awareness and the ability to inspire.',
    meaning: 'Master Number 11 combines the energy of 1 twice with the spiritual illumination of the master vibration. You have powerful intuition and the ability to inspire others. Your journey involves channeling divine inspiration to uplift humanity.',
    strengths: ['Psychic ability', 'Inspiration', 'Idealism', 'Innovation'],
    challenges: ['Nervous tension', 'Over-sensitivity', 'Impracticality', 'Self-doubt']
  },
  22: {
    title: 'The Master Builder',
    keywords: ['Vision', 'Manifestation', 'Leadership', 'Legacy'],
    brief: 'You are a master number with the power to turn grand visions into reality.',
    meaning: 'Master Number 22 combines practical 4 energy with spiritual mastery. You have the ability to manifest large-scale visions that benefit humanity. Your journey involves building something of lasting significance.',
    strengths: ['Visionary thinking', 'Practical manifestation', 'Leadership', 'Discipline'],
    challenges: ['Overwhelm', 'Self-imposed pressure', 'Neglecting details', 'Workaholic']
  },
  33: {
    title: 'The Master Teacher',
    keywords: ['Healing', 'Compassion', 'Service', 'Selflessness'],
    brief: 'You are a master number embodying unconditional love and spiritual service.',
    meaning: 'Master Number 33 is the most spiritually evolved number, combining 11 and 22. You have the gift of healing through love and teaching through example. Your journey is about selfless service and embodying divine love.',
    strengths: ['Unconditional love', 'Healing presence', 'Teaching ability', 'Devotion'],
    challenges: ['Martyrdom', 'Unrealistic expectations', 'Burnout', 'Self-neglect']
  }
};

// Calculation functions
export function calculateLifePathNumber(birthDate) {
  const dateStr = birthDate.replace(/-/g, '');
  let sum = dateStr.split('').reduce((a, b) => a + parseInt(b), 0);

  if (sum === 11 || sum === 22 || sum === 33) return sum;

  while (sum > 9) {
    sum = sum.toString().split('').reduce((a, b) => a + parseInt(b), 0);
    if (sum === 11 || sum === 22 || sum === 33) return sum;
  }

  return sum;
}

export function calculateExpressionNumber(name) {
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

export function calculateSoulUrgeNumber(name) {
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

export function calculatePersonalityNumber(name) {
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

export function calculateBirthdayNumber(birthDate) {
  const day = parseInt(birthDate.split('-')[2]);
  if (day <= 9) return day;
  if (day === 11 || day === 22) return day;
  return day.toString().split('').reduce((a, b) => a + parseInt(b), 0);
}

export function getAllNumbers(name, birthDate) {
  return {
    lifePathNumber: calculateLifePathNumber(birthDate),
    expressionNumber: calculateExpressionNumber(name),
    soulUrgeNumber: calculateSoulUrgeNumber(name),
    personalityNumber: calculatePersonalityNumber(name),
    birthdayNumber: calculateBirthdayNumber(birthDate)
  };
}

export function getLifePathMeaning(number) {
  return lifePathMeanings[number] || lifePathMeanings[1];
}
