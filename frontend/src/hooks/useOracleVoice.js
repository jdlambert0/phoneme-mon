/**
 * useOracleVoice - Oracle speech synthesis hook
 * Manages voice queue and personality
 */
import { useRef, useCallback, useEffect } from 'react';
import { oracleSpeak, cancelSpeech, ensureVoicesLoaded, keepSpeechAlive } from '../utils/speechUtils';
import { getNarration } from '../utils/narrationStrings';

export function useOracleVoice(personality = 'mentor', gender = 'female') {
  const queueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const aliveIntervalRef = useRef(null);

  useEffect(() => {
    ensureVoicesLoaded();
    // iOS fix: keep speech alive every 10s
    aliveIntervalRef.current = setInterval(keepSpeechAlive, 10000);
    return () => {
      clearInterval(aliveIntervalRef.current);
      cancelSpeech();
    };
  }, []);

  const playNext = useCallback(() => {
    if (queueRef.current.length === 0) { isPlayingRef.current = false; return; }
    isPlayingRef.current = true;
    const { text, onEnd } = queueRef.current.shift();
    oracleSpeak(text, personality, gender, () => {
      onEnd?.();
      playNext();
    });
  }, [personality, gender]);

  /** Speak a text string immediately (clears queue) */
  const speak = useCallback((text, onEnd) => {
    cancelSpeech();
    queueRef.current = [{ text, onEnd }];
    isPlayingRef.current = false;
    playNext();
  }, [playNext]);

  /** Queue a narration event by key */
  const narrate = useCallback((eventKey, onEnd) => {
    const text = getNarration(eventKey, personality);
    speak(text, onEnd);
  }, [personality, speak]);

  /** Add to queue without clearing */
  const enqueue = useCallback((text, onEnd) => {
    queueRef.current.push({ text, onEnd });
    if (!isPlayingRef.current) playNext();
  }, [playNext]);

  const cancel = useCallback(() => {
    queueRef.current = [];
    isPlayingRef.current = false;
    cancelSpeech();
  }, []);

  return { speak, narrate, enqueue, cancel };
}
