/**
 * Tarot Card Database
 * Complete 78-card deck: 22 Major Arcana + 56 Minor Arcana
 */

export const tarotCards = [
  // ===== MAJOR ARCANA (0-21) =====
  {
    id: 0,
    name: "The Fool",
    arcana: "major",
    suit: null,
    number: 0,
    keywords: ["new beginnings", "innocence", "spontaneity", "free spirit"],
    upright: {
      brief: "A leap of faith. New adventures await.",
      meaning: "The Fool represents new beginnings, having faith in the future, being inexperienced, not knowing what to expect, and having faith in the unknown. The Fool is a card of new experiences and childlike wonder.",
      guidance: "Take a leap of faith. Trust in the journey. Embrace the unknown with an open heart and adventurous spirit."
    },
    reversed: {
      brief: "Recklessness. Poor judgment or naivety.",
      meaning: "Reversed, The Fool can indicate recklessness, taking unnecessary risks, or being taken advantage of due to naivety.",
      guidance: "Look before you leap. Make sure you're not being foolish or naive. Consider the consequences of your actions."
    },
    element: "Air",
    astrology: "Uranus"
  },
  {
    id: 1,
    name: "The Magician",
    arcana: "major",
    suit: null,
    number: 1,
    keywords: ["manifestation", "resourcefulness", "power", "inspired action"],
    upright: {
      brief: "You have the power to manifest your desires.",
      meaning: "The Magician is a card of manifestation and creation. You have all the tools you need to succeed. This card represents taking inspired action, using your skills and resources, and channeling your energy to create what you desire.",
      guidance: "You have everything you need. Focus your intention and take action. The universe supports your manifestation."
    },
    reversed: {
      brief: "Manipulation. Unused talents or trickery.",
      meaning: "Reversed, The Magician suggests manipulation, poor planning, or untapped talents. You may be using your gifts for selfish purposes.",
      guidance: "Check your motives. Are you being honest? Use your power wisely and ethically."
    },
    element: "Air",
    astrology: "Mercury"
  },
  {
    id: 2,
    name: "The High Priestess",
    arcana: "major",
    suit: null,
    number: 2,
    keywords: ["intuition", "sacred knowledge", "divine feminine", "subconscious"],
    upright: {
      brief: "Trust your intuition. Hidden knowledge is revealing itself.",
      meaning: "The High Priestess represents intuition, sacred knowledge, and the divine feminine. She sits at the gate between the conscious and subconscious realms. Trust your inner voice and pay attention to your dreams.",
      guidance: "Look inward for answers. Your intuition knows the truth. Listen to the whispers of your soul."
    },
    reversed: {
      brief: "Secrets. Disconnection from intuition.",
      meaning: "Reversed, The High Priestess indicates hidden agendas, secrets being kept, or disconnection from your intuitive voice.",
      guidance: "What are you hiding from yourself? Reconnect with your inner knowing. Truth wants to emerge."
    },
    element: "Water",
    astrology: "Moon"
  },
  {
    id: 3,
    name: "The Empress",
    arcana: "major",
    suit: null,
    number: 3,
    keywords: ["abundance", "nurturing", "fertility", "nature"],
    upright: {
      brief: "Abundance and nurturing energy surround you.",
      meaning: "The Empress represents abundance, beauty, nature, and nurturing energy. She is the mother archetype, indicating fertility (literal or creative), prosperity, and connection to the natural world.",
      guidance: "Nurture yourself and others. Abundance is your birthright. Connect with nature and your senses."
    },
    reversed: {
      brief: "Dependence. Creative block or neglecting self-care.",
      meaning: "Reversed, The Empress suggests creative blocks, dependence on others, or neglecting self-care and nurturing.",
      guidance: "You can't pour from an empty cup. Nurture yourself first. What needs your loving attention?"
    },
    element: "Earth",
    astrology: "Venus"
  },
  {
    id: 4,
    name: "The Emperor",
    arcana: "major",
    suit: null,
    number: 4,
    keywords: ["authority", "structure", "control", "father figure"],
    upright: {
      brief: "Establish order and take control of your domain.",
      meaning: "The Emperor represents authority, structure, and solid foundations. He is the father archetype, bringing order, discipline, and leadership. This card calls for strategy and taking charge.",
      guidance: "Create structure and boundaries. Lead with authority. Build solid foundations for your empire."
    },
    reversed: {
      brief: "Domination. Rigidity or abuse of power.",
      meaning: "Reversed, The Emperor indicates tyranny, rigidity, or abuse of authority. Control may have become domination.",
      guidance: "Soften your approach. Are you being too controlling? Balance authority with compassion."
    },
    element: "Fire",
    astrology: "Aries"
  },
  {
    id: 5,
    name: "The Hierophant",
    arcana: "major",
    suit: null,
    number: 5,
    keywords: ["tradition", "conformity", "morality", "institutions"],
    upright: {
      brief: "Seek wisdom from tradition and spiritual guidance.",
      meaning: "The Hierophant represents spiritual wisdom, religious beliefs, conformity, and tradition. This card suggests seeking guidance from established institutions or spiritual teachers.",
      guidance: "Honor tradition and seek wise counsel. There is wisdom in the old ways. Find your spiritual community."
    },
    reversed: {
      brief: "Rebellion. Challenging tradition or dogma.",
      meaning: "Reversed, The Hierophant suggests rebellion against tradition, challenging established beliefs, or breaking from conformity.",
      guidance: "Question dogma. Create your own spiritual path. Don't follow blindly—think for yourself."
    },
    element: "Earth",
    astrology: "Taurus"
  },
  {
    id: 6,
    name: "The Lovers",
    arcana: "major",
    suit: null,
    number: 6,
    keywords: ["love", "harmony", "relationships", "choices"],
    upright: {
      brief: "Love, partnership, and important choices.",
      meaning: "The Lovers represent love, harmony, relationships, and alignment of values. This card often indicates a significant choice between two paths, or a deepening of partnership and connection.",
      guidance: "Choose love. Align with your values. Deep connection and harmony are possible now."
    },
    reversed: {
      brief: "Disharmony. Self-love issues or difficult choices.",
      meaning: "Reversed, The Lovers suggest disharmony in relationships, self-love issues, or avoiding an important decision.",
      guidance: "Examine your relationships. Love yourself first. Make the choice you've been avoiding."
    },
    element: "Air",
    astrology: "Gemini"
  },
  {
    id: 7,
    name: "The Chariot",
    arcana: "major",
    suit: null,
    number: 7,
    keywords: ["willpower", "determination", "victory", "control"],
    upright: {
      brief: "Victory through determination and willpower.",
      meaning: "The Chariot represents willpower, determination, and triumph through focus. This card indicates that you can achieve victory by harnessing opposing forces and maintaining direction.",
      guidance: "Stay focused on your goal. Your determination will lead to victory. Harness all your resources."
    },
    reversed: {
      brief: "Lack of control. Aggression or lack of direction.",
      meaning: "Reversed, The Chariot indicates lack of control, aggression, or lack of direction. You may be pulled in too many directions.",
      guidance: "Regain control. What's pulling you off course? Refocus on what truly matters."
    },
    element: "Water",
    astrology: "Cancer"
  },
  {
    id: 8,
    name: "Strength",
    arcana: "major",
    suit: null,
    number: 8,
    keywords: ["inner strength", "courage", "patience", "compassion"],
    upright: {
      brief: "Gentle strength and courage overcome all obstacles.",
      meaning: "Strength represents inner strength, courage, patience, and compassion. True power comes from gentleness and self-control, not brute force. This card suggests taming your inner beast with love.",
      guidance: "Be brave and patient. Gentle strength overcomes all. Face challenges with compassion and courage."
    },
    reversed: {
      brief: "Self-doubt. Raw emotion or abuse of power.",
      meaning: "Reversed, Strength suggests self-doubt, lack of confidence, or inability to control your impulses and emotions.",
      guidance: "Rebuild your confidence. Control your impulses. Find your inner courage again."
    },
    element: "Fire",
    astrology: "Leo"
  },
  {
    id: 9,
    name: "The Hermit",
    arcana: "major",
    suit: null,
    number: 9,
    keywords: ["soul-searching", "introspection", "inner guidance", "solitude"],
    upright: {
      brief: "Seek solitude and inner wisdom.",
      meaning: "The Hermit represents soul-searching, introspection, and inner guidance. This is a time to withdraw from the outside world and seek answers within. The light you seek is inside you.",
      guidance: "Go within for answers. Solitude is sacred. Your inner light will guide you through the darkness."
    },
    reversed: {
      brief: "Isolation. Loneliness or withdrawal.",
      meaning: "Reversed, The Hermit suggests excessive isolation, loneliness, or withdrawing from help when you need it.",
      guidance: "Don't isolate too long. Reach out for support. Balance solitude with connection."
    },
    element: "Earth",
    astrology: "Virgo"
  },
  {
    id: 10,
    name: "Wheel of Fortune",
    arcana: "major",
    suit: null,
    number: 10,
    keywords: ["cycles", "fate", "turning point", "good luck"],
    upright: {
      brief: "The wheel turns. Change and good fortune are coming.",
      meaning: "The Wheel of Fortune represents cycles, fate, and turning points. Life moves in cycles—what goes up must come down, and vice versa. This card often indicates a positive turn of events.",
      guidance: "Embrace change. The wheel is turning in your favor. Trust in the cycles of life."
    },
    reversed: {
      brief: "Bad luck. Resistance to change.",
      meaning: "Reversed, the Wheel suggests bad luck, resistance to change, or a downward turn in circumstances.",
      guidance: "Accept what you cannot control. The wheel will turn again. Find the lesson in this cycle."
    },
    element: "Fire",
    astrology: "Jupiter"
  },
  {
    id: 11,
    name: "Justice",
    arcana: "major",
    suit: null,
    number: 11,
    keywords: ["fairness", "truth", "cause and effect", "law"],
    upright: {
      brief: "Truth and fairness prevail. Karma is at work.",
      meaning: "Justice represents fairness, truth, cause and effect, and the law. You will receive what you deserve—good or bad. This card calls for objectivity, fairness, and accepting responsibility.",
      guidance: "Be fair and truthful. Accept the consequences of your actions. Justice will be served."
    },
    reversed: {
      brief: "Unfairness. Dishonesty or avoidance of accountability.",
      meaning: "Reversed, Justice suggests unfairness, dishonesty, or avoiding accountability for your actions.",
      guidance: "Face the truth. Take responsibility. What have you been avoiding? Integrity is required."
    },
    element: "Air",
    astrology: "Libra"
  },
  {
    id: 12,
    name: "The Hanged Man",
    arcana: "major",
    suit: null,
    number: 12,
    keywords: ["surrender", "new perspective", "sacrifice", "suspension"],
    upright: {
      brief: "Surrender and see from a new perspective.",
      meaning: "The Hanged Man represents surrender, letting go, and seeing things from a completely new perspective. Sometimes you must sacrifice one thing to gain another. Pause and reassess.",
      guidance: "Let go of control. See things differently. The pause has purpose. Surrender to gain wisdom."
    },
    reversed: {
      brief: "Stalling. Resistance to necessary sacrifice.",
      meaning: "Reversed, The Hanged Man suggests stalling, resisting necessary changes, or martyrdom without purpose.",
      guidance: "Stop resisting. Make the sacrifice or move on. Are you being a martyr? Release what's not working."
    },
    element: "Water",
    astrology: "Neptune"
  },
  {
    id: 13,
    name: "Death",
    arcana: "major",
    suit: null,
    number: 13,
    keywords: ["endings", "transformation", "transition", "release"],
    upright: {
      brief: "Endings bring new beginnings. Transformation is here.",
      meaning: "Death represents endings, transformation, and transition. This card rarely means physical death—it signals the end of one chapter and the beginning of another. Let go of what no longer serves you.",
      guidance: "Release the old. Embrace transformation. Every ending is a new beginning in disguise."
    },
    reversed: {
      brief: "Resistance to change. Inability to let go.",
      meaning: "Reversed, Death suggests resistance to necessary endings, fear of change, or inability to let go of the past.",
      guidance: "You're holding onto what needs to die. Let it go. Fighting change only prolongs suffering."
    },
    element: "Water",
    astrology: "Scorpio"
  },
  {
    id: 14,
    name: "Temperance",
    arcana: "major",
    suit: null,
    number: 14,
    keywords: ["balance", "moderation", "patience", "purpose"],
    upright: {
      brief: "Find balance and practice moderation.",
      meaning: "Temperance represents balance, moderation, patience, and purpose. This card suggests the need for a balanced, moderate approach. Mix opposing forces to create something new and harmonious.",
      guidance: "Find the middle way. Practice moderation. Blend opposing forces to create harmony and healing."
    },
    reversed: {
      brief: "Imbalance. Excess or lack of harmony.",
      meaning: "Reversed, Temperance suggests imbalance, excess, or lack of harmony. You may be going to extremes.",
      guidance: "Restore balance. What's out of alignment? Moderation is needed. Return to center."
    },
    element: "Fire",
    astrology: "Sagittarius"
  },
  {
    id: 15,
    name: "The Devil",
    arcana: "major",
    suit: null,
    number: 15,
    keywords: ["bondage", "addiction", "materialism", "shadow self"],
    upright: {
      brief: "Examine your attachments and addictions.",
      meaning: "The Devil represents bondage, addiction, materialism, and shadow self. This card indicates being enslaved by material desires, unhealthy relationships, or addictive behaviors. The chains are often self-imposed.",
      guidance: "What enslaves you? The chains are loose—you can free yourself. Face your shadow and addictions."
    },
    reversed: {
      brief: "Release from bondage. Breaking free from addiction.",
      meaning: "Reversed, The Devil suggests releasing from bondage, breaking free from addictions, or overcoming materialism.",
      guidance: "You're breaking free! Continue the work of liberation. Reclaim your power from whatever held you."
    },
    element: "Earth",
    astrology: "Capricorn"
  },
  {
    id: 16,
    name: "The Tower",
    arcana: "major",
    suit: null,
    number: 16,
    keywords: ["sudden change", "upheaval", "revelation", "awakening"],
    upright: {
      brief: "Sudden change and revelation shake your foundations.",
      meaning: "The Tower represents sudden change, upheaval, chaos, and revelation. False structures are crumbling. While frightening, this destruction clears the way for truth and rebuilding on solid ground.",
      guidance: "Let it fall. What's crumbling wasn't built on truth. From the rubble, you'll build something real."
    },
    reversed: {
      brief: "Avoiding disaster. Fear of change.",
      meaning: "Reversed, The Tower suggests narrowly avoiding disaster, fear of change, or resisting necessary upheaval.",
      guidance: "You can't avoid change forever. Sometimes things must fall apart. Don't cling to false structures."
    },
    element: "Fire",
    astrology: "Mars"
  },
  {
    id: 17,
    name: "The Star",
    arcana: "major",
    suit: null,
    number: 17,
    keywords: ["hope", "faith", "renewal", "inspiration"],
    upright: {
      brief: "Hope, healing, and renewal are here.",
      meaning: "The Star represents hope, faith, renewal, and inspiration. After the storm comes peace. This card brings healing, optimism, and renewed faith in the future. Your wishes may come true.",
      guidance: "Have hope. Healing is happening. You are guided and protected. Believe in your dreams."
    },
    reversed: {
      brief: "Hopelessness. Loss of faith.",
      meaning: "Reversed, The Star suggests hopelessness, loss of faith, or feeling disconnected from your higher purpose.",
      guidance: "Rekindle your hope. Even a spark can light the darkness. Your faith will return. Be patient."
    },
    element: "Air",
    astrology: "Aquarius"
  },
  {
    id: 18,
    name: "The Moon",
    arcana: "major",
    suit: null,
    number: 18,
    keywords: ["illusion", "fear", "subconscious", "intuition"],
    upright: {
      brief: "Illusions and fears cloud your vision.",
      meaning: "The Moon represents illusion, fear, anxiety, and the subconscious mind. Things are not as they seem. Your fears may be creating false perceptions. Trust your intuition but verify the facts.",
      guidance: "Question everything. Your fears may be lying to you. What's real and what's illusion? Trust your gut."
    },
    reversed: {
      brief: "Clarity emerging. Releasing fear.",
      meaning: "Reversed, The Moon suggests clarity emerging from confusion, releasing fear, or seeing through illusions.",
      guidance: "The fog is lifting. Truth is emerging. Your fears are losing power. Clear sight returns."
    },
    element: "Water",
    astrology: "Pisces"
  },
  {
    id: 19,
    name: "The Sun",
    arcana: "major",
    suit: null,
    number: 19,
    keywords: ["success", "joy", "celebration", "positivity"],
    upright: {
      brief: "Joy, success, and celebration shine upon you.",
      meaning: "The Sun represents success, joy, celebration, and positivity. This is one of the most positive cards in the deck. Everything is illuminated. Success is assured. Celebrate life!",
      guidance: "Celebrate! Success is yours. Shine your light brightly. Joy and vitality are your birthright."
    },
    reversed: {
      brief: "Temporary setbacks. Dimmed enthusiasm.",
      meaning: "Reversed, The Sun suggests temporary setbacks, dimmed enthusiasm, or inability to see the positive.",
      guidance: "The clouds will pass. Your light still shines beneath. Rekindle your joy and optimism."
    },
    element: "Fire",
    astrology: "Sun"
  },
  {
    id: 20,
    name: "Judgement",
    arcana: "major",
    suit: null,
    number: 20,
    keywords: ["reflection", "reckoning", "awakening", "absolution"],
    upright: {
      brief: "A time of reflection and spiritual awakening.",
      meaning: "Judgement represents reflection, reckoning, and inner calling. You're being called to rise to a higher level of consciousness. Evaluate your life with honesty. Forgive yourself and others. A new chapter begins.",
      guidance: "Reflect on your journey. Forgive yourself. Answer the call to your higher purpose. You are reborn."
    },
    reversed: {
      brief: "Self-doubt. Harsh self-judgment.",
      meaning: "Reversed, Judgement suggests harsh self-criticism, self-doubt, or inability to forgive yourself or others.",
      guidance: "Stop judging yourself so harshly. You've done your best. Forgiveness is the path forward."
    },
    element: "Fire",
    astrology: "Pluto"
  },
  {
    id: 21,
    name: "The World",
    arcana: "major",
    suit: null,
    number: 21,
    keywords: ["completion", "achievement", "travel", "success"],
    upright: {
      brief: "Completion and fulfillment. The cycle is complete.",
      meaning: "The World represents completion, achievement, and fulfillment. You've come full circle. Success is achieved. This ending prepares you for the next beginning. The world is yours!",
      guidance: "Celebrate your achievement! The journey is complete. Rest before the next adventure begins."
    },
    reversed: {
      brief: "Incompletion. Lack of closure.",
      meaning: "Reversed, The World suggests incompletion, lack of closure, or falling short of your goals.",
      guidance: "What needs finishing? Don't give up now. Complete the cycle before beginning the next."
    },
    element: "Earth",
    astrology: "Saturn"
  },

  // ===== MINOR ARCANA - WANDS (Fire) =====
  {
    id: 22,
    name: "Ace of Wands",
    arcana: "minor",
    suit: "wands",
    number: 1,
    keywords: ["inspiration", "new opportunities", "growth", "potential"],
    upright: {
      brief: "A spark of inspiration. New creative opportunities.",
      meaning: "The Ace of Wands represents raw creative energy, inspiration, and new opportunities in the realm of passion and career. A new project or idea is emerging.",
      guidance: "Follow your inspiration. Take action on that creative spark. The seeds of success are planted."
    },
    reversed: {
      brief: "Delays or lack of direction.",
      meaning: "Reversed, the Ace of Wands suggests delays, lack of direction, or creative blocks preventing you from starting.",
      guidance: "What's blocking your creative flow? Reignite your passion. Small steps forward matter."
    },
    element: "Fire"
  },
  {
    id: 23,
    name: "Two of Wands",
    arcana: "minor",
    suit: "wands",
    number: 2,
    keywords: ["planning", "future", "progress", "decisions"],
    upright: {
      brief: "Planning for the future. Making bold decisions.",
      meaning: "The Two of Wands represents planning, making decisions about your future, and having the world in your hands. You're at a crossroads.",
      guidance: "Plan your next move. The world is yours to explore. Make bold decisions about your future."
    },
    reversed: {
      brief: "Fear of change or poor planning.",
      meaning: "Reversed suggests fear of the unknown, poor planning, or playing it too safe.",
      guidance: "Don't let fear hold you back. Review your plans. Take calculated risks."
    },
    element: "Fire"
  },
  {
    id: 24,
    name: "Three of Wands",
    arcana: "minor",
    suit: "wands",
    number: 3,
    keywords: ["expansion", "foresight", "overseas opportunities", "leadership"],
    upright: {
      brief: "Your efforts are expanding. Vision becomes reality.",
      meaning: "The Three of Wands represents expansion, foresight, and seeing your plans come to fruition. Opportunities may come from afar.",
      guidance: "Your vision is expanding. Look to distant horizons. Leadership and growth opportunities await."
    },
    reversed: {
      brief: "Delays or obstacles to expansion.",
      meaning: "Reversed indicates obstacles, delays in plans, or lack of foresight.",
      guidance: "Be patient with delays. Review your strategy. Expansion will come with proper planning."
    },
    element: "Fire"
  },
  {
    id: 25,
    name: "Four of Wands",
    arcana: "minor",
    suit: "wands",
    number: 4,
    keywords: ["celebration", "harmony", "marriage", "homecoming"],
    upright: {
      brief: "Celebration and harmony. A happy homecoming.",
      meaning: "The Four of Wands represents celebration, harmony, and happy events like weddings or reunions. A period of happiness and stability.",
      guidance: "Celebrate your achievements! Enjoy this harmonious period. Community and joy surround you."
    },
    reversed: {
      brief: "Lack of harmony or cancelled celebrations.",
      meaning: "Reversed suggests conflicts, lack of support, or celebrations that don't go as planned.",
      guidance: "Repair relationships. Don't take harmony for granted. Work through conflicts."
    },
    element: "Fire"
  },
  {
    id: 26,
    name: "Five of Wands",
    arcana: "minor",
    suit: "wands",
    number: 5,
    keywords: ["conflict", "competition", "tension", "diversity"],
    upright: {
      brief: "Conflict and competition. Diverse opinions clash.",
      meaning: "The Five of Wands represents conflict, competition, and tension from differing opinions. Everyone wants to be heard.",
      guidance: "Pick your battles. Not every conflict needs fighting. Find common ground amid diversity."
    },
    reversed: {
      brief: "Avoiding conflict or resolution.",
      meaning: "Reversed suggests avoiding necessary conflict, inner conflict, or finding resolution.",
      guidance: "Face the tension. Either resolve it or let it go. Avoiding conflict won't make it disappear."
    },
    element: "Fire"
  },
  {
    id: 27,
    name: "Six of Wands",
    arcana: "minor",
    suit: "wands",
    number: 6,
    keywords: ["victory", "success", "recognition", "confidence"],
    upright: {
      brief: "Victory and public recognition. Success!",
      meaning: "The Six of Wands represents victory, success, and public recognition. Your efforts are being celebrated. Confidence is high.",
      guidance: "Celebrate your win! Accept recognition gracefully. Your success inspires others."
    },
    reversed: {
      brief: "Failure or lack of recognition.",
      meaning: "Reversed suggests failure, lack of recognition, or ego problems with success.",
      guidance: "Don't let setbacks define you. True success doesn't need external validation."
    },
    element: "Fire"
  },
  {
    id: 28,
    name: "Seven of Wands",
    arcana: "minor",
    suit: "wands",
    number: 7,
    keywords: ["defense", "perseverance", "maintaining position", "challenge"],
    upright: {
      brief: "Stand your ground. Defend your position.",
      meaning: "The Seven of Wands represents defending your position, perseverance, and protecting what you've achieved against challenges.",
      guidance: "Stand firm in your beliefs. Defend what you've built. Perseverance brings victory."
    },
    reversed: {
      brief: "Overwhelmed or giving up.",
      meaning: "Reversed suggests feeling overwhelmed, giving up too easily, or exhaustion from constant fighting.",
      guidance: "Choose your battles wisely. Sometimes retreat is strategic. Don't burn out defending everything."
    },
    element: "Fire"
  },
  {
    id: 29,
    name: "Eight of Wands",
    arcana: "minor",
    suit: "wands",
    number: 8,
    keywords: ["speed", "action", "movement", "rapid progress"],
    upright: {
      brief: "Swift action and rapid progress. Things are moving!",
      meaning: "The Eight of Wands represents rapid movement, swift action, and things happening quickly. Expect sudden progress.",
      guidance: "Act quickly. Strike while the iron is hot. Momentum is on your side—ride the wave!"
    },
    reversed: {
      brief: "Delays or scattered energy.",
      meaning: "Reversed suggests delays, missed opportunities, or energy scattered in too many directions.",
      guidance: "Slow down and focus. What's causing delays? Align your energy before proceeding."
    },
    element: "Fire"
  },
  {
    id: 30,
    name: "Nine of Wands",
    arcana: "minor",
    suit: "wands",
    number: 9,
    keywords: ["resilience", "persistence", "test of faith", "boundaries"],
    upright: {
      brief: "Almost there. Persistence and resilience needed.",
      meaning: "The Nine of Wands represents resilience, persistence, and being tested. You're near the finish line but wounded. Keep going.",
      guidance: "Don't give up now! You're almost there. Set boundaries and protect yourself while persisting."
    },
    reversed: {
      brief: "Exhaustion or paranoia.",
      meaning: "Reversed suggests exhaustion, paranoia, or being too defensive without cause.",
      guidance: "Rest if needed. Are your defenses justified? Don't let past hurts make you too guarded."
    },
    element: "Fire"
  },
  {
    id: 31,
    name: "Ten of Wands",
    arcana: "minor",
    suit: "wands",
    number: 10,
    keywords: ["burden", "responsibility", "hard work", "accomplishment"],
    upright: {
      brief: "Heavy burdens but accomplishment near.",
      meaning: "The Ten of Wands represents burden, responsibility, and working hard toward completion. Success is close but the load is heavy.",
      guidance: "Delegate what you can. You don't have to carry it all. The finish line is near—pace yourself."
    },
    reversed: {
      brief: "Releasing burdens or avoiding responsibility.",
      meaning: "Reversed suggests releasing unnecessary burdens or avoiding responsibilities you should accept.",
      guidance: "Let go of what's not yours to carry. Or step up and accept necessary responsibility."
    },
    element: "Fire"
  },
  {
    id: 32,
    name: "Page of Wands",
    arcana: "minor",
    suit: "wands",
    number: 11,
    keywords: ["enthusiasm", "exploration", "discovery", "free spirit"],
    upright: {
      brief: "Enthusiastic exploration. Good news coming.",
      meaning: "The Page of Wands brings enthusiasm, exploration, and good news. A free-spirited messenger or new creative venture emerges.",
      guidance: "Explore with enthusiasm. Follow your curiosity. Good news may be on the way."
    },
    reversed: {
      brief: "Lack of direction or bad news.",
      meaning: "Reversed suggests lack of direction, bad news, or scattered enthusiasm without follow-through.",
      guidance: "Focus your energy. Don't jump from idea to idea. Complete what you start."
    },
    element: "Fire"
  },
  {
    id: 33,
    name: "Knight of Wands",
    arcana: "minor",
    suit: "wands",
    number: 12,
    keywords: ["action", "adventure", "fearlessness", "impulsiveness"],
    upright: {
      brief: "Bold action and adventure. Full speed ahead!",
      meaning: "The Knight of Wands represents action, adventure, and fearless pursuit of goals. This is a time for bold moves and passion.",
      guidance: "Be bold and adventurous. Take action now. Passion and confidence will carry you forward."
    },
    reversed: {
      brief: "Recklessness or anger.",
      meaning: "Reversed suggests recklessness, anger, or impulsive actions without thinking.",
      guidance: "Slow down before acting. Control your temper. Think before you leap."
    },
    element: "Fire"
  },
  {
    id: 34,
    name: "Queen of Wands",
    arcana: "minor",
    suit: "wands",
    number: 13,
    keywords: ["confidence", "independence", "determination", "vibrancy"],
    upright: {
      brief: "Confident, independent, and determined energy.",
      meaning: "The Queen of Wands represents confidence, independence, and vibrant determination. She knows her worth and isn't afraid to shine.",
      guidance: "Own your power. Be confident in who you are. Your vibrant energy attracts success."
    },
    reversed: {
      brief: "Insecurity or selfishness.",
      meaning: "Reversed suggests insecurity, selfishness, or jealousy overshadowing your natural confidence.",
      guidance: "Reclaim your confidence. Don't let insecurity drive you. Balance self-assurance with humility."
    },
    element: "Fire"
  },
  {
    id: 35,
    name: "King of Wands",
    arcana: "minor",
    suit: "wands",
    number: 14,
    keywords: ["leadership", "vision", "entrepreneurship", "honor"],
    upright: {
      brief: "Natural leader with vision and honor.",
      meaning: "The King of Wands represents leadership, vision, and entrepreneurial spirit. He leads with honor and inspires others.",
      guidance: "Lead with vision and integrity. Your entrepreneurial ideas have merit. Inspire others through action."
    },
    reversed: {
      brief: "Arrogance or ruthlessness.",
      meaning: "Reversed suggests arrogance, ruthlessness, or abuse of power in leadership.",
      guidance: "Check your ego. Power requires responsibility. Lead with humility and integrity."
    },
    element: "Fire"
  },

  // ===== MINOR ARCANA - CUPS (Water) =====
  {
    id: 36,
    name: "Ace of Cups",
    arcana: "minor",
    suit: "cups",
    number: 1,
    keywords: ["love", "new relationships", "compassion", "creativity"],
    upright: {
      brief: "Overflowing love and new emotional beginnings.",
      meaning: "The Ace of Cups represents new love, compassion, and emotional new beginnings. Your cup overflows with possibility.",
      guidance: "Open your heart. New love or creative inspiration flows in. Receive with gratitude."
    },
    reversed: {
      brief: "Blocked emotions or emptiness.",
      meaning: "Reversed suggests emotional blockage, emptiness, or repressed feelings.",
      guidance: "What's blocking your heart? Allow yourself to feel. Healing begins with honesty."
    },
    element: "Water"
  },
  {
    id: 37,
    name: "Two of Cups",
    arcana: "minor",
    suit: "cups",
    number: 2,
    keywords: ["partnership", "unity", "romance", "balance"],
    upright: {
      brief: "Harmonious partnership and mutual attraction.",
      meaning: "The Two of Cups represents partnership, unity, and mutual attraction. A balanced, loving connection is forming or deepening.",
      guidance: "Embrace partnership. Give and receive equally. Beautiful connection is possible now."
    },
    reversed: {
      brief: "Imbalance or broken relationship.",
      meaning: "Reversed suggests imbalanced relationships, breakups, or lack of harmony in partnerships.",
      guidance: "Address imbalances. Are you giving or taking too much? Restore equilibrium or let go."
    },
    element: "Water"
  },
  {
    id: 38,
    name: "Three of Cups",
    arcana: "minor",
    suit: "cups",
    number: 3,
    keywords: ["friendship", "community", "celebration", "creativity"],
    upright: {
      brief: "Joyful celebration with friends and community.",
      meaning: "The Three of Cups represents friendship, celebration, and community joy. Gatherings and creative collaborations thrive.",
      guidance: "Celebrate with your tribe! Community supports you. Joy multiplies when shared."
    },
    reversed: {
      brief: "Excess or gossip.",
      meaning: "Reversed suggests overindulgence, gossip, or isolation from community.",
      guidance: "Moderate celebration. Avoid gossip and drama. Reconnect if you've isolated yourself."
    },
    element: "Water"
  },
  {
    id: 39,
    name: "Four of Cups",
    arcana: "minor",
    suit: "cups",
    number: 4,
    keywords: ["apathy", "contemplation", "reevaluation", "missed opportunities"],
    upright: {
      brief: "Apathy or meditation. New opportunities go unseen.",
      meaning: "The Four of Cups represents apathy, contemplation, or being so focused inward that you miss new opportunities being offered.",
      guidance: "Look up! New blessings await but you must notice them. Reevaluate what truly matters."
    },
    reversed: {
      brief: "Awareness returning or new possibilities.",
      meaning: "Reversed suggests awareness returning, readiness to engage, or recognizing new possibilities.",
      guidance: "Wake up to what's being offered. Gratitude shifts perspective. Engage with life again."
    },
    element: "Water"
  },
  {
    id: 40,
    name: "Five of Cups",
    arcana: "minor",
    suit: "cups",
    number: 5,
    keywords: ["loss", "grief", "regret", "disappointment"],
    upright: {
      brief: "Loss and grief. But not all is lost.",
      meaning: "The Five of Cups represents loss, grief, and disappointment. But while three cups are spilled, two remain standing. All is not lost.",
      guidance: "Grieve what's lost. But remember—two cups still stand. Not everything is gone. Hope remains."
    },
    reversed: {
      brief: "Acceptance and moving on.",
      meaning: "Reversed suggests acceptance, moving on from grief, or finding forgiveness.",
      guidance: "You're healing and moving forward. Accept what happened. Focus on what remains."
    },
    element: "Water"
  },
  {
    id: 41,
    name: "Six of Cups",
    arcana: "minor",
    suit: "cups",
    number: 6,
    keywords: ["nostalgia", "childhood", "innocence", "reunion"],
    upright: {
      brief: "Nostalgia and sweet memories. Reunion possible.",
      meaning: "The Six of Cups represents nostalgia, childhood memories, and innocence. A reunion or return to simpler times may occur.",
      guidance: "Honor your past. Visit old friends or places. Let innocent joy return to your life."
    },
    reversed: {
      brief: "Living in the past or leaving it behind.",
      meaning: "Reversed suggests being stuck in the past or consciously choosing to move forward.",
      guidance: "Don't let nostalgia trap you. Learn from the past but live in the present."
    },
    element: "Water"
  },
  {
    id: 42,
    name: "Seven of Cups",
    arcana: "minor",
    suit: "cups",
    number: 7,
    keywords: ["choices", "illusion", "fantasy", "wishful thinking"],
    upright: {
      brief: "Many options but some are illusions.",
      meaning: "The Seven of Cups represents multiple choices, illusions, and wishful thinking. Not all that glitters is gold. Discernment needed.",
      guidance: "Look carefully at your options. Some are illusions. Ground dreams in reality before choosing."
    },
    reversed: {
      brief: "Clarity or avoiding decisions.",
      meaning: "Reversed suggests gaining clarity, making a decision, or avoiding choices through escapism.",
      guidance: "Get clear on what's real. Make a choice and commit. Or face what you're escaping."
    },
    element: "Water"
  },
  {
    id: 43,
    name: "Eight of Cups",
    arcana: "minor",
    suit: "cups",
    number: 8,
    keywords: ["walking away", "disillusionment", "seeking truth", "withdrawal"],
    upright: {
      brief: "Walking away to find something deeper.",
      meaning: "The Eight of Cups represents walking away from what no longer fulfills you, even if you've invested much. Seeking deeper meaning.",
      guidance: "It's okay to walk away. Seeking something more meaningful is brave, not wasteful."
    },
    reversed: {
      brief: "Fear of moving on or returning.",
      meaning: "Reversed suggests fear of leaving, trying again after walking away, or avoiding necessary change.",
      guidance: "What holds you in place? Sometimes staying is harder than leaving. Choose growth."
    },
    element: "Water"
  },
  {
    id: 44,
    name: "Nine of Cups",
    arcana: "minor",
    suit: "cups",
    number: 9,
    keywords: ["satisfaction", "contentment", "wish fulfillment", "luxury"],
    upright: {
      brief: "The wish card! Satisfaction and contentment.",
      meaning: "The Nine of Cups represents wish fulfillment, emotional satisfaction, and contentment. You're getting what you wanted.",
      guidance: "Celebrate your abundance! Your wishes are coming true. Savor this satisfaction."
    },
    reversed: {
      brief: "Greed or inner unhappiness.",
      meaning: "Reversed suggests greed, materialism, or inner unhappiness despite outer success.",
      guidance: "More won't make you happy. Look within for true satisfaction. Gratitude shifts everything."
    },
    element: "Water"
  },
  {
    id: 45,
    name: "Ten of Cups",
    arcana: "minor",
    suit: "cups",
    number: 10,
    keywords: ["harmony", "family", "happiness", "alignment"],
    upright: {
      brief: "Perfect emotional fulfillment and family harmony.",
      meaning: "The Ten of Cups represents emotional fulfillment, happy family, and harmony. This is the 'happily ever after' card.",
      guidance: "Cherish this harmony. Family and emotional fulfillment bless you. You've found your happy ending."
    },
    reversed: {
      brief: "Broken home or misalignment.",
      meaning: "Reversed suggests family discord, broken relationships, or misalignment with values.",
      guidance: "Repair what's broken or accept what cannot be. Seek harmony where possible."
    },
    element: "Water"
  },
  {
    id: 46,
    name: "Page of Cups",
    arcana: "minor",
    suit: "cups",
    number: 11,
    keywords: ["creative opportunities", "intuitive messages", "curiosity", "sensitivity"],
    upright: {
      brief: "Creative opportunity or intuitive message.",
      meaning: "The Page of Cups brings creative opportunities, intuitive messages, and youthful sensitivity. A dreamer with gentle spirit.",
      guidance: "Trust your intuition. Creative ideas are flowing. Approach life with curious wonder."
    },
    reversed: {
      brief: "Emotional immaturity or blocked creativity.",
      meaning: "Reversed suggests emotional immaturity, blocked creativity, or ignoring intuitive messages.",
      guidance: "Grow up emotionally. Don't ignore your intuition. What creative blocks need clearing?"
    },
    element: "Water"
  },
  {
    id: 47,
    name: "Knight of Cups",
    arcana: "minor",
    suit: "cups",
    number: 12,
    keywords: ["romance", "charm", "imagination", "idealism"],
    upright: {
      brief: "Romantic, charming, and idealistic approach.",
      meaning: "The Knight of Cups represents romance, charm, and following your heart. A dreamer and idealist bringing proposals.",
      guidance: "Follow your heart. Romance and beauty call you. Pursue your dreams with passion."
    },
    reversed: {
      brief: "Moodiness or unrealistic expectations.",
      meaning: "Reversed suggests moodiness, jealousy, or unrealistic romantic expectations.",
      guidance: "Ground your idealism. Are your expectations realistic? Balance dreams with practicality."
    },
    element: "Water"
  },
  {
    id: 48,
    name: "Queen of Cups",
    arcana: "minor",
    suit: "cups",
    number: 13,
    keywords: ["compassion", "intuition", "emotional security", "caring"],
    upright: {
      brief: "Compassionate, intuitive, and emotionally secure.",
      meaning: "The Queen of Cups represents compassion, intuition, and emotional security. She's nurturing while maintaining healthy boundaries.",
      guidance: "Lead with compassion. Trust your intuition. Nurture others from a full cup."
    },
    reversed: {
      brief: "Emotional insecurity or martyrdom.",
      meaning: "Reversed suggests emotional insecurity, codependency, or martyrdom.",
      guidance: "Fill your own cup first. Set boundaries. Your emotions matter too."
    },
    element: "Water"
  },
  {
    id: 49,
    name: "King of Cups",
    arcana: "minor",
    suit: "cups",
    number: 14,
    keywords: ["emotional balance", "diplomacy", "compassion", "calm"],
    upright: {
      brief: "Emotionally balanced and diplomatic leadership.",
      meaning: "The King of Cups represents emotional balance, diplomacy, and compassionate control. He's mastered his emotions.",
      guidance: "Master your emotions. Lead with compassion and wisdom. Balance feeling with thinking."
    },
    reversed: {
      brief: "Emotional manipulation or coldness.",
      meaning: "Reversed suggests emotional manipulation, coldness, or volatility.",
      guidance: "Don't use emotions as weapons. Or thaw your frozen heart. Balance is needed."
    },
    element: "Water"
  },


  // ===== MINOR ARCANA - SWORDS (Air) =====
  {
    id: 50,
    name: "Ace of Swords",
    arcana: "minor",
    suit: "swords",
    number: 1,
    keywords: ["breakthrough", "clarity", "truth", "new ideas"],
    upright: {
      brief: "Mental clarity and breakthrough. Truth revealed.",
      meaning: "The Ace of Swords represents mental clarity, breakthrough, and truth cutting through confusion. New ideas and clear thinking emerge.",
      guidance: "Clarity is yours. Speak your truth. New mental breakthroughs illuminate the path."
    },
    reversed: {
      brief: "Confusion or harsh words.",
      meaning: "Reversed suggests mental confusion, clouded judgment, or using words as weapons.",
      guidance: "Clear the mental fog. Think before speaking. Truth doesn't require cruelty."
    },
    element: "Air"
  },
  {
    id: 51,
    name: "Two of Swords",
    arcana: "minor",
    suit: "swords",
    number: 2,
    keywords: ["difficult choices", "stalemate", "avoidance", "balance"],
    upright: {
      brief: "Difficult decision. Stalemate or avoidance.",
      meaning: "The Two of Swords represents difficult choices, stalemate, or avoiding a decision you need to make. You're at an impasse.",
      guidance: "Remove the blindfold. Face the choice. Avoidance won't resolve the situation."
    },
    reversed: {
      brief: "Decision made or information revealed.",
      meaning: "Reversed suggests finally making a decision or receiving information that helps you choose.",
      guidance: "Choose and commit. New information helps. The stalemate is breaking."
    },
    element: "Air"
  },
  {
    id: 52,
    name: "Three of Swords",
    arcana: "minor",
    suit: "swords",
    number: 3,
    keywords: ["heartbreak", "sorrow", "grief", "painful truth"],
    upright: {
      brief: "Heartbreak and sorrow. Painful but necessary.",
      meaning: "The Three of Swords represents heartbreak, sorrow, and painful truths. This card signifies emotional pain that leads to growth.",
      guidance: "Feel the pain. Grief is healing. This heartbreak, though painful, brings necessary truth."
    },
    reversed: {
      brief: "Recovery from heartbreak.",
      meaning: "Reversed suggests recovery from pain, forgiveness, or releasing sorrow.",
      guidance: "Healing is happening. Forgive and release. Your heart is mending."
    },
    element: "Air"
  },
  {
    id: 53,
    name: "Four of Swords",
    arcana: "minor",
    suit: "swords",
    number: 4,
    keywords: ["rest", "recovery", "contemplation", "peace"],
    upright: {
      brief: "Rest and recovery needed. Time to recharge.",
      meaning: "The Four of Swords represents rest, recovery, and peaceful contemplation. You need time to recharge mentally and physically.",
      guidance: "Rest now. Recovery is not weakness. Meditation and stillness restore your power."
    },
    reversed: {
      brief: "Restlessness or burnout.",
      meaning: "Reversed suggests restlessness, burnout, or inability to rest when needed.",
      guidance: "You must rest. Burnout helps no one. Give yourself permission to pause."
    },
    element: "Air"
  },
  {
    id: 54,
    name: "Five of Swords",
    arcana: "minor",
    suit: "swords",
    number: 5,
    keywords: ["conflict", "defeat", "winning at all costs", "betrayal"],
    upright: {
      brief: "Conflict and hollow victory. Was it worth it?",
      meaning: "The Five of Swords represents conflict, defeat, and winning at all costs. Victory may be hollow if won unethically.",
      guidance: "Choose battles wisely. Some victories aren't worth the cost. Walk away from toxic conflicts."
    },
    reversed: {
      brief: "Making amends or moving on.",
      meaning: "Reversed suggests making amends, moving past conflict, or choosing not to fight.",
      guidance: "Reconcile if possible. Or walk away with dignity. Not every battle needs fighting."
    },
    element: "Air"
  },
  {
    id: 55,
    name: "Six of Swords",
    arcana: "minor",
    suit: "swords",
    number: 6,
    keywords: ["transition", "change", "moving on", "healing journey"],
    upright: {
      brief: "Moving toward calmer waters. Transition begins.",
      meaning: "The Six of Swords represents transition, moving on from difficulty, and healing journeys. You're heading toward calmer waters.",
      guidance: "Keep moving forward. Leave troubles behind. Calmer waters await ahead."
    },
    reversed: {
      brief: "Resistance to change or delayed transition.",
      meaning: "Reversed suggests resistance to necessary change, delayed transitions, or staying in difficulty.",
      guidance: "Stop resisting. The transition is necessary. What keeps you in troubled waters?"
    },
    element: "Air"
  },
  {
    id: 56,
    name: "Seven of Swords",
    arcana: "minor",
    suit: "swords",
    number: 7,
    keywords: ["deception", "strategy", "stealth", "independence"],
    upright: {
      brief: "Strategy or deception. Acting alone.",
      meaning: "The Seven of Swords represents deception, strategy, or acting independently. Someone may be dishonest, or you're being strategic.",
      guidance: "Use strategy wisely. Don't deceive yourself or others. Independence is fine, but honesty matters."
    },
    reversed: {
      brief: "Coming clean or being caught.",
      meaning: "Reversed suggests confessing, being caught, or abandoning deceptive strategies.",
      guidance: "Truth emerges. Come clean now. Deception is unsustainable."
    },
    element: "Air"
  },
  {
    id: 57,
    name: "Eight of Swords",
    arcana: "minor",
    suit: "swords",
    number: 8,
    keywords: ["restriction", "powerlessness", "victim mentality", "self-imposed limits"],
    upright: {
      brief: "Feeling trapped but the bindings are loose.",
      meaning: "The Eight of Swords represents feeling trapped, restricted, or powerless. But look closely—the bindings are loose. You can free yourself.",
      guidance: "You're not as trapped as you think. Remove the blindfold. The prison is partly self-created."
    },
    reversed: {
      brief: "Freedom or new perspective.",
      meaning: "Reversed suggests breaking free, gaining new perspective, or releasing victim mentality.",
      guidance: "Freedom is yours! You're seeing clearly now. Step out of self-imposed limitations."
    },
    element: "Air"
  },
  {
    id: 58,
    name: "Nine of Swords",
    arcana: "minor",
    suit: "swords",
    number: 9,
    keywords: ["anxiety", "worry", "nightmares", "guilt"],
    upright: {
      brief: "Anxiety and worry. Mental anguish.",
      meaning: "The Nine of Swords represents anxiety, worry, nightmares, and mental anguish. Your thoughts are tormenting you, often worse than reality.",
      guidance: "Your fears may be exaggerated. Seek support. What you imagine is worse than what is."
    },
    reversed: {
      brief: "Recovery from anxiety or facing fears.",
      meaning: "Reversed suggests recovering from anxiety, facing fears, or finding hope after despair.",
      guidance: "The worst is passing. Face your fears—they're not as bad as imagined. Hope returns."
    },
    element: "Air"
  },
  {
    id: 59,
    name: "Ten of Swords",
    arcana: "minor",
    suit: "swords",
    number: 10,
    keywords: ["painful ending", "rock bottom", "betrayal", "crisis"],
    upright: {
      brief: "Rock bottom. But it can only get better.",
      meaning: "The Ten of Swords represents painful endings, rock bottom, and crisis. This is as bad as it gets—which means it's over and recovery begins.",
      guidance: "You've hit bottom. But the only way is up. This ending makes space for new beginnings."
    },
    reversed: {
      brief: "Recovery or avoiding the inevitable.",
      meaning: "Reversed suggests recovery from crisis, or avoiding an inevitable ending.",
      guidance: "Healing begins. Or stop avoiding the inevitable end. Face it so you can move on."
    },
    element: "Air"
  },
  {
    id: 60,
    name: "Page of Swords",
    arcana: "minor",
    suit: "swords",
    number: 11,
    keywords: ["curiosity", "mental restlessness", "vigilance", "communication"],
    upright: {
      brief: "Curious and mentally agile. Stay alert.",
      meaning: "The Page of Swords represents curiosity, mental energy, and communication. Stay vigilant and intellectually engaged.",
      guidance: "Stay curious and alert. Think before you speak. New ideas emerge through inquiry."
    },
    reversed: {
      brief: "Gossip or scattered thinking.",
      meaning: "Reversed suggests gossip, scattered thinking, or using words to hurt.",
      guidance: "Control your tongue. Focus your mental energy. Don't spread rumors or half-truths."
    },
    element: "Air"
  },
  {
    id: 61,
    name: "Knight of Swords",
    arcana: "minor",
    suit: "swords",
    number: 12,
    keywords: ["action", "ambition", "driven", "haste"],
    upright: {
      brief: "Charging forward with ambitious action.",
      meaning: "The Knight of Swords represents ambitious action, intellectual pursuit, and charging toward goals. Fast-paced and determined.",
      guidance: "Act decisively. Pursue your goals with determination. But don't rush so fast you miss details."
    },
    reversed: {
      brief: "Aggression or lack of planning.",
      meaning: "Reversed suggests aggression, recklessness, or charging ahead without proper planning.",
      guidance: "Slow down. Think before acting. Your aggression is counterproductive."
    },
    element: "Air"
  },
  {
    id: 62,
    name: "Queen of Swords",
    arcana: "minor",
    suit: "swords",
    number: 13,
    keywords: ["independence", "clear thinking", "direct communication", "perception"],
    upright: {
      brief: "Independent thinker with clear communication.",
      meaning: "The Queen of Swords represents independence, clear thinking, and direct communication. She sees through BS and speaks truth.",
      guidance: "Think independently. Communicate clearly. See situations objectively, not emotionally."
    },
    reversed: {
      brief: "Harsh or cold communication.",
      meaning: "Reversed suggests harsh judgment, cold communication, or bitterness.",
      guidance: "Soften your edges. Truth doesn't require cruelty. Balance clarity with compassion."
    },
    element: "Air"
  },
  {
    id: 63,
    name: "King of Swords",
    arcana: "minor",
    suit: "swords",
    number: 14,
    keywords: ["authority", "truth", "intellectual power", "ethical"],
    upright: {
      brief: "Intellectual authority and ethical truth.",
      meaning: "The King of Swords represents intellectual authority, truth, and ethical use of power. He rules with logic and fairness.",
      guidance: "Use your intellectual power ethically. Seek truth. Lead with logic and fairness."
    },
    reversed: {
      brief: "Manipulation or abuse of power.",
      meaning: "Reversed suggests manipulation, abuse of intellectual power, or unethical behavior.",
      guidance: "Check your motives. Are you manipulating? Use your intelligence ethically."
    },
    element: "Air"
  },

  // ===== MINOR ARCANA - PENTACLES (Earth) =====
  {
    id: 64,
    name: "Ace of Pentacles",
    arcana: "minor",
    suit: "pentacles",
    number: 1,
    keywords: ["opportunity", "prosperity", "manifestation", "new venture"],
    upright: {
      brief: "New financial opportunity. Seeds of prosperity.",
      meaning: "The Ace of Pentacles represents new financial opportunities, prosperity, and material manifestation. A new venture or windfall approaches.",
      guidance: "Seize this opportunity. Plant seeds of prosperity. Material success is within reach."
    },
    reversed: {
      brief: "Lost opportunity or lack of planning.",
      meaning: "Reversed suggests missed opportunities, poor financial planning, or greed.",
      guidance: "Don't miss this chance. Plan better financially. Check your motivations around money."
    },
    element: "Earth"
  },
  {
    id: 65,
    name: "Two of Pentacles",
    arcana: "minor",
    suit: "pentacles",
    number: 2,
    keywords: ["balance", "adaptability", "time management", "priorities"],
    upright: {
      brief: "Juggling priorities. Flexibility needed.",
      meaning: "The Two of Pentacles represents balancing multiple priorities, adaptability, and flexible time management. You're juggling successfully.",
      guidance: "Stay flexible. Prioritize wisely. You can balance it all, but not all at once."
    },
    reversed: {
      brief: "Overwhelm or poor time management.",
      meaning: "Reversed suggests overwhelm, dropping balls, or poor prioritization.",
      guidance: "You're juggling too much. Delegate or drop something. Better to do less well than more poorly."
    },
    element: "Earth"
  },
  {
    id: 66,
    name: "Three of Pentacles",
    arcana: "minor",
    suit: "pentacles",
    number: 3,
    keywords: ["teamwork", "collaboration", "learning", "building"],
    upright: {
      brief: "Teamwork and collaboration create success.",
      meaning: "The Three of Pentacles represents teamwork, collaboration, and building something of quality together. Your skills are recognized.",
      guidance: "Work together. Share skills and learn. Collaboration creates something greater than solo effort."
    },
    reversed: {
      brief: "Lack of teamwork or poor quality.",
      meaning: "Reversed suggests lack of teamwork, poor quality work, or no recognition for efforts.",
      guidance: "Improve collaboration. Maintain standards. Ensure your work gets proper recognition."
    },
    element: "Earth"
  },
  {
    id: 67,
    name: "Four of Pentacles",
    arcana: "minor",
    suit: "pentacles",
    number: 4,
    keywords: ["control", "stability", "possessiveness", "conservation"],
    upright: {
      brief: "Holding on tight. Security or greed?",
      meaning: "The Four of Pentacles represents control, holding onto resources, and security. But are you conserving wisely or being greedy?",
      guidance: "Financial security is wise. But don't become miserly. Share your abundance."
    },
    reversed: {
      brief: "Letting go or reckless spending.",
      meaning: "Reversed suggests releasing control, generosity, or reckless spending.",
      guidance: "Let go a little. Or rein in spending. Find balance between saving and sharing."
    },
    element: "Earth"
  },
  {
    id: 68,
    name: "Five of Pentacles",
    arcana: "minor",
    suit: "pentacles",
    number: 5,
    keywords: ["hardship", "loss", "isolation", "poverty"],
    upright: {
      brief: "Financial hardship. But help is available.",
      meaning: "The Five of Pentacles represents hardship, loss, and feeling left out in the cold. But notice—the church window glows. Help is available if you look.",
      guidance: "Times are hard. But reach out for help. Pride shouldn't prevent you from seeking support."
    },
    reversed: {
      brief: "Recovery from hardship.",
      meaning: "Reversed suggests recovery from financial hardship or finding the help you need.",
      guidance: "Things are improving. You're finding your way through. Help arrives when you ask."
    },
    element: "Earth"
  },
  {
    id: 69,
    name: "Six of Pentacles",
    arcana: "minor",
    suit: "pentacles",
    number: 6,
    keywords: ["generosity", "charity", "sharing", "fairness"],
    upright: {
      brief: "Generosity and fair exchange. Giving or receiving.",
      meaning: "The Six of Pentacles represents generosity, charity, and sharing resources fairly. You may be giving or receiving help.",
      guidance: "Share generously. Or receive gracefully. Fair exchange creates positive flow."
    },
    reversed: {
      brief: "Strings attached or unfair exchange.",
      meaning: "Reversed suggests conditional giving, debt, or unfair power dynamics in exchange.",
      guidance: "Watch for strings attached. Give freely or not at all. Ensure exchanges are fair."
    },
    element: "Earth"
  },
  {
    id: 70,
    name: "Seven of Pentacles",
    arcana: "minor",
    suit: "pentacles",
    number: 7,
    keywords: ["patience", "investment", "long-term view", "assessment"],
    upright: {
      brief: "Patience with long-term investments. Assess progress.",
      meaning: "The Seven of Pentacles represents patience with long-term goals, assessing your investments, and waiting for harvest.",
      guidance: "Be patient. Assess your progress. Long-term investments require time to grow."
    },
    reversed: {
      brief: "Impatience or poor return.",
      meaning: "Reversed suggests impatience, poor returns on investment, or lack of progress.",
      guidance: "Re-evaluate your approach. Are you investing wisely? Sometimes you must cut losses."
    },
    element: "Earth"
  },
  {
    id: 71,
    name: "Eight of Pentacles",
    arcana: "minor",
    suit: "pentacles",
    number: 8,
    keywords: ["craftsmanship", "skill development", "dedication", "quality"],
    upright: {
      brief: "Dedicated work and skill development.",
      meaning: "The Eight of Pentacles represents craftsmanship, skill development, and dedication to quality work. You're mastering your craft.",
      guidance: "Focus on your craft. Quality matters more than quantity. Dedication brings mastery."
    },
    reversed: {
      brief: "Lack of focus or perfectionism.",
      meaning: "Reversed suggests lack of focus, cutting corners, or perfectionism preventing completion.",
      guidance: "Focus your efforts. Maintain standards but don't let perfectionism paralyze you."
    },
    element: "Earth"
  },
  {
    id: 72,
    name: "Nine of Pentacles",
    arcana: "minor",
    suit: "pentacles",
    number: 9,
    keywords: ["abundance", "self-reliance", "luxury", "independence"],
    upright: {
      brief: "Self-made success and material abundance.",
      meaning: "The Nine of Pentacles represents self-reliance, luxury earned through hard work, and enjoying the fruits of your labor.",
      guidance: "Enjoy your success! You've earned this abundance through self-reliance and hard work."
    },
    reversed: {
      brief: "Dependence or materialism.",
      meaning: "Reversed suggests financial dependence, materialism, or success without fulfillment.",
      guidance: "Build self-reliance. Money isn't everything. Balance material success with inner richness."
    },
    element: "Earth"
  },
  {
    id: 73,
    name: "Ten of Pentacles",
    arcana: "minor",
    suit: "pentacles",
    number: 10,
    keywords: ["legacy", "inheritance", "family", "long-term success"],
    upright: {
      brief: "Lasting wealth and family legacy.",
      meaning: "The Ten of Pentacles represents lasting wealth, inheritance, family, and long-term success that spans generations.",
      guidance: "Build a legacy. Family and long-term wealth matter. Create something that lasts beyond you."
    },
    reversed: {
      brief: "Financial loss or family conflict.",
      meaning: "Reversed suggests financial loss, family disputes over money, or unstable foundations.",
      guidance: "Repair family rifts. Secure your foundations. Don't let money destroy relationships."
    },
    element: "Earth"
  },
  {
    id: 74,
    name: "Page of Pentacles",
    arcana: "minor",
    suit: "pentacles",
    number: 11,
    keywords: ["opportunity", "studiousness", "new venture", "manifestation"],
    upright: {
      brief: "New opportunity or learning. Good news about finances.",
      meaning: "The Page of Pentacles brings new opportunities, studiousness, and good news about finances or career.",
      guidance: "Learn and study. New opportunities emerge. Stay grounded while pursuing goals."
    },
    reversed: {
      brief: "Lack of progress or procrastination.",
      meaning: "Reversed suggests lack of progress, procrastination, or unrealistic financial goals.",
      guidance: "Stop procrastinating. Set realistic goals. Turn study into action."
    },
    element: "Earth"
  },
  {
    id: 75,
    name: "Knight of Pentacles",
    arcana: "minor",
    suit: "pentacles",
    number: 12,
    keywords: ["efficiency", "routine", "conservatism", "hard work"],
    upright: {
      brief: "Steady, reliable progress. Hard work pays off.",
      meaning: "The Knight of Pentacles represents efficiency, routine, and steady progress. Slow and steady wins the race.",
      guidance: "Work hard and consistently. Slow progress is still progress. Reliability and routine create success."
    },
    reversed: {
      brief: "Laziness or obsession with work.",
      meaning: "Reversed suggests laziness, workaholic tendencies, or boring routine without purpose.",
      guidance: "Balance work and play. Or get off the couch and work. Find purposeful routine."
    },
    element: "Earth"
  },
  {
    id: 76,
    name: "Queen of Pentacles",
    arcana: "minor",
    suit: "pentacles",
    number: 13,
    keywords: ["practical", "nurturing", "down-to-earth", "abundance"],
    upright: {
      brief: "Practical nurturer with grounded abundance.",
      meaning: "The Queen of Pentacles represents practical nurturing, financial security, and down-to-earth abundance. She creates comfort and wealth.",
      guidance: "Nurture practically. Create comfort and security. Abundance flows from grounded action."
    },
    reversed: {
      brief: "Materialism or neglecting self-care.",
      meaning: "Reversed suggests materialism, financial insecurity, or neglecting self-care.",
      guidance: "Balance material and spiritual. Care for yourself. Your worth isn't your wealth."
    },
    element: "Earth"
  },
  {
    id: 77,
    name: "King of Pentacles",
    arcana: "minor",
    suit: "pentacles",
    number: 14,
    keywords: ["wealth", "business", "leadership", "security"],
    upright: {
      brief: "Wealthy, successful leader. Material mastery.",
      meaning: "The King of Pentacles represents wealth, business success, and material mastery. He's built an empire through discipline and vision.",
      guidance: "Build your empire. Lead with business acumen. Your financial vision creates lasting wealth."
    },
    reversed: {
      brief: "Greed or financial failure.",
      meaning: "Reversed suggests greed, corruption, or financial instability despite appearances.",
      guidance: "Check your ethics. Wealth without integrity crumbles. Don't let greed corrupt you."
    },
    element: "Earth"
  }
];

// Helper functions
export const getRandomCard = () => {
  return tarotCards[Math.floor(Math.random() * tarotCards.length)];
};

export const getCardById = (id) => {
  return tarotCards.find(card => card.id === id);
};

export const drawCards = (count = 1) => {
  const shuffled = [...tarotCards].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

export const getMajorArcana = () => {
  return tarotCards.filter(card => card.arcana === 'major');
};

export const getMinorArcana = () => {
  return tarotCards.filter(card => card.arcana === 'minor');
};

export const getBySuit = (suit) => {
  return tarotCards.filter(card => card.suit === suit);
};
