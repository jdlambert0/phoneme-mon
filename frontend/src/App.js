/**
 * Phoneme-Mon — Main Application
 * Orchestrates XState machine, AudioEngine, Oracle voice, and screen routing
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useMachine } from '@xstate/react';
import '@/App.css';

import { gameMachine } from './machines/gameMachine';
import { AudioContextManager } from './utils/AudioContextManager';
import { useAudioEngine } from './hooks/useAudioEngine';
import { useOracleVoice } from './hooks/useOracleVoice';
import { getNarration } from './utils/narrationStrings';
import { ensureVoicesLoaded } from './utils/speechUtils';

import BootScreen from './components/screens/BootScreen';
import DiegeticInstall from './components/screens/DiegeticInstall';
import CalibrationScreen from './components/screens/CalibrationScreen';
import EndGameScreen from './components/screens/EndGameScreen';
import { CymaticsCanvas } from './components/game/CymaticsCanvas';
import { BattleHUD } from './components/game/BattleHUD';
import { OracleDisplay } from './components/ui/OracleDisplay';
import { VoiceInputViz } from './components/ui/VoiceInputViz';

const LISTEN_WINDOW_MS = 3500; // time player has to speak each turn

export default function App() {
  const [state, send] = useMachine(gameMachine);
  const ctx = state.context;
  const stateName = state.value;

  const [oracleText, setOracleText] = useState('');
  const [activePhoneme, setActivePhoneme] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [detectedMove, setDetectedMove] = useState(null);
  const [micError, setMicError] = useState(false);

  const listenTimerRef = useRef(null);
  const detectIntervalRef = useRef(null);
  const hasNarratedRef = useRef({});

  const audioEngine = useAudioEngine();
  const oracle = useOracleVoice(ctx.oraclePersonality, ctx.oracleGender);

  // ── ORACLE SPEAK WRAPPER ──────────────────────────────────────────────────
  const oracleSay = useCallback((text, onEnd) => {
    setOracleText(text);
    oracle.speak(text, () => {
      setTimeout(() => setOracleText(''), 1500);
      onEnd?.();
    });
  }, [oracle]);

  const oracleNarrate = useCallback((eventKey, onEnd) => {
    const text = getNarration(eventKey, ctx.oraclePersonality);
    oracleSay(text, onEnd);
  }, [ctx.oraclePersonality, oracleSay]);

  // ── BOOT: Touch unlocks AudioContext ──────────────────────────────────────
  const handleTouch = useCallback(async () => {
    try {
      await AudioContextManager.getInstance().unlock();
      await ensureVoicesLoaded();
      send({ type: 'TOUCH' });
    } catch (e) {
      console.error('AudioContext unlock failed', e);
    }
  }, [send]);

  // ── DIEGETIC INSTALL: Oracle chosen ──────────────────────────────────────
  const handleOracleSelected = useCallback(async ({ personality, gender, gameMode }) => {
    send({ type: 'SET_ORACLE', personality, gender, gameMode });
    // Init mic once Oracle is chosen
    const ok = await audioEngine.initMic();
    if (!ok) setMicError(true);
  }, [send, audioEngine]);

  // ── CALIBRATION: Add samples and advance ─────────────────────────────────
  const handleAddSample = useCallback((mfcc) => {
    send({ type: 'ADD_CALIBRATION_SAMPLE', mfcc });
  }, [send]);

  const handleNextCalibPhase = useCallback(() => {
    send({ type: 'NEXT_CALIBRATION_PHASE' });
  }, [send]);

  // ── BATTLE LOOP: Listen for moves ─────────────────────────────────────────
  const startListenWindow = useCallback(() => {
    setIsListening(true);
    setDetectedMove(null);
    setActivePhoneme(null);

    // Update calibration for current player
    const playerIdx = ctx.currentTurn;
    const calibration = ctx.players[playerIdx]?.calibration;
    if (calibration) audioEngine.setCalibration(calibration);

    const turnKey = `${ctx.round}-${playerIdx}`;
    oracleNarrate('your_turn');

    // Poll for move detection
    detectIntervalRef.current = setInterval(() => {
      const result = audioEngine.detectMove();
      if (result?.phoneme) {
        setActivePhoneme(result.phoneme);
        setDetectedMove(result);
      }
    }, 80);

    // Commit after window
    clearTimeout(listenTimerRef.current);
    listenTimerRef.current = setTimeout(() => {
      clearInterval(detectIntervalRef.current);
      setIsListening(false);
      const finalResult = audioEngine.detectMove();
      const move = finalResult?.phoneme || null;
      const artScore = finalResult?.articulationScore ?? 0.5;

      if (!move) {
        send({ type: 'TIMEOUT_MOVE' });
      } else {
        setActivePhoneme(move);
        send({ type: 'COMMIT_MOVE', move, articulationScore: artScore });
      }
    }, LISTEN_WINDOW_MS);
  }, [ctx, audioEngine, oracleNarrate, send]);

  // ── STATE EFFECTS ─────────────────────────────────────────────────────────
  // Narrate when entering BATTLE_LOOP
  useEffect(() => {
    if (stateName !== 'BATTLE_LOOP') return;
    if (hasNarratedRef.current['battle_start']) return;
    hasNarratedRef.current['battle_start'] = true;
    const intro = getNarration('install', ctx.oraclePersonality);
    oracleSay(intro, () => {
      setTimeout(startListenWindow, 800);
    });
  }, [stateName]); // eslint-disable-line

  // After result display, resume listening for next round
  useEffect(() => {
    if (stateName !== 'BATTLE_LOOP') return;
    // When pendingMoves cleared (new round), restart listen window
    if (!ctx.pendingMoves[0] && !ctx.pendingMoves[1] && ctx.round > 0) {
      const key = `round-${ctx.round}`;
      if (hasNarratedRef.current[key]) return;
      hasNarratedRef.current[key] = true;
      setTimeout(startListenWindow, 600);
    }
  }, [ctx.pendingMoves, ctx.round, stateName]); // eslint-disable-line

  // Narrate round result
  useEffect(() => {
    if (stateName !== 'RESULT_DISPLAY') return;
    const key = `result-${ctx.round}`;
    if (hasNarratedRef.current[key]) return;
    hasNarratedRef.current[key] = true;
    clearInterval(detectIntervalRef.current);
    setIsListening(false);

    const narKey = ctx.roundWinner === 'p1' ? 'win_round'
      : ctx.roundWinner === 'p2' ? 'lose_round'
      : 'tie_round';

    if (ctx.glassDaggerActive?.[0]) {
      oracleSay(getNarration('glass_dagger', ctx.oraclePersonality));
    } else {
      oracleSay(getNarration(narKey, ctx.oraclePersonality));
    }
  }, [stateName, ctx.round]); // eslint-disable-line

  // Narrate end game
  useEffect(() => {
    if (stateName !== 'END_GAME') return;
    const narKey = ctx.winner === 'p1' ? 'win_game' : 'lose_game';
    oracleSay(getNarration(narKey, ctx.oraclePersonality));
  }, [stateName]); // eslint-disable-line

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout(listenTimerRef.current);
      clearInterval(detectIntervalRef.current);
    };
  }, []);

  const handleReplay = useCallback(() => {
    hasNarratedRef.current = {};
    oracle.cancel();
    send({ type: 'REPLAY' });
  }, [send, oracle]);

  // ── RENDER ────────────────────────────────────────────────────────────────
  const showCanvas = ['CALIBRATION', 'BATTLE_LOOP', 'RESULT_DISPLAY', 'END_GAME', 'DIEGETIC_INSTALL'].includes(stateName);

  return (
    <div className="App" data-testid="phonemon-app">
      {/* Global cymatics backdrop */}
      {showCanvas && (
        <CymaticsCanvas
          features={audioEngine.latestFeatures}
          activePhoneme={activePhoneme}
          gameState={stateName}
        />
      )}

      {/* Screens */}
      {stateName === 'INIT_BOOT' && (
        <BootScreen onTouch={handleTouch} />
      )}

      {stateName === 'DIEGETIC_INSTALL' && (
        <DiegeticInstall
          oracle={oracle}
          onComplete={handleOracleSelected}
          latestFeatures={audioEngine.latestFeatures}
        />
      )}

      {stateName === 'CALIBRATION' && (
        <CalibrationScreen
          calibrationStep={ctx.calibrationStep}
          gameMode={ctx.gameMode}
          latestFeatures={audioEngine.latestFeatures}
          onAddSample={handleAddSample}
          onNextPhase={handleNextCalibPhase}
          oracle={{
            startCalibrationRecording: audioEngine.startCalibrationRecording,
            stopCalibrationRecording: audioEngine.stopCalibrationRecording,
            speak: (t, cb) => oracleSay(t, cb),
          }}
        />
      )}

      {/* Battle overlay */}
      {(stateName === 'BATTLE_LOOP' || stateName === 'RESULT_DISPLAY') && (
        <>
          <BattleHUD
            playerHealth={ctx.playerHealth}
            maxHealth={10}
            round={ctx.round}
            maxRounds={ctx.maxRounds}
            gameMode={ctx.gameMode}
            currentTurn={ctx.currentTurn}
            pendingMoves={ctx.pendingMoves}
            roundWinner={stateName === 'RESULT_DISPLAY' ? ctx.roundWinner : null}
            glassDaggerActive={ctx.glassDaggerActive}
            players={ctx.players}
          />
          <OracleDisplay
            text={oracleText}
            personality={ctx.oraclePersonality}
            isActive={!!oracleText}
          />
          <VoiceInputViz
            features={audioEngine.latestFeatures}
            detectedPhoneme={activePhoneme}
            isListening={isListening}
          />

          {/* Pass device overlay for PassPlay */}
          {ctx.gameMode === 'passplay' && ctx.currentTurn === 1 && stateName === 'BATTLE_LOOP' && (
            <div
              data-testid="pass-device-overlay"
              style={{
                position: 'fixed', inset: 0, zIndex: 60,
                background: 'rgba(0,0,0,0.88)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 16,
              }}
              onClick={startListenWindow}
            >
              <div style={{ fontFamily: 'Cinzel', fontSize: 22, color: '#05D9E8', letterSpacing: 6 }}>PASS THE DEVICE</div>
              <div style={{ fontFamily: 'Manrope', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                {ctx.players?.[1]?.title || 'Player 2'} — touch to speak
              </div>
            </div>
          )}
        </>
      )}

      {stateName === 'END_GAME' && (
        <>
          <EndGameScreen
            winner={ctx.winner}
            players={ctx.players}
            finalScore={ctx.finalScore}
            gameMode={ctx.gameMode}
            onReplay={handleReplay}
            personality={ctx.oraclePersonality}
          />
          <OracleDisplay text={oracleText} personality={ctx.oraclePersonality} isActive={!!oracleText} />
        </>
      )}

      {/* Mic error fallback */}
      {micError && (
        <div
          data-testid="mic-error"
          style={{
            position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
            zIndex: 200, fontFamily: 'Rajdhani', fontSize: 10, letterSpacing: 4,
            color: '#FF0055', textTransform: 'uppercase',
            background: 'rgba(0,0,0,0.8)', padding: '8px 24px',
            border: '1px solid rgba(255,0,85,0.3)',
          }}
        >
          LINK BROKEN · MICROPHONE ACCESS REQUIRED
        </div>
      )}

      {/* CRT noise overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 90, pointerEvents: 'none',
        backgroundImage: 'url(https://grainy-gradients.vercel.app/noise.svg)',
        opacity: 0.025, mixBlendMode: 'overlay',
      }} />
    </div>
  );
}
