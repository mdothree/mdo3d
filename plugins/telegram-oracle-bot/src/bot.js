/**
 * Telegram Oracle Bot
 * Daily oracle card readings with Telegram Stars payments
 */

import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { oracleCards } from './cardDatabase.js';
import { getRandomCard, getMultipleCards, formatCardMessage } from './cardUtils.js';
import { userSessions, trackDailyCard } from './userState.js';

dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Pricing in Telegram Stars (1 Star ≈ $0.02)
const PRICING = {
  DAILY_CARD: 0,           // Free
  THREE_CARD: 250,         // ⭐250 (~$5)
  CELTIC_CROSS: 500        // ⭐500 (~$10)
};

console.log('🔮 Oracle Bot is running...');

// Command: /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const welcomeMessage = `
🔮 *Welcome to the Daily Oracle Bot*

I offer mystical guidance through oracle card readings:

*Free Daily Reading:*
/daily - Draw your free daily card (once per day)

*Premium Readings:*
/threecard - Past, Present, Future spread (⭐${PRICING.THREE_CARD} Stars)
/celtic - Celtic Cross spread (⭐${PRICING.CELTIC_CROSS} Stars)

*Other Commands:*
/help - Show this message
/about - Learn about oracle cards

✨ Your journey begins now...
  `;
  
  bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
});

// Command: /help
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const helpMessage = `
🌟 *Oracle Bot Commands*

*Free:*
/daily - Your free daily oracle card
/about - Learn about oracle readings

*Premium Spreads:*
/threecard - 3-Card Spread (⭐${PRICING.THREE_CARD})
  Past, Present, Future guidance

/celtic - Celtic Cross (⭐${PRICING.CELTIC_CROSS})
  10-card deep dive reading

💫 Each reading offers guidance and insight for your spiritual journey.
  `;
  
  bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});

// Command: /about
bot.onText(/\/about/, (msg) => {
  const chatId = msg.chat.id;
  const aboutMessage = `
🌙 *About Oracle Cards*

Oracle cards are spiritual tools that provide guidance, insight, and clarity. Unlike tarot, oracle decks are more freeform and intuitive.

*How it works:*
• Ask a question or set an intention
• Draw your card(s)
• Receive personalized guidance
• Reflect on the message

*Our 44-Card Deck includes:*
• Transformation themes
• Elemental wisdom (Fire, Water, Air, Earth)
• Spiritual guidance
• Life path insights

Trust your intuition. The cards that appear are meant for you. ✨
  `;
  
  bot.sendMessage(chatId, aboutMessage, { parse_mode: 'Markdown' });
});

// Command: /daily - Free daily card
bot.onText(/\/daily/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  // Check if user already got their daily card
  const canDraw = trackDailyCard(userId);
  
  if (!canDraw) {
    return bot.sendMessage(chatId, 
      '🌟 You\'ve already drawn your daily card today!\n\n' +
      'Come back tomorrow for a new reading, or try a premium spread:\n' +
      `/threecard (⭐${PRICING.THREE_CARD}) or /celtic (⭐${PRICING.CELTIC_CROSS})`,
      { parse_mode: 'Markdown' }
    );
  }
  
  // Draw random card
  const card = getRandomCard(oracleCards);
  const message = formatCardMessage(card, 'Your Daily Oracle Card');
  
  await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

// Command: /threecard - 3-card spread (paid)
bot.onText(/\/threecard/, async (msg) => {
  const chatId = msg.chat.id;
  
  // Create invoice for Telegram Stars payment
  await bot.sendInvoice(
    chatId,
    '3-Card Oracle Spread',
    'Past, Present, Future - Gain clarity on your path with three powerful cards revealing your journey.',
    'threecard_reading',
    '',  // No provider token needed for Stars
    'XTR',  // Telegram Stars currency
    [{ label: '3-Card Reading', amount: PRICING.THREE_CARD }],
    {
      photo_url: 'https://i.imgur.com/oracle3card.jpg',  // Add your image
      photo_size: 512,
      photo_width: 512,
      photo_height: 512,
      need_name: false,
      need_phone_number: false,
      need_email: false,
      need_shipping_address: false,
      is_flexible: false
    }
  );
});

// Command: /celtic - Celtic Cross spread (paid)
bot.onText(/\/celtic/, async (msg) => {
  const chatId = msg.chat.id;
  
  await bot.sendInvoice(
    chatId,
    'Celtic Cross Oracle Spread',
    'The most comprehensive reading - 10 cards revealing deep insights into your situation, challenges, and future path.',
    'celtic_reading',
    '',
    'XTR',
    [{ label: 'Celtic Cross Reading', amount: PRICING.CELTIC_CROSS }],
    {
      photo_url: 'https://i.imgur.com/oraclecross.jpg',  // Add your image
      photo_size: 512,
      photo_width: 512,
      photo_height: 512,
      need_name: false,
      need_phone_number: false,
      need_email: false,
      need_shipping_address: false,
      is_flexible: false
    }
  );
});

// Handle pre-checkout queries
bot.on('pre_checkout_query', (query) => {
  bot.answerPreCheckoutQuery(query.id, true);
});

// Handle successful payments
bot.on('successful_payment', async (msg) => {
  const chatId = msg.chat.id;
  const payload = msg.successful_payment.invoice_payload;
  
  await bot.sendMessage(chatId, '✨ Payment received! Drawing your cards...');
  
  if (payload === 'threecard_reading') {
    // Draw 3 cards
    const cards = getMultipleCards(oracleCards, 3);
    const positions = ['Past', 'Present', 'Future'];
    
    let message = '🔮 *Your 3-Card Oracle Spread*\n\n';
    
    cards.forEach((card, index) => {
      message += `*${positions[index]}: ${card.name}*\n`;
      message += `${card.upright.brief}\n\n`;
      message += `_${card.upright.meaning}_\n\n`;
      message += `💫 Guidance: ${card.upright.guidance}\n`;
      message += `───────────────\n\n`;
    });
    
    message += '✨ Reflect on how these messages connect to your journey.';
    
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    
  } else if (payload === 'celtic_reading') {
    // Draw 10 cards for Celtic Cross
    const cards = getMultipleCards(oracleCards, 10);
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
    
    let message = '🔮 *Your Celtic Cross Oracle Spread*\n\n';
    
    cards.forEach((card, index) => {
      message += `*${index + 1}. ${positions[index]}: ${card.name}*\n`;
      message += `${card.upright.brief}\n\n`;
    });
    
    message += '───────────────\n\n';
    message += '*Detailed Interpretations:*\n\n';
    
    cards.forEach((card, index) => {
      message += `*${positions[index]}*\n`;
      message += `_${card.upright.meaning}_\n`;
      message += `💫 ${card.upright.guidance}\n\n`;
    });
    
    message += '✨ This comprehensive reading illuminates your path. Take time to integrate these insights.';
    
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  }
});

// Error handling
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

export default bot;
