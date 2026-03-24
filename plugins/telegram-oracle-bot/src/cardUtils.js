/**
 * Card utility functions
 */

/**
 * Get a random card from the deck
 */
export function getRandomCard(deck) {
  const randomIndex = Math.floor(Math.random() * deck.length);
  return deck[randomIndex];
}

/**
 * Get multiple unique random cards
 */
export function getMultipleCards(deck, count) {
  const shuffled = [...deck].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Format a card message for Telegram
 */
export function formatCardMessage(card, title = 'Your Oracle Card') {
  const message = `
🔮 *${title}*

*${card.name}*
_${card.keywords.join(', ')}_

${card.upright.brief}

*Message:*
${card.upright.meaning}

*Guidance:*
💫 ${card.upright.guidance}

*Element:* ${card.element}
*Theme:* ${card.theme}
  `;
  
  return message.trim();
}

/**
 * Shuffle deck
 */
export function shuffleDeck(deck) {
  return [...deck].sort(() => Math.random() - 0.5);
}

/**
 * Get card by ID
 */
export function getCardById(deck, id) {
  return deck.find(card => card.id === id);
}
