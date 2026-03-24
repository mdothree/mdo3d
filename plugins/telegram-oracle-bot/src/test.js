/**
 * Test script to verify card database and utilities
 */

import { oracleCards } from './cardDatabase.js';
import { getRandomCard, getMultipleCards, formatCardMessage } from './cardUtils.js';

console.log('🔮 Testing Oracle Bot Components\n');

// Test 1: Card database loaded
console.log(`✅ Card database loaded: ${oracleCards.length} cards`);
console.log(`   First card: ${oracleCards[0].name}`);
console.log(`   Last card: ${oracleCards[oracleCards.length - 1].name}\n`);

// Test 2: Random card selection
const randomCard = getRandomCard(oracleCards);
console.log(`✅ Random card selected: ${randomCard.name}`);
console.log(`   Element: ${randomCard.element}, Theme: ${randomCard.theme}\n`);

// Test 3: Multiple cards selection
const threeCards = getMultipleCards(oracleCards, 3);
console.log(`✅ 3-Card spread:`);
threeCards.forEach((card, i) => {
  console.log(`   ${i + 1}. ${card.name}`);
});
console.log();

// Test 4: Celtic Cross (10 cards)
const celticCards = getMultipleCards(oracleCards, 10);
console.log(`✅ Celtic Cross spread:`);
celticCards.forEach((card, i) => {
  console.log(`   ${i + 1}. ${card.name}`);
});
console.log();

// Test 5: Message formatting
console.log(`✅ Formatted message:\n`);
const message = formatCardMessage(randomCard);
console.log(message);
console.log();

// Test 6: Verify all cards have required fields
let validCards = 0;
let errors = [];

oracleCards.forEach((card, index) => {
  const required = ['id', 'name', 'keywords', 'upright', 'element', 'theme'];
  const missing = required.filter(field => !card[field]);
  
  if (missing.length === 0) {
    validCards++;
  } else {
    errors.push(`Card ${index + 1} (${card.name || 'unnamed'}) missing: ${missing.join(', ')}`);
  }
});

console.log(`✅ Card validation: ${validCards}/${oracleCards.length} valid cards`);
if (errors.length > 0) {
  console.log(`❌ Errors found:`);
  errors.forEach(err => console.log(`   - ${err}`));
} else {
  console.log(`   All cards have required fields!`);
}

console.log('\n🎉 All tests complete!\n');
console.log('Next steps:');
console.log('1. Create bot via @BotFather on Telegram');
console.log('2. Copy bot token to .env file');
console.log('3. Enable Telegram Stars payments via @BotFather');
console.log('4. Run: npm start');
