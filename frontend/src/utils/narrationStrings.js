/**
 * Oracle Narration Strings
 * Three personalities × two genders × all game events
 * Implements "Recency Effect" — avoids repeating recently used lines
 */

const recentlyUsed = [];
const RECENCY_WINDOW = 5;

function pick(arr) {
  if (!arr || arr.length === 0) return '';
  const available = arr.filter((s) => !recentlyUsed.includes(s));
  const pool = available.length > 0 ? available : arr;
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  recentlyUsed.push(chosen);
  if (recentlyUsed.length > RECENCY_WINDOW) recentlyUsed.shift();
  return chosen;
}

const STRINGS = {
  mentor: {
    install: [
      'Welcome, student. You have awakened the phonetic battlefield. Listen carefully.',
      'Your voice is the only weapon you will need here. Pay attention.',
      'The system awaits your resonance. I will teach you the three sacred forms.',
    ],
    rpsRules: [
      'Three forces govern this combat. Burst — the explosive consonant. Flow — the turbulent fricative. Tone — the sustained vowel. Burst defeats Flow. Flow defeats Tone. Tone defeats Burst.',
      'Learn this triangle: explosive force overcomes fluid motion. Fluid motion overcomes sustained resonance. Sustained resonance overcomes explosive force. This is the phonemic law.',
    ],
    calibrate_burst: [
      'Speak a sharp, explosive syllable. Like "BUH" or "TAH". Strong and brief. Begin when ready.',
      'Produce a burst consonant. Think of the sound at the start of "BOOM". Your breath should spike suddenly.',
    ],
    calibrate_flow: [
      'Now produce a fricative — a flowing, turbulent sound. Like "SHHH" or "FFFF". Sustain it.',
      'A long, hissing sound. Imagine wind through a crack. Hold it steady. This is Flow.',
    ],
    calibrate_tone: [
      'Finally, a pure sustained vowel. "AAAH" or "OOOH". Hold it as long as you can. This registers your Tone.',
      'Open your throat and sing a clear vowel. The system is mapping your resonant signature.',
    ],
    sample_good: [
      'Excellent articulation. The pattern is clear.',
      'Your signature has been recorded. Well done.',
      'Clear and distinct. The system recognizes you.',
    ],
    glass_dagger: [
      'Your articulation was unclear, but the glass dagger compensates. Your intent has been honored.',
      'The boundary was blurred — I have applied a glass dagger correction in your favor.',
      'Your form wavered, but the dagger finds the gap regardless.',
    ],
    win_round: [
      'Correct. Your phoneme overcame the enemy. Observe the advantage.',
      'Well executed. Your form was superior this exchange.',
      'Victory in this round. But do not become complacent.',
    ],
    lose_round: [
      'The enemy countered your move. Study why. Adapt.',
      'Your phoneme was defeated. The enemy predicted your pattern.',
      'A loss — but a lesson. What will you produce differently next time?',
    ],
    tie_round: [
      'Equal force. The round ends in stalemate. Recalibrate.',
      'A tie. Neither form dominates. You must commit more clearly.',
    ],
    win_game: [
      'You have mastered the phonemic field. Your voice is now a precision instrument.',
      'Victory achieved through disciplined articulation. The Oracle acknowledges you.',
    ],
    lose_game: [
      'The enemy has prevailed this time. Your voice holds potential — but needs refinement.',
      'Defeat, but not failure. Return to calibration. Sharpen your forms.',
    ],
    pass_device: [
      'Pass the device to your opponent. Their voice will now be mapped.',
      'Hand the device across. The second voice must be calibrated.',
    ],
    your_turn: [
      'Your turn, challenger. Speak your phoneme now.',
      'The listening window is open. Produce your move.',
    ],
  },

  rival: {
    install: [
      "Oh, you actually showed up. Let's see what your voice can DO.",
      "Touch to link. Simple enough even for you. Now — TRY to keep up.",
      "The battlefield is open. Your voice is your only weapon. Try not to waste it.",
    ],
    rpsRules: [
      'Here is how this works: BURST destroys FLOW. FLOW destroys TONE. TONE destroys BURST. Simple? Good. Because the enemy will NOT make it simple for you.',
      "Three moves. Rock, paper, scissors — but with your mouth. BURST. FLOW. TONE. Master all three, or you lose. That's it.",
    ],
    calibrate_burst: [
      'Give me a BURST. Sharp. Explosive. Like you mean it. DO IT.',
      "BAM. TAK. Something percussive. Come on, I haven't got all day.",
    ],
    calibrate_flow: [
      'Now FLOW. SSSS or SHHHH. Hissing like a snake. Sustain it.',
      'Fricative. Turbulent. FFFFFFF. Hold it until I say stop.',
    ],
    calibrate_tone: [
      "Pure vowel. AAAH. Like you're singing. Hold it steady or I won't count it.",
      'Tone. OOOH. EEEE. One clean note. Your voice better not wobble.',
    ],
    sample_good: [
      "Fine. That works. Don't get cocky.",
      'Acceptable. Barely. Moving on.',
      "Your signature is logged. Let's see if it means anything in battle.",
    ],
    glass_dagger: [
      "That was SLOPPY but I'll give it to you. Glass dagger activated.",
      "Your articulation was a mess. You got lucky — glass dagger saved you.",
      "I compensated because your form was weak. Don't let it happen again.",
    ],
    win_round: [
      'NICE. That actually worked. Keep it up.',
      "Point to you. You earned that one.",
      "One round. Don't celebrate yet — the enemy adapts.",
    ],
    lose_round: [
      "HA. The enemy read you like a book. CHANGE IT UP.",
      "Countered. Predictable. You're playing patterns — stop it.",
      "Loss. Your move was telegraphed from a mile away.",
    ],
    tie_round: [
      "TIE. Both of you were obvious. Try harder.",
      "Neither wins. A wasted exchange. Be bolder.",
    ],
    win_game: [
      "YOU WIN. Against all my expectations, your voice held up. Respect.",
      "Victory. Honestly impressive. Your articulation evolved through the fight.",
    ],
    lose_game: [
      "Game over. The enemy dominated you. Hit replay and actually TRY this time.",
      "You lost. The enemy learned your patterns faster than you adapted. Fix that.",
    ],
    pass_device: [
      "PASS THE DEVICE. Other player — your calibration is next.",
      "Hand it over. Second competitor — the system is waiting for your voice.",
    ],
    your_turn: [
      "YOUR TURN. Speak NOW.",
      "Move. The window is open. What are you waiting for?",
    ],
  },

  ancient: {
    install: [
      '...The void stirs. A voice has touched the threshold.',
      '...Aeons ago, the phonemic war began. It has not ended.',
      '...Listen. Your voice echoes across the spectral field.',
    ],
    rpsRules: [
      '...Three ancient forces. The Burst — like thunder. The Flow — like river over stone. The Tone — like the hum of the earth itself. Each devours one of its siblings. Each is devoured by another.',
      '...From chaos, three forms emerged. Explosive... Turbulent... Resonant... They circle each other in eternal combat. You will participate.',
    ],
    calibrate_burst: [
      '...Speak the sound of impact. A consonant born of pressure and release.',
      '...The burst. When lips or tongue seal and suddenly part. Produce it now.',
    ],
    calibrate_flow: [
      '...The flow... a long turbulent breath... sustained through narrow passages...',
      '...Hiss as the serpent hisses. Hold the friction sound until I say enough.',
    ],
    calibrate_tone: [
      '...And now... the vowel... pure and resonant... the voice of the ancient stone...',
      '...Open yourself to the tone... sustain it... let it ring through the chamber...',
    ],
    sample_good: [
      '...The pattern is encoded.',
      '...Your resonance has been recorded in the system.',
      '...The field recognizes your form.',
    ],
    glass_dagger: [
      '...Your articulation faded... but the glass dagger found the wound regardless...',
      '...Unclear form... compensated... the ancient law permits one act of mercy...',
      '...The glass dagger does not judge intention. It judges pressure.',
    ],
    win_round: [
      '...The enemy falls back. The force was sufficient.',
      '...Your phoneme overcame theirs. The balance shifts.',
      '...Victory in this exchange. The tide turns... momentarily.',
    ],
    lose_round: [
      '...The enemy predicted you. Their counter was precise.',
      '...Your form was devoured. Adjust. The field is watching.',
      '...Defeat. But all defeats are instructions, if you listen.',
    ],
    tie_round: [
      '...Equal resonance. Neither force dominates. Continue.',
      '...Stalemate. The field holds its breath.',
    ],
    win_game: [
      '...You have prevailed in the phonemic war... for now... it will begin again...',
      '...Your voice has proven itself a precision instrument... the Oracle acknowledges...',
    ],
    lose_game: [
      '...The enemy has silenced you... this time... return when your voice is sharper...',
      '...Defeated. The field returns to stillness. Your calibration awaits you again.',
    ],
    pass_device: [
      '...The first voice has spoken... pass the vessel to the second challenger...',
      '...The other presence must be mapped... offer them the device...',
    ],
    your_turn: [
      '...Speak now...',
      '...The listening window opens...',
    ],
  },
};

/**
 * Get a narration string for the given event and personality
 * @param {string} event - key from STRINGS[personality]
 * @param {string} personality - 'mentor'|'rival'|'ancient'
 */
export function getNarration(event, personality = 'mentor') {
  const p = STRINGS[personality] || STRINGS.mentor;
  const arr = p[event] || p.install;
  return pick(arr);
}

export function getAllNarrations(event, personality = 'mentor') {
  const p = STRINGS[personality] || STRINGS.mentor;
  return p[event] || [];
}
