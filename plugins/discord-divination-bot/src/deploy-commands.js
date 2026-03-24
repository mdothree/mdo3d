/**
 * Deploy slash commands to Discord
 * Run this once to register commands, or after adding new commands
 */

import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { commands } from './commands.js';

dotenv.config();

const commandsData = commands.map(command => command.data.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

(async () => {
  try {
    console.log(`🔄 Deploying ${commandsData.length} slash commands...`);

    const data = await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commandsData }
    );

    console.log(`✅ Successfully deployed ${data.length} slash commands!`);
    console.log('\nCommands registered:');
    data.forEach(cmd => console.log(`  /${cmd.name} - ${cmd.description}`));
    
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
  }
})();
