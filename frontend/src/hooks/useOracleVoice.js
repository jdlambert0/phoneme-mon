/**
 * useOracleVoice — Wraps speech synthesis for oracle personality.
 * All calls are defensive — never throws.
 */
import { useCallback, useEffect, useRef } from 'react';
import { oracleSpeak, cancelSpeech, keepSpeechAlive } from '../utils/speechUtils';

export function useOracleVoice(personality = 'mentor', gender = 'female') {

  const queueRef = useRef([]);
  const speakingRef = useRef(false);

  const processQueue = useCallback(() => {
    if (speakingRef.current || queueRef.current.length === 0) return;
    speakingRef.current = true;
    const { text, onEnd } = queueRef.current.shift();
    oracleSpeak(text, personality, gender, () => {
      speakingRef.current = false;
      onEnd?.();
      processQueue();
    });
  }, [personality, gender]);

  const speak = useCallback((text, onEnd) => {
    if (!text) { onEnd?.(); return; }
    oracleSpeak(text, personality, gender, onEnd);
  }, [personality, gender]);

  const narrate = useCallback((text, onEnd) => {
    speak(text, onEnd);
  }, [speak]);

  const enqueue = useCallback((text, onEnd) => {
    queueRef.current.push({ text, onEnd });
    processQueue();
  }, [processQueue]);

  const cancel = useCallback(() => {
    queueRef.current = [];
    speakingRef.current = false;
    cancelSpeech();
  }, []);

  // iOS keep-alive: periodically poke speech synthesis
  useEffect(() => {
    const interval = setInterval(keepSpeechAlive, 10000);
    return () => clearInterval(interval);
  }, []);

  return { speak, narrate, enqueue, cancel };
}
