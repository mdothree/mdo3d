/**
 * Card utility functions for Discord
 */

import { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';

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
 * Create a Discord embed for a single card
 */
export function createCardEmbed(card, title = '🔮 Your Oracle Card') {
  const embed = new EmbedBuilder()
    .setColor('#8b5cf6') // Purple
    .setTitle(title)
    .setDescription(`**${card.name}**\n_${card.keywords.join(', ')}_`)
    .addFields(
      { name: '✨ Message', value: card.upright.brief },
      { name: '📖 Meaning', value: card.upright.meaning },
      { name: '💫 Guidance', value: card.upright.guidance },
      { 
        name: '🌟 Details', 
        value: `Element: ${card.element} • Theme: ${card.theme}`,
        inline: true
      }
    )
    .setFooter({ text: 'May this guidance illuminate your path ✨' })
    .setTimestamp();

  return embed;
}

/**
 * Create embed for 3-card spread
 */
export function createSpreadEmbed(cards, positions = ['Past', 'Present', 'Future']) {
  const embed = new EmbedBuilder()
    .setColor('#ec4899') // Pink
    .setTitle('🔮 Three-Card Oracle Spread')
    .setDescription('Past • Present • Future')
    .setTimestamp();

  cards.forEach((card, index) => {
    embed.addFields({
      name: `${index + 1}. ${positions[index]}: ${card.name}`,
      value: `_${card.keywords.slice(0, 3).join(', ')}_\n${card.upright.brief}\n\n💫 ${card.upright.guidance}`
    });
  });

  embed.setFooter({ text: 'Reflect on how these messages connect ✨' });

  return embed;
}

/**
 * Create embed for Celtic Cross spread
 */
export function createCelticCrossEmbed(cards) {
  const positions = [
    'Present Situation',
    'Challenge/Crossing',
    'Foundation',
    'Recent Past',
    'Possible Future',
    'Immediate Future',
    'Your Attitude',
    'External Influences',
    'Hopes & Fears',
    'Final Outcome'
  ];

  const embed = new EmbedBuilder()
    .setColor('#fbbf24') // Gold
    .setTitle('🔮 Celtic Cross Oracle Spread')
    .setDescription('A comprehensive 10-card reading revealing deep insights')
    .setTimestamp();

  // Add first 5 cards as fields
  cards.slice(0, 5).forEach((card, index) => {
    embed.addFields({
      name: `${index + 1}. ${positions[index]}: ${card.name}`,
      value: `${card.upright.brief}`,
      inline: false
    });
  });

  embed.setFooter({ text: 'Part 1 of 2 - Use buttons below for full reading ✨' });

  return embed;
}

/**
 * Create button row for card actions
 */
export function createCardButtons(includeSpread = true) {
  const buttons = [];

  buttons.push(
    new ButtonBuilder()
      .setCustomId('newcard')
      .setLabel('Draw Another')
      .setEmoji('🔮')
      .setStyle(ButtonStyle.Primary)
  );

  if (includeSpread) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId('threecard')
        .setLabel('3-Card Spread')
        .setEmoji('⭐')
        .setStyle(ButtonStyle.Success)
    );
  }

  buttons.push(
    new ButtonBuilder()
      .setLabel('Get Premium')
      .setEmoji('💎')
      .setStyle(ButtonStyle.Link)
      .setURL('https://patreon.com/your-bot-name') // Update with actual Patreon
  );

  return new ActionRowBuilder().addComponents(buttons);
}

/**
 * Create affirmation embed
 */
export function createAffirmationEmbed() {
  const affirmations = [
    "I am aligned with my highest purpose.",
    "The universe supports my every step.",
    "I trust the journey of my soul.",
    "Divine timing is at work in my life.",
    "I am exactly where I need to be.",
    "My intuition guides me perfectly.",
    "I am open to receiving abundance.",
    "Love flows through me effortlessly.",
    "I release what no longer serves me.",
    "Every challenge is an opportunity for growth."
  ];

  const affirmation = affirmations[Math.floor(Math.random() * affirmations.length)];

  return new EmbedBuilder()
    .setColor('#10b981') // Green
    .setTitle('✨ Daily Affirmation')
    .setDescription(`_"${affirmation}"_`)
    .setFooter({ text: 'Carry this energy with you today 💚' })
    .setTimestamp();
}

/**
 * Get moon phase
 */
export function getMoonPhase() {
  const phases = [
    { name: 'New Moon', emoji: '🌑', meaning: 'New beginnings, setting intentions' },
    { name: 'Waxing Crescent', emoji: '🌒', meaning: 'Growth, momentum building' },
    { name: 'First Quarter', emoji: '🌓', meaning: 'Decision making, taking action' },
    { name: 'Waxing Gibbous', emoji: '🌔', meaning: 'Refinement, adjustment' },
    { name: 'Full Moon', emoji: '🌕', meaning: 'Completion, manifestation, release' },
    { name: 'Waning Gibbous', emoji: '🌖', meaning: 'Gratitude, sharing wisdom' },
    { name: 'Last Quarter', emoji: '🌗', meaning: 'Letting go, forgiveness' },
    { name: 'Waning Crescent', emoji: '🌘', meaning: 'Rest, surrender, reflection' }
  ];

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  
  const c = year / 100;
  const e = 2 - Math.floor(c) + Math.floor(c / 4);
  const jd = Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 2)) + day + e - 1524.5;
  const daysSinceNew = (jd - 2451549.5) / 29.53;
  const phaseIndex = Math.floor((daysSinceNew - Math.floor(daysSinceNew)) * 8);
  
  return phases[phaseIndex] || phases[0];
}

/**
 * Create moon phase embed
 */
export function createMoonPhaseEmbed() {
  const moon = getMoonPhase();
  
  return new EmbedBuilder()
    .setColor('#a78bfa') // Lavender
    .setTitle(`${moon.emoji} ${moon.name}`)
    .setDescription(`**Energy:** ${moon.meaning}`)
    .setFooter({ text: 'Align your actions with lunar energy 🌙' })
    .setTimestamp();
}
