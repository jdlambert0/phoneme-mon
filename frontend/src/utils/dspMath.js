// DSP Math utilities

export const GOLDEN_RATIO = 1.6180339887498948482;

/** Euclidean distance between two numeric arrays */
export function euclideanDistance(a, b) {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

/** Average an array of MFCC vectors */
export function averageMFCC(samples) {
  if (!samples || samples.length === 0) return new Array(13).fill(0);
  const len = samples[0].length;
  const avg = new Array(len).fill(0);
  samples.forEach((s) => s.forEach((v, i) => (avg[i] += v)));
  return avg.map((v) => v / samples.length);
}

/**
 * Classify a phoneme from live features vs calibration fingerprint.
 * Returns { phoneme: 'burst'|'flow'|'tone'|null, articulationScore, distances }
 */
export function classifyPhoneme(features, calibration) {
  if (!calibration || !features?.mfcc) return { phoneme: null, articulationScore: 1 };
  const distances = {};
  for (const p of ['burst', 'flow', 'tone']) {
    if (calibration[p]) {
      distances[p] = euclideanDistance(features.mfcc, calibration[p]);
    }
  }
  const keys = Object.keys(distances);
  if (keys.length === 0) return { phoneme: null, articulationScore: 1 };

  // Find closest
  let best = keys[0];
  keys.forEach((k) => { if (distances[k] < distances[best]) best = k; });

  // Articulation score: how distinct is the best match from second best?
  const sorted = keys.map((k) => distances[k]).sort((a, b) => a - b);
  const articulationScore = sorted.length > 1 ? sorted[0] / (sorted[1] + 1e-6) : sorted[0];

  return { phoneme: best, articulationScore, distances };
}

/**
 * Resolve RPS combat.
 * Burst > Flow | Flow > Tone | Tone > Burst
 * Returns: 'p1' | 'p2' | 'tie'
 */
export function resolveRPS(move1, move2) {
  if (move1 === move2) return 'tie';
  const beats = { burst: 'flow', flow: 'tone', tone: 'burst' };
  return beats[move1] === move2 ? 'p1' : 'p2';
}

/** Glass Dagger: compensate when articulation score is high (poor clarity) */
export function detectGlassDagger(articulationScore) {
  return articulationScore > 0.7; // high score = close match = poor distinction
}

/** Assign player title based on dominant phoneme and calibration scores */
export function assignPlayerTitle(dominantPhoneme) {
  const titles = {
    burst: ['The Striker', 'The Thunderer', 'The Percussionist'],
    flow:  ['The Weaver',  'The Serpent',    'The Whisperer'],
    tone:  ['The Sage',    'The Resonant',   'The Harmonist'],
  };
  const pool = titles[dominantPhoneme] || titles.tone;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Get dominant phoneme from calibration distances averages */
export function getDominantPhoneme(calibSamples) {
  const variances = {};
  for (const p of ['burst', 'flow', 'tone']) {
    const samples = calibSamples[p] || [];
    if (samples.length < 2) { variances[p] = 999; continue; }
    const avg = averageMFCC(samples);
    const variance = samples.reduce((acc, s) => acc + euclideanDistance(s, avg), 0) / samples.length;
    variances[p] = variance;
  }
  return Object.entries(variances).sort((a, b) => a[1] - b[1])[0][0];
}

/** 12 icosahedron vertices normalized, projected to 2D */
export function icosahedronVertices2D(cx, cy, radius, rotY = 0, rotX = 0) {
  const t = GOLDEN_RATIO;
  const len = Math.sqrt(1 + t * t);
  const raw = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ];
  return raw.map(([x, y, z]) => {
    let nx = x / len, ny = y / len, nz = z / len;
    // Rotate Y
    const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
    const rx = nx * cosY + nz * sinY;
    nz = -nx * sinY + nz * cosY;
    nx = rx;
    // Rotate X
    const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
    const ry = ny * cosX - nz * sinX;
    nz = ny * sinX + nz * cosX;
    ny = ry;
    // Perspective project
    const scale = 1.8 / (3 - nz);
    return { x: cx + nx * radius * scale, y: cy + ny * radius * scale, z: nz };
  });
}
