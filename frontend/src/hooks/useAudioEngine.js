/**
 * useAudioEngine - Bridge between AudioWorklet feature stream and React
 * 
 * CRITICAL: Features arrive at ~43Hz from the AudioWorklet.
 * We store them in a ref and only update React state at ~12Hz
 * to prevent a 43x/sec re-render cascade through the component tree.
 */
import { useRef, useState, useCallback, useEffect } from 'react';
import { AudioContextManager } from '../utils/AudioContextManager';
import { classifyPhoneme } from '../utils/dspMath';

const FEATURE_BUFFER_FRAMES = 15;
const STATE_UPDATE_INTERVAL = 80; // ~12Hz throttle for React state

export function useAudioEngine() {
  const [micState, setMicState] = useState('idle');
  const [latestFeatures, setLatestFeatures] = useState(null);

  const featuresRef = useRef(null);
  const featureBufferRef = useRef([]);
  const calibrationRef = useRef(null);
  const isRecordingRef = useRef(false);
  const recordedSamplesRef = useRef([]);
  const throttleTimerRef = useRef(null);

  const initMic = useCallback(async () => {
    setMicState('requesting');
    try {
      await AudioContextManager.getInstance().initMicrophone();
      setMicState('active');
      return true;
    } catch (e) {
      console.error('Mic init error:', e);
      setMicState('denied');
      return false;
    }
  }, []);

  useEffect(() => {
    const mgr = AudioContextManager.getInstance();
    const unsubscribe = mgr.onFeatures((features) => {
      if (!features) return;

      // Always update the ref (instant, no re-render)
      featuresRef.current = features;

      // Maintain rolling buffer
      featureBufferRef.current.push(features);
      if (featureBufferRef.current.length > FEATURE_BUFFER_FRAMES) {
        featureBufferRef.current.shift();
      }

      // Collect calibration samples
      if (isRecordingRef.current && features.rms > 0.02 && features.mfcc) {
        recordedSamplesRef.current.push(features.mfcc);
      }

      // Throttled state update for React components
      if (!throttleTimerRef.current) {
        throttleTimerRef.current = setTimeout(() => {
          throttleTimerRef.current = null;
          setLatestFeatures(featuresRef.current);
        }, STATE_UPDATE_INTERVAL);
      }
    });

    return () => {
      unsubscribe();
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
    };
  }, []);

  const startCalibrationRecording = useCallback(() => {
    recordedSamplesRef.current = [];
    isRecordingRef.current = true;
  }, []);

  const stopCalibrationRecording = useCallback(() => {
    isRecordingRef.current = false;
    return [...recordedSamplesRef.current];
  }, []);

  const setCalibration = useCallback((calibration) => {
    calibrationRef.current = calibration;
  }, []);

  const detectMove = useCallback(() => {
    const buffer = featureBufferRef.current;
    if (buffer.length < 5 || !calibrationRef.current) return null;

    const recent = buffer.slice(-FEATURE_BUFFER_FRAMES);
    const avgRms = recent.reduce((s, f) => s + (f.rms || 0), 0) / recent.length;

    if (avgRms < 0.015 || isNaN(avgRms)) return null;

    const loudest = recent.reduce((best, f) => ((f.rms || 0) > (best.rms || 0) ? f : best), recent[0]);
    if (!loudest?.mfcc) return null;

    // Pass the full features object — classifyPhoneme expects { mfcc: [...] }
    const result = classifyPhoneme(loudest, calibrationRef.current);

    return {
      ...result,
      avgRms,
      avgZcr: recent.reduce((s, f) => s + (f.zcr || 0), 0) / recent.length,
      avgCentroid: recent.reduce((s, f) => s + (f.spectralCentroid || 0), 0) / recent.length,
    };
  }, []);

  return {
    micState,
    latestFeatures,
    featuresRef,
    initMic,
    startCalibrationRecording,
    stopCalibrationRecording,
    setCalibration,
    detectMove,
  };
}
