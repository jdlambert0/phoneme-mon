/**
 * Speech Synthesis Utilities
 * All calls wrapped in try-catch for device compatibility.
 * Many Android/iOS devices throw on various speech synthesis calls.
 */

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

const VOICE_PARAMS = {
  mentor_female:  { pitch: 1.15, rate: 0.88, volume: 0.95 },
  mentor_male:    { pitch: 0.85, rate: 0.85, volume: 0.95 },
  rival_female:   { pitch: 1.25, rate: 1.12, volume: 1.0  },
  rival_male:     { pitch: 0.9,  rate: 1.08, volume: 1.0  },
  ancient_female: { pitch: 0.95, rate: 0.7,  volume: 0.88 },
  ancient_male:   { pitch: 0.65, rate: 0.68, volume: 0.88 },
};

function getVoices() {
  try { return window.speechSynthesis?.getVoices() || []; }
  catch { return []; }
}

function scoreVoice(voice, hints) {
  try {
    for (let i = 0; i < hints.length; i++) {
      if (voice.name.toLowerCase().includes(hints[i].toLowerCase())) return hints.length - i;
    }
  } catch {}
  return 0;
}

function selectVoice(gender) {
  const voices = getVoices().filter(v => {
    try { return v.lang.startsWith('en'); } catch { return false; }
  });
  if (voices.length === 0) return null;
  const hints = gender === 'female' ? FEMALE_HINTS : MALE_HINTS;
  const scored = voices.map(v => ({ v, s: scoreVoice(v, hints) }));
  scored.sort((a, b) => b.s - a.s);
  return scored[0]?.v || null;
}

let _voicesLoaded = false;
export function ensureVoicesLoaded() {
  return new Promise((resolve) => {
    try {
      if (_voicesLoaded || getVoices().length > 0) { _voicesLoaded = true; resolve(); return; }
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = () => { _voicesLoaded = true; resolve(); };
      }
    } catch {}
    setTimeout(resolve, 2000);
  });
}

/**
 * Speak text with Oracle personality voice.
 * Fully defensive — never throws.
 */
export function oracleSpeak(text, personality = 'mentor', gender = 'female', onEnd) {
  try {
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

    // Ensure onEnd fires even if speech fails
    let endFired = false;
    const fireEnd = () => {
      if (endFired) return;
      endFired = true;
      onEnd?.();
    };

    utterance.onend = fireEnd;
    utterance.onerror = fireEnd;

    window.speechSynthesis.speak(utterance);

    // Safety timeout: if speech never ends, fire callback after text length * rate
    const estimatedDuration = Math.max(3000, text.length * 60 / (params.rate || 1));
    setTimeout(fireEnd, estimatedDuration);
  } catch (e) {
    console.warn('Speech synthesis error:', e);
    onEnd?.();
  }
}

export function cancelSpeech() {
  try { window.speechSynthesis?.cancel(); } catch {}
}

export function isSpeaking() {
  try { return window.speechSynthesis?.speaking ?? false; } catch { return false; }
}

export function keepSpeechAlive() {
  try { if (window.speechSynthesis?.paused) window.speechSynthesis.resume(); } catch {}
}
