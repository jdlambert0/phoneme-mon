/**
 * Markov Chain Enemy AI
 * Learns player's phoneme patterns and counters them adaptively
 */

const PHONEMES = ['burst', 'flow', 'tone'];
const COUNTERS = { burst: 'tone', flow: 'burst', tone: 'flow' };
const ORDER = 2;

function randomPhoneme() {
  return PHONEMES[Math.floor(Math.random() * PHONEMES.length)];
}

/**
 * Build a Markov transition map from move history
 * @param {string[]} history
 * @param {number} order
 */
function buildTransitions(history, order) {
  const map = {};
  for (let i = order; i < history.length; i++) {
    const key = history.slice(i - order, i).join(',');
    const next = history[i];
    if (!map[key]) map[key] = { burst: 0, flow: 0, tone: 0, total: 0 };
    map[key][next]++;
    map[key].total++;
  }
  return map;
}

/**
 * Predict the player's NEXT move based on history
 * @param {string[]} history player move history
 * @returns {string} predicted move
 */
function predictNextMove(history) {
  if (history.length < ORDER) return randomPhoneme();
  const transitions = buildTransitions(history, ORDER);
  const key = history.slice(-ORDER).join(',');
  const dist = transitions[key];
  if (!dist || dist.total === 0) {
    // Fall back to order-1
    const key1 = history.slice(-1).join(',');
    const dist1 = buildTransitions(history, 1)[key1];
    if (!dist1 || dist1.total === 0) return randomPhoneme();
    return PHONEMES.reduce((best, p) => (dist1[p] > dist1[best] ? p : best), PHONEMES[0]);
  }
  return PHONEMES.reduce((best, p) => (dist[p] > dist[best] ? p : best), PHONEMES[0]);
}

/**
 * Get enemy move: counter the predicted player move
 * Difficulty 0 = random, 1 = perfect prediction
 * @param {string[]} playerHistory
 * @param {number} difficulty 0–1
 * @returns {string} enemy's chosen phoneme
 */
export function getEnemyMove(playerHistory, difficulty = 0.5) {
  const useMarkov = Math.random() < difficulty;
  if (!useMarkov || playerHistory.length < ORDER) return randomPhoneme();
  const predicted = predictNextMove(playerHistory);
  return COUNTERS[predicted] || randomPhoneme();
}

/**
 * Compute new difficulty based on round number and player articulation score
 * Poor articulation → reduce difficulty (be merciful)
 * @param {number} round
 * @param {number} articulationScore lower = better
 */
export function computeDifficulty(round, articulationScore) {
  // Base difficulty increases with rounds, capped at 0.9
  const base = Math.min(0.15 + round * 0.08, 0.9);
  // Reduce if player is struggling (high articulation score = poor clarity)
  const mercy = articulationScore > 0.6 ? 0.25 : 0;
  return Math.max(0.1, base - mercy);
}
