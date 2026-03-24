/**
 * Discord Slash Commands
 */

import { SlashCommandBuilder } from 'discord.js';
import { oracleCards } from './cardDatabase.js';
import { 
  getRandomCard, 
  getMultipleCards, 
  createCardEmbed, 
  createSpreadEmbed,
  createCardButtons,
  createAffirmationEmbed,
  createMoonPhaseEmbed
} from './cardUtils.js';
import { userState } from './userState.js';

export const commands = [
  // /daily - Free daily card
  {
    data: new SlashCommandBuilder()
      .setName('daily')
      .setDescription('Draw your free daily oracle card'),
    async execute(interaction) {
      const userId = interaction.user.id;
      const canDraw = userState.canDrawDailyCard(userId);

      if (!canDraw) {
        await interaction.reply({
          content: '🌟 You\'ve already drawn your daily card today! Come back tomorrow, or use `/draw` for unlimited readings with premium.',
          ephemeral: true
        });
        return;
      }

      await interaction.deferReply();

      const card = getRandomCard(oracleCards);
      const embed = createCardEmbed(card, '🔮 Your Daily Oracle Card');
      const buttons = createCardButtons();

      // Mark as drawn
      userState.markDailyCardDrawn(userId);
      userState.addToHistory(userId, {
        type: 'daily',
        card: card.name
      });

      await interaction.editReply({
        embeds: [embed],
        components: [buttons]
      });
    }
  },

  // /draw - Premium unlimited draws
  {
    data: new SlashCommandBuilder()
      .setName('draw')
      .setDescription('Draw an oracle card (Premium feature)'),
    async execute(interaction) {
      const hasPremium = interaction.member.roles.cache.has(process.env.PREMIUM_ROLE_ID);

      if (!hasPremium) {
        await interaction.reply({
          content: '⭐ This is a premium feature! Support the bot on Patreon for unlimited card draws.\n\nOr use `/daily` for your free daily card!',
          ephemeral: true
        });
        return;
      }

      await interaction.deferReply();

      const card = getRandomCard(oracleCards);
      const embed = createCardEmbed(card, '✨ Your Oracle Card');
      const buttons = createCardButtons();

      userState.addToHistory(interaction.user.id, {
        type: 'draw',
        card: card.name
      });

      await interaction.editReply({
        embeds: [embed],
        components: [buttons]
      });
    }
  },

  // /threecard - 3-card spread (premium)
  {
    data: new SlashCommandBuilder()
      .setName('threecard')
      .setDescription('Draw a 3-card spread (Past, Present, Future)'),
    async execute(interaction) {
      const hasPremium = interaction.member.roles.cache.has(process.env.PREMIUM_ROLE_ID);

      if (!hasPremium) {
        await interaction.reply({
          content: '⭐ 3-Card spreads are a premium feature! Support the bot on Patreon for access.',
          ephemeral: true
        });
        return;
      }

      await interaction.deferReply();

      const cards = getMultipleCards(oracleCards, 3);
      const embed = createSpreadEmbed(cards);

      userState.addToHistory(interaction.user.id, {
        type: 'threecard',
        cards: cards.map(c => c.name)
      });

      await interaction.editReply({ embeds: [embed] });
    }
  },

  // /affirmation - Daily affirmation
  {
    data: new SlashCommandBuilder()
      .setName('affirmation')
      .setDescription('Receive a daily affirmation'),
    async execute(interaction) {
      const embed = createAffirmationEmbed();
      await interaction.reply({ embeds: [embed] });
    }
  },

  // /moon - Moon phase
  {
    data: new SlashCommandBuilder()
      .setName('moon')
      .setDescription('See the current moon phase and its energy'),
    async execute(interaction) {
      const embed = createMoonPhaseEmbed();
      await interaction.reply({ embeds: [embed] });
    }
  },

  // /history - Reading history
  {
    data: new SlashCommandBuilder()
      .setName('history')
      .setDescription('View your recent card readings'),
    async execute(interaction) {
      const history = userState.getHistory(interaction.user.id, 5);

      if (history.length === 0) {
        await interaction.reply({
          content: '📜 You haven\'t drawn any cards yet! Try `/daily` for your first reading.',
          ephemeral: true
        });
        return;
      }

      const historyText = history.map((reading, index) => {
        const date = new Date(reading.timestamp);
        const dateStr = date.toLocaleDateString();
        
        if (reading.type === 'threecard') {
          return `${index + 1}. **3-Card Spread** (${dateStr})\n   ${reading.cards.join(', ')}`;
        } else {
          return `${index + 1}. **${reading.card}** (${dateStr})`;
        }
      }).join('\n\n');

      await interaction.reply({
        content: `📜 **Your Recent Readings**\n\n${historyText}`,
        ephemeral: true
      });
    }
  },

  // /premium - Premium info
  {
    data: new SlashCommandBuilder()
      .setName('premium')
      .setDescription('Learn about premium features'),
    async execute(interaction) {
      const message = `
⭐ **Premium Features**

Support the bot on Patreon and unlock:

🔮 **Unlimited Card Draws** - Draw cards anytime with \`/draw\`
🌟 **3-Card Spreads** - Past, Present, Future readings
📜 **Extended History** - Access all your past readings
💎 **Priority Support** - Direct help from the developer
✨ **Early Access** - New features before everyone else

**Tiers:**
• **Mystic Supporter** - $3/month - All features
• **Spiritual Guide** - $5/month - All features + custom role
• **Divine Patron** - $10/month - All features + bot customization

[Support on Patreon](https://patreon.com/your-bot-name)

Thank you for your support! 💜
      `;

      await interaction.reply({ content: message, ephemeral: true });
    }
  },

  // /help - Help command
  {
    data: new SlashCommandBuilder()
      .setName('help')
      .setDescription('Show all available commands'),
    async execute(interaction) {
      const message = `
🔮 **Divination Bot Commands**

**Free Commands:**
\`/daily\` - Draw your free daily oracle card
\`/affirmation\` - Get a daily affirmation
\`/moon\` - See current moon phase
\`/history\` - View your reading history
\`/help\` - Show this message
\`/premium\` - Learn about premium features

**Premium Commands:**
\`/draw\` - Unlimited card draws
\`/threecard\` - 3-card spread reading

**About:**
This bot provides daily spiritual guidance through oracle cards. Each card offers insights, messages, and guidance for your journey.

Use \`/daily\` to get started!
      `;

      await interaction.reply({ content: message, ephemeral: true });
    }
  },

  // /about - About the bot
  {
    data: new SlashCommandBuilder()
      .setName('about')
      .setDescription('Learn about the Divination Bot'),
    async execute(interaction) {
      const message = `
🔮 **About Divination Bot**

A spiritual companion for your Discord server, offering daily oracle card readings and cosmic guidance.

**Features:**
• 44 unique oracle cards with deep meanings
• Daily free card readings
• Moon phase tracking
• Daily affirmations
• Reading history

**How it works:**
Oracle cards are spiritual tools that provide guidance and insight. Each card carries a message meant just for you.

**Premium Support:**
This bot is maintained by an independent developer. Premium subscriptions help keep the bot running and enable new features!

Made with 💜 for the spiritual community
      `;

      await interaction.reply({ content: message, ephemeral: true });
    }
  }
];
