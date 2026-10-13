/**
 * The 20 hand-curated names shown on names.mdo3d.com (same list as the
 * frontend's app/page.tsx). These are the ONLY names we state a meaning and
 * origin for; every other name says "not in our curated set" rather than
 * inventing one.
 */
export const CURATED = [
  { name: 'Sophia', sex: 'F', origin: 'Greek', meaning: 'Wisdom' },
  { name: 'Emma', sex: 'F', origin: 'Germanic', meaning: 'Whole, universal' },
  { name: 'Olivia', sex: 'F', origin: 'Latin', meaning: 'Olive tree' },
  { name: 'Ava', sex: 'F', origin: 'Latin', meaning: 'Like a bird' },
  { name: 'Isabella', sex: 'F', origin: 'Hebrew', meaning: 'Devoted to God' },
  { name: 'Mia', sex: 'F', origin: 'Scandinavian', meaning: 'Mine, beloved' },
  { name: 'Charlotte', sex: 'F', origin: 'French', meaning: 'Free woman' },
  { name: 'Amelia', sex: 'F', origin: 'Germanic', meaning: 'Industrious' },
  { name: 'Harper', sex: 'F', origin: 'English', meaning: 'Harp player' },
  { name: 'Evelyn', sex: 'F', origin: 'English', meaning: 'Wished for child' },
  { name: 'Liam', sex: 'M', origin: 'Irish', meaning: 'Strong protector' },
  { name: 'Noah', sex: 'M', origin: 'Hebrew', meaning: 'Rest, comfort' },
  { name: 'Oliver', sex: 'M', origin: 'Latin', meaning: 'Olive tree' },
  { name: 'James', sex: 'M', origin: 'Hebrew', meaning: 'Supplanter' },
  { name: 'William', sex: 'M', origin: 'Germanic', meaning: 'Resolute protector' },
  { name: 'Lucas', sex: 'M', origin: 'Greek', meaning: 'Light' },
  { name: 'Henry', sex: 'M', origin: 'Germanic', meaning: 'Ruler of home' },
  { name: 'Alexander', sex: 'M', origin: 'Greek', meaning: 'Defender of men' },
  { name: 'Benjamin', sex: 'M', origin: 'Hebrew', meaning: 'Son of the right hand' },
  { name: 'Theodore', sex: 'M', origin: 'Greek', meaning: 'Gift of God' },
];

export const CURATED_ORIGINS = [...new Set(CURATED.map(c => c.origin))].sort();
