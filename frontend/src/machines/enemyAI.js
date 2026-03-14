/**
 * Markov Chain Enemy AI with Personality Variations
 * Learns player's phoneme patterns and counters them adaptively.
 * Three AI behaviors map to Oracle personalities:
 *   - mentor:  Balanced (standard Markov + mercy)
 *   - rival:   Aggressive (higher difficulty, no mercy, counter-heavy)
 *   - ancient:  Patient (slow start, steep ramp, deeper pattern memory)
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
 * @param {number} order Markov chain order to use
 * @returns {string} predicted move
 */
function predictNextMove(history, order = ORDER) {
  if (history.length < order) return randomPhoneme();
  const transitions = buildTransitions(history, order);
  const key = history.slice(-order).join(',');
  const dist = transitions[key];
  if (!dist || dist.total === 0) {
    // Fall back to order-1
    if (order > 1) return predictNextMove(history, order - 1);
    return randomPhoneme();
  }
  return PHONEMES.reduce((best, p) => (dist[p] > dist[best] ? p : best), PHONEMES[0]);
}

// ── AI Personality Configs ─────────────────────────────────────────────────

const AI_CONFIGS = {
  /**
   * Mentor (Balanced): Standard Markov + mercy system.
   * Friendly difficulty curve, forgives poor articulation.
   */
  mentor: {
    baseDifficulty: 0.15,
    difficultyPerRound: 0.08,
    maxDifficulty: 0.9,
    mercyThreshold: 0.6,    // articulation above this triggers mercy
    mercyReduction: 0.25,
    markovOrder: 2,
    counterBias: 0,         // 0 = always counter predicted; no alternative strategy
    streakBonus: 0,
  },

  /**
   * Rival (Aggressive): High difficulty, no mercy, punishes patterns hard.
   * Occasionally "reads" the player extra-aggressively by using counter-of-counter
   * when it detects a streak.
   */
  rival: {
    baseDifficulty: 0.35,
    difficultyPerRound: 0.07,
    maxDifficulty: 0.95,
    mercyThreshold: Infinity, // No mercy
    mercyReduction: 0,
    markovOrder: 2,
    counterBias: 0.15,       // 15% chance to double-counter (predict counter-switch)
    streakBonus: 0.1,        // +10% difficulty when player repeats moves
  },

  /**
   * Ancient (Patient): Slow start, steep late-game ramp, deeper pattern memory.
   * Uses order-3 Markov when history is sufficient. Feels "wise" — easy early,
   * devastating late.
   */
  ancient: {
    baseDifficulty: 0.08,
    difficultyPerRound: 0.12,
    maxDifficulty: 0.92,
    mercyThreshold: 0.7,
    mercyReduction: 0.15,
    markovOrder: 3,           // Deeper pattern recognition
    counterBias: 0,
    streakBonus: 0.05,
  },
};

/**
 * Detect if the player is in a streak (repeating the same move)
 * @param {string[]} history
 * @returns {number} streak length (0 = no streak)
 */
function detectStreak(history) {
  if (history.length < 2) return 0;
  const last = history[history.length - 1];
  let count = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i] === last) count++;
    else break;
  }
  return count >= 2 ? count : 0;
}

/**
 * Get enemy move: counter the predicted player move with personality influence
 * @param {string[]} playerHistory
 * @param {number} difficulty 0–1
 * @param {string} aiPersonality 'mentor'|'rival'|'ancient'
 * @returns {string} enemy's chosen phoneme
 */
export function getEnemyMove(playerHistory, difficulty = 0.5, aiPersonality = 'mentor') {
  const config = AI_CONFIGS[aiPersonality] || AI_CONFIGS.mentor;

  // Adjust difficulty for streaks
  let effectiveDifficulty = difficulty;
  const streak = detectStreak(playerHistory);
  if (streak > 0) {
    effectiveDifficulty = Math.min(1, effectiveDifficulty + config.streakBonus * streak);
  }

  const useMarkov = Math.random() < effectiveDifficulty;
  if (!useMarkov || playerHistory.length < config.markovOrder) return randomPhoneme();

  const predicted = predictNextMove(playerHistory, config.markovOrder);
  const counter = COUNTERS[predicted] || randomPhoneme();

  // Rival's counterBias: sometimes predict the player will SWITCH to counter their own pattern
  if (config.counterBias > 0 && Math.random() < config.counterBias) {
    // Predict: player noticed AI countering, so player switches to beat our counter
    // Player would play COUNTERS[counter], so we counter THAT
    const playerAdaptation = COUNTERS[counter];
    return COUNTERS[playerAdaptation] || counter;
  }

  return counter;
}

/**
 * Compute new difficulty based on round number, articulation score, and AI personality
 * @param {number} round
 * @param {number} articulationScore lower = better
 * @param {string} aiPersonality 'mentor'|'rival'|'ancient'
 */
export function computeDifficulty(round, articulationScore, aiPersonality = 'mentor') {
  const config = AI_CONFIGS[aiPersonality] || AI_CONFIGS.mentor;

  // Base difficulty increases with rounds
  const base = Math.min(config.baseDifficulty + round * config.difficultyPerRound, config.maxDifficulty);

  // Reduce if player is struggling (mercy system)
  const mercy = articulationScore > config.mercyThreshold ? config.mercyReduction : 0;

  return Math.max(0.1, base - mercy);
}

/**
 * Get AI personality display info
 */
export function getAIPersonalityInfo(personality) {
  const info = {
    mentor: { name: 'Balanced', style: 'Adaptive difficulty, forgiving' },
    rival:  { name: 'Aggressive', style: 'High pressure, reads patterns' },
    ancient: { name: 'Patient', style: 'Slow start, devastating endgame' },
  };
  return info[personality] || info.mentor;
}
