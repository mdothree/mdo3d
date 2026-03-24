/**
 * User state management
 * For MVP: in-memory storage
 * For production: upgrade to MongoDB/Firebase
 */

// Track daily card draws per user
const dailyDraws = new Map();

// User reading history
const readingHistory = new Map();

/**
 * Check if user can draw their daily card
 */
export function canDrawDailyCard(userId) {
  const today = new Date().toDateString();
  const userKey = `${userId}_${today}`;
  
  return !dailyDraws.has(userKey);
}

/**
 * Mark daily card as drawn
 */
export function markDailyCardDrawn(userId) {
  const today = new Date().toDateString();
  const userKey = `${userId}_${today}`;
  
  dailyDraws.set(userKey, {
    timestamp: Date.now(),
    date: today
  });
  
  // Cleanup old entries (older than 7 days)
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  for (const [key, value] of dailyDraws.entries()) {
    if (value.timestamp < sevenDaysAgo) {
      dailyDraws.delete(key);
    }
  }
}

/**
 * Add reading to user history
 */
export function addToHistory(userId, reading) {
  if (!readingHistory.has(userId)) {
    readingHistory.set(userId, []);
  }
  
  const history = readingHistory.get(userId);
  history.unshift({
    ...reading,
    timestamp: Date.now()
  });
  
  // Keep only last 10 readings per user
  if (history.length > 10) {
    history.pop();
  }
  
  readingHistory.set(userId, history);
}

/**
 * Get user reading history
 */
export function getHistory(userId, limit = 5) {
  const history = readingHistory.get(userId) || [];
  return history.slice(0, limit);
}

/**
 * Get user stats
 */
export function getUserStats(userId) {
  const history = readingHistory.get(userId) || [];
  const today = new Date().toDateString();
  const hasDrawnToday = dailyDraws.has(`${userId}_${today}`);
  
  return {
    totalReadings: history.length,
    hasDrawnToday,
    lastReading: history[0] || null
  };
}

/**
 * Clear user data
 */
export function clearUserData(userId) {
  // Clear daily draws
  for (const [key] of dailyDraws.entries()) {
    if (key.startsWith(`${userId}_`)) {
      dailyDraws.delete(key);
    }
  }
  
  // Clear history
  readingHistory.delete(userId);
}

export const userState = {
  canDrawDailyCard,
  markDailyCardDrawn,
  addToHistory,
  getHistory,
  getUserStats,
  clearUserData
};
