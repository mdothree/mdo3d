/**
 * User session and state management
 */

// In-memory user sessions (for MVP - use database for production)
export const userSessions = new Map();

// Track daily card draws
const dailyDraws = new Map();

/**
 * Track if user can draw their daily card
 * Returns true if user can draw, false if already drawn today
 */
export function trackDailyCard(userId) {
  const today = new Date().toDateString();
  const userKey = `${userId}_${today}`;
  
  if (dailyDraws.has(userKey)) {
    return false; // Already drawn today
  }
  
  // Mark as drawn
  dailyDraws.set(userKey, Date.now());
  
  // Clean up old entries (older than 2 days)
  const twoDaysAgo = Date.now() - (2 * 24 * 60 * 60 * 1000);
  for (const [key, timestamp] of dailyDraws.entries()) {
    if (timestamp < twoDaysAgo) {
      dailyDraws.delete(key);
    }
  }
  
  return true;
}

/**
 * Get or create user session
 */
export function getUserSession(userId) {
  if (!userSessions.has(userId)) {
    userSessions.set(userId, {
      userId,
      createdAt: Date.now(),
      lastActive: Date.now(),
      totalReadings: 0,
      paidReadings: 0
    });
  }
  
  const session = userSessions.get(userId);
  session.lastActive = Date.now();
  
  return session;
}

/**
 * Increment user reading count
 */
export function incrementReadingCount(userId, isPaid = false) {
  const session = getUserSession(userId);
  session.totalReadings++;
  if (isPaid) {
    session.paidReadings++;
  }
  userSessions.set(userId, session);
}

/**
 * Get user stats
 */
export function getUserStats(userId) {
  return getUserSession(userId);
}

/**
 * Clear user session
 */
export function clearUserSession(userId) {
  userSessions.delete(userId);
}
