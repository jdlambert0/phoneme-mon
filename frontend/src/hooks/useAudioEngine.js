/**
 * useAudioEngine - Bridge between AudioWorklet feature stream and React
 * Manages microphone permission, feature streaming, and calibration recording
 */
import { useRef, useState, useCallback, useEffect } from 'react';
import { AudioContextManager } from '../utils/AudioContextManager';
import { classifyPhoneme } from '../utils/dspMath';

const FEATURE_BUFFER_FRAMES = 15; // ~450ms of features for classification

export function useAudioEngine() {
  const [micState, setMicState] = useState('idle'); // idle | requesting | active | denied
  const [latestFeatures, setLatestFeatures] = useState(null);
  const featureBufferRef = useRef([]);
  const calibrationRef = useRef(null); // current player calibration data
  const isRecordingRef = useRef(false);
  const recordedSamplesRef = useRef([]); // MFCC samples during calibration recording

  const initMic = useCallback(async () => {
    setMicState('requesting');
    try {
      await AudioContextManager.getInstance().initMicrophone();
      setMicState('active');
      return true;
    } catch (e) {
      console.error('Mic error:', e);
      setMicState('denied');
      return false;
    }
  }, []);

  useEffect(() => {
    const mgr = AudioContextManager.getInstance();
    const unsubscribe = mgr.onFeatures((features) => {
      setLatestFeatures(features);
      // Maintain rolling feature buffer
      featureBufferRef.current.push(features);
      if (featureBufferRef.current.length > FEATURE_BUFFER_FRAMES) {
        featureBufferRef.current.shift();
      }
      // If calibration recording is active, collect MFCC samples
      if (isRecordingRef.current && features.rms > 0.02) {
        recordedSamplesRef.current.push(features.mfcc);
      }
    });
    return unsubscribe;
  }, []);

  /** Start recording calibration samples for current phoneme */
  const startCalibrationRecording = useCallback(() => {
    recordedSamplesRef.current = [];
    isRecordingRef.current = true;
  }, []);

  /** Stop recording and return collected MFCC samples */
  const stopCalibrationRecording = useCallback(() => {
    isRecordingRef.current = false;
    return [...recordedSamplesRef.current];
  }, []);

  /** Set current player's calibration fingerprint for live classification */
  const setCalibration = useCallback((calibration) => {
    calibrationRef.current = calibration;
  }, []);

  /**
   * Classify current audio against calibration.
   * Uses the feature buffer (last ~450ms) for robust detection.
   */
  const detectMove = useCallback(() => {
    const buffer = featureBufferRef.current;
    if (buffer.length < 5 || !calibrationRef.current) return null;

    // Use last N frames
    const recent = buffer.slice(-FEATURE_BUFFER_FRAMES);

    // Average features for stability
    const avgRms = recent.reduce((s, f) => s + f.rms, 0) / recent.length;
    const avgZcr = recent.reduce((s, f) => s + f.zcr, 0) / recent.length;
    const avgCentroid = recent.reduce((s, f) => s + f.spectralCentroid, 0) / recent.length;

    // Only classify if there's meaningful audio
    if (avgRms < 0.015) return null;

    // Use mid-buffer frame with highest RMS for MFCC classification
    const loudest = recent.reduce((best, f) => (f.rms > best.rms ? f : best), recent[0]);
    const result = classifyPhoneme(loudest, calibrationRef.current);

    return {
      ...result,
      avgRms,
      avgZcr,
      avgCentroid,
    };
  }, []);

  /** Get current feature snapshot */
  const getFeatures = useCallback(() => featureBufferRef.current[featureBufferRef.current.length - 1] || null, []);

  return {
    micState,
    latestFeatures,
    initMic,
    startCalibrationRecording,
    stopCalibrationRecording,
    setCalibration,
    detectMove,
    getFeatures,
  };
}
