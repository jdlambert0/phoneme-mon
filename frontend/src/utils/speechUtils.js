/**
 * Speech Synthesis Utilities
 * Provides personality + gender voice selection with pitch/rate/volume tuning
 */

// Preferred voice name fragments by platform, prioritized
const FEMALE_HINTS = [
  'Samantha', 'Victoria', 'Ava', 'Allison', 'Susan', 'Zira', 'Cortana',
  'Google US English', 'en-US-Standard-C', 'female', 'Female',
  'Karen', 'Moira', 'Fiona', 'Veena', 'Siri',
];
const MALE_HINTS = [
  'Alex', 'Daniel', 'Tom', 'David', 'Fred',
  'Google UK English Male', 'en-US-Standard-B', 'male', 'Male',
  'Arthur', 'Albert',
];

// Personality voice parameters
const VOICE_PARAMS = {
  mentor_female:  { pitch: 1.15, rate: 0.88, volume: 0.95 },
  mentor_male:    { pitch: 0.85, rate: 0.85, volume: 0.95 },
  rival_female:   { pitch: 1.25, rate: 1.12, volume: 1.0  },
  rival_male:     { pitch: 0.9,  rate: 1.08, volume: 1.0  },
  ancient_female: { pitch: 0.95, rate: 0.7,  volume: 0.88 },
  ancient_male:   { pitch: 0.65, rate: 0.68, volume: 0.88 },
};

function getVoices() {
  return window.speechSynthesis?.getVoices() || [];
}

function scoreVoice(voice, hints) {
  for (let i = 0; i < hints.length; i++) {
    if (voice.name.toLowerCase().includes(hints[i].toLowerCase())) return hints.length - i;
  }
  return 0;
}

function selectVoice(gender) {
  const voices = getVoices().filter((v) => v.lang.startsWith('en'));
  if (voices.length === 0) return null;
  const hints = gender === 'female' ? FEMALE_HINTS : MALE_HINTS;
  const scored = voices.map((v) => ({ v, s: scoreVoice(v, hints) }));
  scored.sort((a, b) => b.s - a.s);
  return scored[0].v;
}

let _voicesLoaded = false;
export function ensureVoicesLoaded() {
  return new Promise((resolve) => {
    if (_voicesLoaded || getVoices().length > 0) { _voicesLoaded = true; resolve(); return; }
    window.speechSynthesis.onvoiceschanged = () => { _voicesLoaded = true; resolve(); };
    // Timeout fallback
    setTimeout(resolve, 2000);
  });
}

let _currentUtterance = null;

/**
 * Speak text with Oracle personality voice
 * @param {string} text
 * @param {string} personality 'mentor'|'rival'|'ancient'
 * @param {string} gender 'female'|'male'
 * @param {Function} onEnd optional callback
 */
export function oracleSpeak(text, personality = 'mentor', gender = 'female', onEnd) {
  if (!window.speechSynthesis) { onEnd?.(); return; }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const params = VOICE_PARAMS[`${personality}_${gender}`] || VOICE_PARAMS.mentor_female;
  utterance.pitch = params.pitch;
  utterance.rate = params.rate;
  utterance.volume = params.volume;
  const voice = selectVoice(gender);
  if (voice) utterance.voice = voice;
  utterance.lang = 'en-US';
  if (onEnd) utterance.onend = onEnd;
  _currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

export function cancelSpeech() {
  window.speechSynthesis?.cancel();
  _currentUtterance = null;
}

export function isSpeaking() {
  return window.speechSynthesis?.speaking ?? false;
}

/** iOS fix: speechSynthesis pauses after ~15s; resume it */
export function keepSpeechAlive() {
  if (window.speechSynthesis?.paused) window.speechSynthesis.resume();
}
