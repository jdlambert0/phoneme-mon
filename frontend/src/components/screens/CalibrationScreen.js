import React, { useEffect, useState, useRef, useCallback } from 'react';
import { VoiceInputViz } from '../ui/VoiceInputViz';

const STEPS = [
  { key: 'p1_burst', label: 'BURST', instruction: 'Produce a sharp explosive sound — "BUH" or "BAH"', color: '#FF2A6D', player: 1 },
  { key: 'p1_flow',  label: 'FLOW',  instruction: 'Produce a sustained hissing sound — "SHHH" or "FFFF"', color: '#05D9E8', player: 1 },
  { key: 'p1_tone',  label: 'TONE',  instruction: 'Produce a pure open vowel — "AAAH" or "OOOH"', color: '#D1F7FF', player: 1 },
  { key: 'p2_burst', label: 'BURST', instruction: 'Player 2: produce a sharp explosive sound', color: '#FF2A6D', player: 2 },
  { key: 'p2_flow',  label: 'FLOW',  instruction: 'Player 2: produce a sustained hissing sound', color: '#05D9E8', player: 2 },
  { key: 'p2_tone',  label: 'TONE',  instruction: 'Player 2: produce a pure open vowel', color: '#D1F7FF', player: 2 },
];

const RECORD_DURATION = 3000; // ms
const COUNTDOWN_MS = 1000;

export default function CalibrationScreen({
  calibrationStep = 0,
  gameMode = 'solo',
  latestFeatures,
  onAddSample,
  onNextPhase,
  oracle,
}) {
  const [phase, setPhase] = useState('waiting'); // waiting | countdown | recording | done
  const [countdown, setCountdown] = useState(3);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);
  const startedRef = useRef(false);

  const maxStep = gameMode === 'passplay' ? 6 : 3;
  const step = STEPS[Math.min(calibrationStep, STEPS.length - 1)];

  const startRecording = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    setPhase('countdown');
    let c = 3;
    setCountdown(c);
    oracle?.startCalibrationRecording?.();

    const cdInterval = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(cdInterval);
        setPhase('recording');
        const startTime = Date.now();
        const progInterval = setInterval(() => {
          const elapsed = Date.now() - startTime;
          setProgress(Math.min(100, (elapsed / RECORD_DURATION) * 100));
          if (elapsed >= RECORD_DURATION) {
            clearInterval(progInterval);
            const samples = oracle?.stopCalibrationRecording?.() || [];
            // Add samples in bulk
            samples.forEach((mfcc) => onAddSample(mfcc));
            setPhase('done');
            setTimeout(() => {
              startedRef.current = false;
              setPhase('waiting');
              setProgress(0);
              onNextPhase();
            }, 800);
          }
        }, 50);
      }
    }, COUNTDOWN_MS);
  }, [oracle, onAddSample, onNextPhase]);

  // Auto-start after brief delay when step changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    startedRef.current = false;
    setPhase('waiting');
    setProgress(0);
    const t = setTimeout(startRecording, 1200);
    return () => clearTimeout(t);
  }, [calibrationStep]);

  const isPassDevicePrompt = gameMode === 'passplay' && calibrationStep === 3 && phase === 'waiting';

  if (calibrationStep >= maxStep) return null;

  return (
    <div
      data-testid="calibration-screen"
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(3,3,5,0.92)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 32,
      }}
    >
      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 48 }}>
        {Array.from({ length: maxStep }).map((_, i) => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: '50%',
            background: i < calibrationStep ? 'rgba(255,255,255,0.6)' : i === calibrationStep ? step.color : 'rgba(255,255,255,0.15)',
            transition: 'background 0.3s ease',
            boxShadow: i === calibrationStep ? `0 0 8px ${step.color}` : 'none',
          }} />
        ))}
      </div>

      {/* Player label */}
      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 9, letterSpacing: 5, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 16 }}>
        {gameMode === 'passplay' ? `PLAYER ${step.player} · CALIBRATION` : 'CALIBRATION'}
      </div>

      {/* Phoneme label */}
      <div style={{
        fontFamily: 'Cinzel, serif', fontSize: 'clamp(32px, 8vw, 56px)',
        color: step.color, letterSpacing: '0.2em',
        textShadow: `0 0 40px ${step.color}`,
        marginBottom: 20,
      }}>
        {step.label}
      </div>

      {/* Instruction */}
      <div style={{
        fontFamily: 'Manrope, sans-serif', fontSize: 13,
        color: 'rgba(255,255,255,0.5)', textAlign: 'center',
        maxWidth: 320, lineHeight: 1.7, marginBottom: 40,
      }}>
        {step.instruction}
      </div>

      {/* Countdown or Progress bar */}
      {phase === 'countdown' && (
        <div style={{
          fontFamily: 'Cinzel, serif', fontSize: 48,
          color: 'rgba(255,255,255,0.6)',
        }}>
          {countdown}
        </div>
      )}

      {phase === 'recording' && (
        <div style={{ width: 240, height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
          <div style={{
            width: `${progress}%`, height: '100%',
            background: step.color,
            boxShadow: `0 0 8px ${step.color}`,
            transition: 'width 0.05s linear',
          }} />
        </div>
      )}

      {phase === 'done' && (
        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 11, letterSpacing: 4, color: '#00FF94', textTransform: 'uppercase' }}>
          RECORDED
        </div>
      )}

      {/* Pass device prompt */}
      {isPassDevicePrompt && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.9)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 24,
        }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 22, color: '#05D9E8', letterSpacing: 4, textAlign: 'center' }}>
            PASS THE DEVICE
          </div>
          <div style={{ fontFamily: 'Manrope', fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', maxWidth: 280 }}>
            Player 2, prepare to calibrate your voice
          </div>
        </div>
      )}

      {/* Voice viz */}
      <VoiceInputViz features={latestFeatures} isListening={phase === 'recording'} />
    </div>
  );
}
