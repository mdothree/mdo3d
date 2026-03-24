/**
 * Dream Symbol Database
 * Comprehensive collection of common dream symbols with interpretations
 */

export const dreamSymbols = [
  // PEOPLE & RELATIONSHIPS
  {
    id: 1,
    symbol: "Mother",
    category: "people",
    keywords: ["mother", "mom", "maternal"],
    meanings: {
      general: "Represents nurturing, care, and emotional support. May reflect your relationship with your actual mother or maternal qualities within yourself.",
      positive: "Comfort, protection, unconditional love, guidance",
      negative: "Smothering, dependency, unresolved mother issues",
      spiritual: "Divine feminine energy, Mother Earth, creation"
    }
  },
  {
    id: 2,
    symbol: "Father",
    category: "people",
    keywords: ["father", "dad", "paternal"],
    meanings: {
      general: "Symbolizes authority, structure, protection, and life lessons. May represent your actual father or the masculine principle.",
      positive: "Strength, wisdom, guidance, support, authority",
      negative: "Oppression, judgment, unresolved father issues",
      spiritual: "Divine masculine, cosmic father, universal order"
    }
  },
  {
    id: 3,
    symbol: "Baby",
    category: "people",
    keywords: ["baby", "infant", "newborn"],
    meanings: {
      general: "New beginnings, vulnerability, potential, and new projects or aspects of yourself being born.",
      positive: "Fresh start, innocence, pure potential, new ideas",
      negative: "Helplessness, neediness, responsibility burden",
      spiritual: "Rebirth, new consciousness, inner child"
    }
  },
  {
    id: 4,
    symbol: "Stranger",
    category: "people",
    keywords: ["stranger", "unknown person", "unfamiliar"],
    meanings: {
      general: "Unknown aspects of yourself, hidden talents, or new opportunities coming into your life.",
      positive: "New possibilities, undiscovered potential, mystery",
      negative: "Fear of unknown, distrust, hidden threats",
      spiritual: "Shadow self, guide, messenger from unconscious"
    }
  },

  // ANIMALS
  {
    id: 5,
    symbol: "Snake",
    category: "animals",
    keywords: ["snake", "serpent", "viper"],
    meanings: {
      general: "Transformation, healing, wisdom, or hidden fears. One of the most powerful dream symbols across cultures.",
      positive: "Transformation, healing, kundalini energy, wisdom",
      negative: "Betrayal, hidden danger, toxic person, fear",
      spiritual: "Life force, rebirth, spiritual awakening, medicine"
    }
  },
  {
    id: 6,
    symbol: "Dog",
    category: "animals",
    keywords: ["dog", "puppy", "canine"],
    meanings: {
      general: "Loyalty, friendship, protection, and instincts. The condition and behavior of the dog matters greatly.",
      positive: "Faithful friend, protection, unconditional love, loyalty",
      negative: "Aggressive dog may mean conflict, fear, or betrayal",
      spiritual: "Guide, guardian, instinctual wisdom"
    }
  },
  {
    id: 7,
    symbol: "Cat",
    category: "animals",
    keywords: ["cat", "kitten", "feline"],
    meanings: {
      general: "Independence, mystery, feminine energy, and psychic awareness. Cats represent the wild, untamed aspects.",
      positive: "Independence, grace, mystery, psychic abilities",
      negative: "Deception, bad luck, untrustworthy people",
      spiritual: "Mystical knowledge, guardian of secrets, lunar energy"
    }
  },
  {
    id: 8,
    symbol: "Bird",
    category: "animals",
    keywords: ["bird", "flying bird", "avian"],
    meanings: {
      general: "Freedom, perspective, spiritual messages, and transcendence. Different birds have specific meanings.",
      positive: "Freedom, higher perspective, spiritual messages, hope",
      negative: "Feeling trapped, loss of freedom, bad news",
      spiritual: "Soul, messenger from divine, transcendence"
    }
  },
  {
    id: 9,
    symbol: "Spider",
    category: "animals",
    keywords: ["spider", "arachnid", "web"],
    meanings: {
      general: "Creativity, patience, feminine energy, or feeling trapped in a situation. The web is significant.",
      positive: "Creativity, patience, weaving your destiny, feminine power",
      negative: "Feeling trapped, manipulation, deceit, fear",
      spiritual: "Cosmic weaver, fate, creative life force"
    }
  },
  {
    id: 10,
    symbol: "Fish",
    category: "animals",
    keywords: ["fish", "swimming fish"],
    meanings: {
      general: "Emotions, unconscious content, fertility, and spiritual nourishment. Fish swim in the waters of the unconscious.",
      positive: "Emotional depth, intuition, abundance, spiritual food",
      negative: "Emotional overwhelm, slippery issues, cold feelings",
      spiritual: "Christ consciousness, hidden wisdom, fertility"
    }
  },

  // PLACES & BUILDINGS
  {
    id: 11,
    symbol: "House",
    category: "places",
    keywords: ["house", "home", "building"],
    meanings: {
      general: "The self, psyche, or different aspects of your life. Different rooms represent different aspects of consciousness.",
      positive: "Security, self-knowledge, stable foundation",
      negative: "Neglected house may mean neglected self-care",
      spiritual: "Temple of the soul, inner dwelling, consciousness levels"
    }
  },
  {
    id: 12,
    symbol: "School",
    category: "places",
    keywords: ["school", "classroom", "university"],
    meanings: {
      general: "Life lessons, learning experiences, or feeling tested. Often relates to anxiety about performance or being unprepared.",
      positive: "Learning, growth, preparation, knowledge",
      negative: "Anxiety, feeling tested, unprepared, judgment",
      spiritual: "Soul lessons, karmic classroom, spiritual education"
    }
  },
  {
    id: 13,
    symbol: "Hospital",
    category: "places",
    keywords: ["hospital", "medical center", "clinic"],
    meanings: {
      general: "Healing needed (physical, emotional, or spiritual), feeling sick, or caring for others. Pay attention to who is in the hospital.",
      positive: "Healing in progress, seeking help, recovery",
      negative: "Illness, vulnerability, crisis, fear of death",
      spiritual: "Spiritual healing, transformation through crisis"
    }
  },
  {
    id: 14,
    symbol: "Ocean",
    category: "places",
    keywords: ["ocean", "sea", "water"],
    meanings: {
      general: "The unconscious mind, emotions, and the vastness of the psyche. The state of the ocean (calm or stormy) is significant.",
      positive: "Emotional depth, unconscious wisdom, abundance",
      negative: "Emotional overwhelm, drowning in feelings, chaos",
      spiritual: "Collective unconscious, primordial waters, infinite"
    }
  },
  {
    id: 15,
    symbol: "Forest",
    category: "places",
    keywords: ["forest", "woods", "trees"],
    meanings: {
      general: "The unknown, natural wisdom, or feeling lost. Forests represent mystery and the wild unconscious.",
      positive: "Natural wisdom, growth, grounding, mystery",
      negative: "Feeling lost, confusion, fear of unknown",
      spiritual: "Sacred grove, nature spirits, deep wisdom"
    }
  },

  // ACTIONS & SITUATIONS
  {
    id: 16,
    symbol: "Flying",
    category: "actions",
    keywords: ["flying", "floating", "soaring"],
    meanings: {
      general: "Freedom, transcendence, or rising above problems. How you fly (easy or difficult) matters.",
      positive: "Liberation, perspective, spiritual ascension, power",
      negative: "Fear of falling, lack of grounding, escapism",
      spiritual: "Astral travel, spiritual freedom, transcendence"
    }
  },
  {
    id: 17,
    symbol: "Falling",
    category: "actions",
    keywords: ["falling", "dropping", "plummeting"],
    meanings: {
      general: "Loss of control, anxiety, or fear of failure. One of the most common dream themes worldwide.",
      positive: "Letting go, releasing control, surrender",
      negative: "Fear of failure, loss of control, anxiety, insecurity",
      spiritual: "Ego death, spiritual descent, grounding needed"
    }
  },
  {
    id: 18,
    symbol: "Running",
    category: "actions",
    keywords: ["running", "chasing", "pursued"],
    meanings: {
      general: "Avoidance, fear, or pursuit of goals. Whether you're running from or toward something is crucial.",
      positive: "Pursuing goals, determination, forward movement",
      negative: "Running away from problems, fear, avoidance",
      spiritual: "Spiritual quest, fleeing from shadow, chase for truth"
    }
  },
  {
    id: 19,
    symbol: "Death",
    category: "actions",
    keywords: ["death", "dying", "dead"],
    meanings: {
      general: "Transformation, endings, and new beginnings. Rarely about actual death; usually symbolic change.",
      positive: "Transformation, rebirth, letting go of old self",
      negative: "Fear of change, mourning, loss, anxiety",
      spiritual: "Ego death, spiritual rebirth, initiation, transformation"
    }
  },
  {
    id: 20,
    symbol: "Teeth Falling Out",
    category: "actions",
    keywords: ["teeth", "losing teeth", "tooth"],
    meanings: {
      general: "Anxiety about appearance, loss of power, or communication issues. Very common anxiety dream.",
      positive: "Growth, renewal, making room for new",
      negative: "Loss of power, aging, communication breakdown, insecurity",
      spiritual: "Renewal, releasing old words, transformation"
    }
  },

  // OBJECTS
  {
    id: 21,
    symbol: "Key",
    category: "objects",
    keywords: ["key", "keys", "unlock"],
    meanings: {
      general: "Solutions, access to hidden knowledge, or unlocking potential. Finding keys is particularly significant.",
      positive: "Solutions, access, freedom, unlocking mysteries",
      negative: "Lost keys mean blocked access or lost opportunities",
      spiritual: "Knowledge, initiation, access to higher realms"
    }
  },
  {
    id: 22,
    symbol: "Door",
    category: "objects",
    keywords: ["door", "doorway", "entrance"],
    meanings: {
      general: "Opportunities, transitions, or boundaries. Open or closed doors indicate access to new experiences.",
      positive: "New opportunities, transitions, passage",
      negative: "Closed door may mean blocked opportunities or boundaries",
      spiritual: "Portal, threshold, gateway to other realms"
    }
  },
  {
    id: 23,
    symbol: "Car",
    category: "objects",
    keywords: ["car", "vehicle", "automobile"],
    meanings: {
      general: "Personal drive, control over life path, or current life journey. Who's driving is very important.",
      positive: "Control, independence, progress, mobility",
      negative: "Out of control car means loss of direction or autonomy",
      spiritual: "Life vehicle, journey of soul, personal path"
    }
  },
  {
    id: 24,
    symbol: "Mirror",
    category: "objects",
    keywords: ["mirror", "reflection", "looking glass"],
    meanings: {
      general: "Self-reflection, self-image, or truth. What you see in the mirror reveals how you see yourself.",
      positive: "Self-awareness, truth, self-examination",
      negative: "Broken mirror may mean distorted self-image or bad luck",
      spiritual: "Portal to other realms, truth revealer, soul reflection"
    }
  },
  {
    id: 25,
    symbol: "Phone",
    category: "objects",
    keywords: ["phone", "telephone", "cell phone"],
    meanings: {
      general: "Communication, connection, or messages. Phone problems indicate communication breakdowns.",
      positive: "Connection, important message, reaching out",
      negative: "Broken phone means communication failure, isolation",
      spiritual: "Divine communication, messages from higher self"
    }
  },

  // ELEMENTS & NATURE
  {
    id: 26,
    symbol: "Fire",
    category: "elements",
    keywords: ["fire", "flames", "burning"],
    meanings: {
      general: "Passion, transformation, destruction, or purification. The nature of the fire (controlled or wildfire) matters.",
      positive: "Passion, transformation, purification, illumination",
      negative: "Destruction, rage, burning out, loss",
      spiritual: "Divine fire, purification, spiritual passion, Holy Spirit"
    }
  },
  {
    id: 27,
    symbol: "Water",
    category: "elements",
    keywords: ["water", "flowing water", "liquid"],
    meanings: {
      general: "Emotions, unconscious, and the flow of life. Clear or murky water indicates emotional state.",
      positive: "Emotional flow, cleansing, life force, intuition",
      negative: "Drowning in emotions, overwhelm, tears, flood",
      spiritual: "Life force, baptism, cosmic waters, purification"
    }
  },
  {
    id: 28,
    symbol: "Rain",
    category: "elements",
    keywords: ["rain", "rainfall", "storm"],
    meanings: {
      general: "Emotional release, cleansing, or depression. Gentle rain vs storm indicates intensity of emotions.",
      positive: "Cleansing, fertility, emotional release, renewal",
      negative: "Sadness, depression, emotional overwhelm",
      spiritual: "Divine blessing, purification, grace from above"
    }
  },
  {
    id: 29,
    symbol: "Sun",
    category: "elements",
    keywords: ["sun", "sunshine", "solar"],
    meanings: {
      general: "Consciousness, vitality, masculine energy, and enlightenment. Bright sun indicates clarity and energy.",
      positive: "Vitality, clarity, enlightenment, success, life force",
      negative: "Harsh sun may mean burnout or overexposure",
      spiritual: "Divine light, Christ consciousness, illumination, god"
    }
  },
  {
    id: 30,
    symbol: "Moon",
    category: "elements",
    keywords: ["moon", "lunar", "moonlight"],
    meanings: {
      general: "Unconscious, intuition, feminine energy, and cycles. Moon phases represent life cycles.",
      positive: "Intuition, mystery, feminine power, cycles",
      negative: "Illusion, madness, hidden aspects, changeability",
      spiritual: "Divine feminine, goddess, psychic abilities, mystery"
    }
  },

  // COLORS
  {
    id: 31,
    symbol: "Red",
    category: "colors",
    keywords: ["red", "crimson", "scarlet"],
    meanings: {
      general: "Passion, anger, vitality, or danger. The most intense and energetic color.",
      positive: "Passion, love, vitality, courage, life force",
      negative: "Anger, danger, aggression, warning",
      spiritual: "Root chakra, life force, sacred blood"
    }
  },
  {
    id: 32,
    symbol: "Blue",
    category: "colors",
    keywords: ["blue", "azure", "navy"],
    meanings: {
      general: "Calm, truth, communication, or sadness. The color of sky and water.",
      positive: "Peace, truth, communication, spirituality, trust",
      negative: "Sadness, depression, coldness, isolation",
      spiritual: "Throat chakra, divine truth, heavenly realm"
    }
  },
  {
    id: 33,
    symbol: "White",
    category: "colors",
    keywords: ["white", "bright white", "pale"],
    meanings: {
      general: "Purity, innocence, new beginnings, or spiritual presence. The color of light.",
      positive: "Purity, innocence, clarity, spiritual presence, new start",
      negative: "Sterility, emptiness, death, isolation",
      spiritual: "Divine light, angels, highest consciousness, purity"
    }
  },
  {
    id: 34,
    symbol: "Black",
    category: "colors",
    keywords: ["black", "darkness", "dark"],
    meanings: {
      general: "Unknown, mystery, shadow self, or fear. The color of the unconscious.",
      positive: "Mystery, potential, fertile void, protection",
      negative: "Fear, evil, death, depression, unknown",
      spiritual: "Void, womb of creation, shadow work, mystery"
    }
  },

  // NUMBERS
  {
    id: 35,
    symbol: "Three",
    category: "numbers",
    keywords: ["three", "3", "trinity"],
    meanings: {
      general: "Completion, trinity, and creative expression. Sacred number across cultures.",
      positive: "Wholeness, trinity, creativity, growth, manifestation",
      negative: "Triangle drama, being third wheel",
      spiritual: "Holy trinity, body-mind-spirit, sacred triad"
    }
  },
  {
    id: 36,
    symbol: "Seven",
    category: "numbers",
    keywords: ["seven", "7", "seventh"],
    meanings: {
      general: "Spiritual perfection, cycles, and mystical knowledge. Most mystical number.",
      positive: "Spiritual completion, mystical knowledge, luck",
      negative: "Isolation, withdrawal, perfectionism",
      spiritual: "Chakras, spiritual perfection, divine number"
    }
  },

  // WEATHER & PHENOMENA
  {
    id: 37,
    symbol: "Storm",
    category: "weather",
    keywords: ["storm", "thunder", "lightning"],
    meanings: {
      general: "Emotional turmoil, dramatic change, or cleansing. Intensity of storm indicates intensity of situation.",
      positive: "Dramatic transformation, cleansing, power, release",
      negative: "Chaos, turmoil, conflict, disruption",
      spiritual: "Divine intervention, purification, cosmic power"
    }
  },
  {
    id: 38,
    symbol: "Earthquake",
    category: "weather",
    keywords: ["earthquake", "tremor", "quake"],
    meanings: {
      general: "Foundation shaking, major life changes, or upheaval. Everything you thought was solid is shifting.",
      positive: "Breaking old foundations, necessary change",
      negative: "Instability, fear, loss of security, chaos",
      spiritual: "Spiritual awakening, cosmic shift, transformation"
    }
  },

  // FOOD & CONSUMPTION
  {
    id: 39,
    symbol: "Food",
    category: "food",
    keywords: ["food", "eating", "meal"],
    meanings: {
      general: "Nourishment, abundance, or unfulfilled needs. What you eat and how you eat it matters.",
      positive: "Abundance, nourishment, satisfaction, prosperity",
      negative: "Unfulfilled needs, greed, deprivation",
      spiritual: "Spiritual nourishment, communion, sacred meal"
    }
  },
  {
    id: 40,
    symbol: "Fruit",
    category: "food",
    keywords: ["fruit", "apple", "berry"],
    meanings: {
      general: "Rewards of labor, temptation, or natural abundance. Different fruits have specific meanings.",
      positive: "Harvest, rewards, sweetness, abundance, health",
      negative: "Forbidden fruit, temptation, overindulgence",
      spiritual: "Fruits of spirit, wisdom, knowledge (apple)"
    }
  }
];

// Helper functions
export const searchSymbols = (query) => {
  const lowerQuery = query.toLowerCase();
  return dreamSymbols.filter(symbol => 
    symbol.symbol.toLowerCase().includes(lowerQuery) ||
    symbol.keywords.some(keyword => keyword.includes(lowerQuery))
  );
};

export const getSymbolsByCategory = (category) => {
  return dreamSymbols.filter(symbol => symbol.category === category);
};

export const getRandomSymbol = () => {
  return dreamSymbols[Math.floor(Math.random() * dreamSymbols.length)];
};

export const getSymbolById = (id) => {
  return dreamSymbols.find(symbol => symbol.id === id);
};

export const categories = [
  'people',
  'animals',
  'places',
  'actions',
  'objects',
  'elements',
  'colors',
  'numbers',
  'weather',
  'food'
];
