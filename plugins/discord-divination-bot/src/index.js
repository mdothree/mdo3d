/**
 * Discord Divination Bot
 * Daily oracle cards and spiritual guidance for Discord servers
 */

import { Client, GatewayIntentBits, Events, Collection } from 'discord.js';
import dotenv from 'dotenv';
import { oracleCards } from './cardDatabase.js';
import { getRandomCard, getMultipleCards, createCardEmbed, createSpreadEmbed } from './cardUtils.js';
import { userState } from './userState.js';
import { commands } from './commands.js';

dotenv.config();

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Store commands
client.commands = new Collection();
commands.forEach(command => {
  client.commands.set(command.data.name, command);
});

// Bot ready event
client.once(Events.ClientReady, (c) => {
  console.log(`✨ ${c.user.tag} is online!`);
  console.log(`🔮 Serving ${c.guilds.cache.size} servers`);
  
  // Set bot status
  client.user.setPresence({
    activities: [{ name: '🔮 /daily for your oracle card' }],
    status: 'online'
  });
});

// Handle slash commands
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error('Error executing command:', error);
    const errorMessage = '❌ There was an error executing this command!';
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: errorMessage, ephemeral: true });
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
});

// Handle button interactions (for premium features)
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  const [action, ...params] = interaction.customId.split('_');

  try {
    if (action === 'newcard') {
      // Check if user has premium
      const hasPremium = interaction.member.roles.cache.has(process.env.PREMIUM_ROLE_ID);
      
      if (!hasPremium) {
        await interaction.reply({
          content: '⭐ This feature requires premium! Support the bot on Patreon for unlimited readings.',
          ephemeral: true
        });
        return;
      }

      // Draw new card
      const card = getRandomCard(oracleCards);
      const embed = createCardEmbed(card, '✨ Your New Oracle Card');
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (action === 'threecard') {
      await interaction.reply({
        content: '⭐ 3-Card spreads are a premium feature! Support on Patreon for access.',
        ephemeral: true
      });
    }
  } catch (error) {
    console.error('Error handling button:', error);
    await interaction.reply({
      content: '❌ Something went wrong!',
      ephemeral: true
    });
  }
});

// Error handling
client.on('error', (error) => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

// Login to Discord
client.login(process.env.DISCORD_BOT_TOKEN);

export default client;
