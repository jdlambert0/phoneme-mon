/**
 * Phoneme-Mon — Main Application (v2)
 * Wires: XState · AudioEngine · AUI Spatial · Oracle Voice · WebRTC · Replay · Profiles
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useMachine } from '@xstate/react';
import './App.css';

import { gameMachine } from './machines/gameMachine';
import { AudioContextManager } from './utils/AudioContextManager';
import { AUIManager }          from './utils/AUIManager';
import { useAudioEngine }      from './hooks/useAudioEngine';
import { useOracleVoice }      from './hooks/useOracleVoice';
import { useBattleReplay }     from './hooks/useBattleReplay';
import { useWebRTC }           from './hooks/useWebRTC';
import { useCalibrationProfiles } from './hooks/useCalibrationProfiles';
import { getNarration }        from './utils/narrationStrings';
import { ensureVoicesLoaded }  from './utils/speechUtils';

import BootScreen          from './components/screens/BootScreen';
import DiegeticInstall     from './components/screens/DiegeticInstall';
import CalibrationScreen   from './components/screens/CalibrationScreen';
import EndGameScreen       from './components/screens/EndGameScreen';
import OnlineMatchmaking   from './components/screens/OnlineMatchmaking';
import { CymaticsCanvas }  from './components/game/CymaticsCanvas';
import { BattleHUD }       from './components/game/BattleHUD';
import { OracleDisplay }   from './components/ui/OracleDisplay';
import { VoiceInputViz }   from './components/ui/VoiceInputViz';

const LISTEN_WINDOW_MS = 3500;

export default function App() {
  const [state, send]    = useMachine(gameMachine);
  const ctx              = state.context;
  const stateName        = state.value;

  const [oracleText, setOracleText]       = useState('');
  const [activePhoneme, setActivePhoneme] = useState(null);
  const [isListening, setIsListening]     = useState(false);
  const [micError, setMicError]           = useState(false);
  const [rtcStatus, setRtcStatus]         = useState('idle');
  // Online: wait for remote move after local move committed
  const awaitingRemoteRef = useRef(false);

  const listenTimerRef  = useRef(null);
  const detectIntervalRef = useRef(null);
  const hasNarratedRef  = useRef({});
  const auiRef          = useRef(null);
  const startListenRef  = useRef(null);

  const audioEngine  = useAudioEngine();
  const oracle       = useOracleVoice(ctx.oraclePersonality, ctx.oracleGender);
  const replay       = useBattleReplay();
  const { profiles, saveProfile, touchProfile } = useCalibrationProfiles();

  // ── WebRTC ────────────────────────────────────────────────────────────────
  const webrtc = useWebRTC({
    onConnectionChange: (s) => setRtcStatus(s),
    onRemoteMove: (move, artScore) => {
      // Remote move received → dispatch to XState
      if (awaitingRemoteRef.current) {
        awaitingRemoteRef.current = false;
        send({ type: 'REMOTE_MOVE', move, articulationScore: artScore });
      }
    },
    onOpponentReady: () => {},
  });

  // ── AUI (Spatial Audio) init ──────────────────────────────────────────────
  useEffect(() => {
    const mgr = AudioContextManager.getInstance();
    if (mgr.ctx && !auiRef.current) {
      auiRef.current = new AUIManager(mgr.ctx);
    }
  }, [stateName]);

  // ── ORACLE SPEAK + AUI spatial tone ───────────────────────────────────────
  const oracleSay = useCallback((text, onEnd) => {
    setOracleText(text);
    auiRef.current?.playEvent('oracle_speak');
    oracle.speak(text, () => {
      setTimeout(() => setOracleText(''), 1800);
      onEnd?.();
    });
  }, [oracle]);

  const oracleNarrate = useCallback((eventKey, onEnd) => {
    oracleSay(getNarration(eventKey, ctx.oraclePersonality), onEnd);
  }, [ctx.oraclePersonality, oracleSay]);

  // ── BOOT ──────────────────────────────────────────────────────────────────
  const handleTouch = useCallback(async () => {
    try {
      const audioCtx = await AudioContextManager.getInstance().unlock();
      auiRef.current = new AUIManager(audioCtx);
      await ensureVoicesLoaded();
      send({ type: 'TOUCH' });
    } catch (e) {
      console.error('AudioContext unlock failed', e);
      // Still advance — graceful degradation
      send({ type: 'TOUCH' });
    }
  }, [send]);

  // ── ORACLE SELECTED ───────────────────────────────────────────────────────
  const handleOracleSelected = useCallback(async ({ personality, gender, gameMode }) => {
    send({ type: 'SET_ORACLE', personality, gender, gameMode });
    if (gameMode !== 'online') {
      const ok = await audioEngine.initMic();
      if (!ok) setMicError(true);
    }
  }, [send, audioEngine]);

  // ── ONLINE ROOM READY ─────────────────────────────────────────────────────
  const handleRoomReady = useCallback(async ({ roomCode, role }) => {
    await webrtc.connect(roomCode, role);
    const ok = await audioEngine.initMic();
    if (!ok) setMicError(true);
  }, [webrtc, audioEngine]);

  const handleRoomConnected = useCallback(({ roomCode, role }) => {
    send({ type: 'ROOM_CONNECTED', roomCode, role });
  }, [send]);

  // ── CALIBRATION ───────────────────────────────────────────────────────────
  const handleAddSample    = useCallback((mfcc) => send({ type: 'ADD_CALIBRATION_SAMPLE', mfcc }), [send]);
  const handleNextCalibPhase = useCallback(() => send({ type: 'NEXT_CALIBRATION_PHASE' }), [send]);

  // ── BATTLE LOOP: listen window ────────────────────────────────────────────
  const startListenWindow = useCallback(() => {
    setIsListening(true);
    setActivePhoneme(null);

    const playerIdx  = ctx.gameMode === 'online' ? 0 : ctx.currentTurn;
    const calibration = ctx.players[playerIdx]?.calibration;
    if (calibration) audioEngine.setCalibration(calibration);

    oracleNarrate('your_turn');
    auiRef.current?.playEvent('oracle_speak');

    detectIntervalRef.current = setInterval(() => {
      const result = audioEngine.detectMove();
      if (result?.phoneme) setActivePhoneme(result.phoneme);
    }, 80);

    clearTimeout(listenTimerRef.current);
    listenTimerRef.current = setTimeout(() => {
      clearInterval(detectIntervalRef.current);
      setIsListening(false);
      const finalResult = audioEngine.detectMove();
      const move     = finalResult?.phoneme || null;
      const artScore = finalResult?.articulationScore ?? 0.5;

      if (ctx.gameMode === 'online') {
        // Send move to opponent via DataChannel regardless
        webrtc.sendMove(move || 'burst', artScore);
        // Store locally and wait for remote
        awaitingRemoteRef.current = true;
        send({ type: 'COMMIT_MOVE', move: move || 'burst', articulationScore: artScore });
        // Timeout: if no remote move after 8s, force resolve
        setTimeout(() => {
          if (awaitingRemoteRef.current) {
            awaitingRemoteRef.current = false;
            send({ type: 'TIMEOUT_MOVE' });
          }
        }, 8000);
      } else if (!move) {
        send({ type: 'TIMEOUT_MOVE' });
      } else {
        setActivePhoneme(move);
        send({ type: 'COMMIT_MOVE', move, articulationScore: artScore });
      }
    }, LISTEN_WINDOW_MS);
  }, [ctx, audioEngine, oracleNarrate, send, webrtc]);

  // Keep startListenWindow ref current to avoid stale closures in effects
  useEffect(() => { startListenRef.current = startListenWindow; }, [startListenWindow]);

  // ── STATE EFFECTS ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (stateName !== 'BATTLE_LOOP') return;
    if (hasNarratedRef.current['battle_start']) return;
    hasNarratedRef.current['battle_start'] = true;
    replay.startRecording();
    auiRef.current?.playEvent('enemy_reveal');
    const intro = getNarration('install', ctx.oraclePersonality);
    oracleSay(intro, () => setTimeout(() => startListenRef.current?.(), 800));
  }, [stateName, ctx.oraclePersonality, oracleSay, replay]);

  // New round: resume listen
  useEffect(() => {
    if (stateName !== 'BATTLE_LOOP') return;
    if (!ctx.pendingMoves[0] && !ctx.pendingMoves[1] && ctx.round > 0) {
      const key = `round-${ctx.round}`;
      if (hasNarratedRef.current[key]) return;
      hasNarratedRef.current[key] = true;
      setTimeout(() => startListenRef.current?.(), 600);
    }
  }, [ctx.pendingMoves, ctx.round, stateName]);

  // Round result narration + AUI
  useEffect(() => {
    if (stateName !== 'RESULT_DISPLAY') return;
    const key = `result-${ctx.round}`;
    if (hasNarratedRef.current[key]) return;
    hasNarratedRef.current[key] = true;
    clearInterval(detectIntervalRef.current);
    setIsListening(false);

    // Record move for replay
    replay.recordMove(0, ctx.pendingMoves[0], ctx.articulationScores[0], ctx.roundWinner);

    // AUI spatial sounds
    if (ctx.roundWinner === 'p1')     auiRef.current?.playEvent('oracle_round_win');
    else if (ctx.roundWinner === 'p2') auiRef.current?.playEvent('enemy_wins_round');
    else                              auiRef.current?.playEvent('round_tie');

    if (ctx.glassDaggerActive?.[0]) {
      auiRef.current?.playEvent('glass_dagger');
      oracleSay(getNarration('glass_dagger', ctx.oraclePersonality));
    } else {
      const narKey = ctx.roundWinner === 'p1' ? 'win_round'
        : ctx.roundWinner === 'p2' ? 'lose_round' : 'tie_round';
      oracleSay(getNarration(narKey, ctx.oraclePersonality));
    }
  }, [stateName, ctx.round, ctx.pendingMoves, ctx.articulationScores, ctx.roundWinner, ctx.glassDaggerActive, ctx.oraclePersonality, oracleSay, replay]);

  // End game
  useEffect(() => {
    if (stateName !== 'END_GAME') return;
    replay.stopRecording();
    auiRef.current?.playEvent('calibration_complete');
    const narKey = ctx.winner === 'p1' ? 'win_game' : 'lose_game';
    oracleSay(getNarration(narKey, ctx.oraclePersonality));
    // Save score
    if (ctx.players[0]?.title) {
      const BACKEND = process.env.REACT_APP_BACKEND_URL || '';
      fetch(`${BACKEND}/api/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_title: ctx.players[0].title,
          personality:  ctx.oraclePersonality,
          rounds_won:   ctx.finalScore[0],
          rounds_lost:  ctx.finalScore[1],
        }),
      }).catch(() => {});
    }
  }, [stateName, ctx.winner, ctx.oraclePersonality, ctx.players, ctx.finalScore, oracleSay, replay]);

  // Stream features to replay recorder
  useEffect(() => {
    if (!audioEngine.latestFeatures) return;
    replay.recordFrame(audioEngine.latestFeatures);
  }, [audioEngine.latestFeatures, replay]);

  // Cleanup
  useEffect(() => () => {
    clearTimeout(listenTimerRef.current);
    clearInterval(detectIntervalRef.current);
  }, []);

  const handleReplay = useCallback(() => {
    hasNarratedRef.current = {};
    oracle.cancel();
    webrtc.disconnect();
    send({ type: 'REPLAY' });
  }, [send, oracle, webrtc]);

  // ── RENDER ────────────────────────────────────────────────────────────────
  const showCanvas = !['INIT_BOOT'].includes(stateName);

  return (
    <div className="App" data-testid="phonemon-app">

      {showCanvas && (
        <CymaticsCanvas
          features={audioEngine.latestFeatures}
          activePhoneme={activePhoneme}
          gameState={stateName}
        />
      )}

      {stateName === 'INIT_BOOT' && <BootScreen onTouch={handleTouch} />}

      {stateName === 'DIEGETIC_INSTALL' && (
        <DiegeticInstall
          oracle={oracle}
          onComplete={handleOracleSelected}
          latestFeatures={audioEngine.latestFeatures}
        />
      )}

      {stateName === 'ONLINE_MATCHMAKING' && (
        <OnlineMatchmaking
          onRoomReady={(info) => {
            handleRoomReady(info).then(() => {
              // Move to calibration once WebRTC peer-connected (or after timeout)
              const checkConnected = setInterval(() => {
                if (rtcStatus === 'connected') {
                  clearInterval(checkConnected);
                  handleRoomConnected(info);
                }
              }, 500);
              // Fallback after 30s even if guest hasn't joined
              setTimeout(() => { clearInterval(checkConnected); handleRoomConnected(info); }, 30000);
            });
          }}
          onBack={() => send({ type: 'BACK' })}
          connectionStatus={rtcStatus}
        />
      )}

      {stateName === 'CALIBRATION' && (
        <CalibrationScreen
          calibrationStep={ctx.calibrationStep}
          gameMode={ctx.gameMode}
          latestFeatures={audioEngine.latestFeatures}
          savedProfiles={profiles}
          onAddSample={handleAddSample}
          onNextPhase={handleNextCalibPhase}
          oracle={{
            startCalibrationRecording: audioEngine.startCalibrationRecording,
            stopCalibrationRecording:  audioEngine.stopCalibrationRecording,
            speak: (t, cb) => oracleSay(t, cb),
          }}
        />
      )}

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
          <OracleDisplay text={oracleText} personality={ctx.oraclePersonality} isActive={!!oracleText} />
          <VoiceInputViz features={audioEngine.latestFeatures} detectedPhoneme={activePhoneme} isListening={isListening} />

          {/* PassPlay: pass device overlay */}
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

          {/* Online: waiting for remote move */}
          {ctx.gameMode === 'online' && awaitingRemoteRef.current && (
            <div style={{
              position: 'fixed', bottom: 140, left: '50%', transform: 'translateX(-50%)',
              zIndex: 40, fontFamily: 'Rajdhani', fontSize: 9, letterSpacing: 4,
              color: 'rgba(5,217,232,0.6)', textTransform: 'uppercase',
              animation: 'breathe 1.5s ease infinite',
            }}>
              WAITING FOR OPPONENT...
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
            onShare={() => replay.shareReplay(ctx.players[0]?.title || 'Voice')}
            personality={ctx.oraclePersonality}
          />
          <OracleDisplay text={oracleText} personality={ctx.oraclePersonality} isActive={!!oracleText} />
        </>
      )}

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
