# Phoneme-Mon — PRD

## Problem Statement
Build "Phoneme-Mon" — a 100% voice-controlled, 3D auditory battle PWA. Zero-UI auditory environment where players vocalize phonemes to play RPS-style combat, analyzed in real-time via AudioWorklet DSP. Diegetic everything — no menus, Oracle narrates via 3D spatial audio.

## Architecture

### Tech Stack
- React 18 + CRA + CRACO
- XState v5 (@xstate/react v4)
- Web Speech Synthesis API (TTS — no API key)
- Custom AudioWorklet (DSP — no external lib)
- Canvas 2D (cymatics)
- FastAPI + MongoDB (minimal backend)

### Module Structure
```
src/worklets/         AudioWorklet DSP (MeydaProcessor.js in public/)
src/machines/         XState v5 game machine + Markov enemy AI
src/hooks/            useAudioEngine, useOracleVoice, useBattleReplay, useWebRTC, useCalibrationProfiles
src/utils/            AudioContextManager, AUIManager, dspMath, narrationStrings, speechUtils
src/components/
  screens/            BootScreen, DiegeticInstall, CalibrationScreen, EndGameScreen, OnlineMatchmaking
  game/               CymaticsCanvas, BattleHUD
  ui/                 OracleDisplay, VoiceInputViz
```

## Game States (XState v5)
```
INIT_BOOT → DIEGETIC_INSTALL → CALIBRATION → BATTLE_LOOP ↔ RESULT_DISPLAY → END_GAME
                              → ONLINE_MATCHMAKING (for online mode)
```

## RPS Logic
```
Burst (plosive/RMS spike) > Flow (fricative/high centroid) > Tone (vowel/low flatness) > Burst
```

## Implementation Status

### Completed
- [x] AudioWorklet DSP (MeydaProcessor.js) — RMS, ZCR, Centroid, Flatness, MFCC-13, NaN guards
- [x] XState v5 game machine — all states + ONLINE_MATCHMAKING + REMOTE_MOVE
- [x] Markov chain enemy AI with adaptive difficulty
- [x] AudioContextManager singleton with iOS hacks (silent stream, gesture unlock), fully defensive
- [x] AUIManager — SpatialPannerNode HRTF, all try-catch
- [x] 6 Oracle voice configurations (Mentor/Rival/Ancient x M/F) + speech safety timeouts
- [x] Cymatics Canvas — 5,200 particles, golden ratio icosahedron, RAF-based (no re-render)
- [x] VoiceInputViz — RAF-based with direct ref reads (no React state updates per frame)
- [x] Battle HUD (health, round, moves, glass dagger indicator)
- [x] Boot screen, Diegetic Install, Calibration Screen, End Game screen
- [x] Pass & Play multiplayer (same device)
- [x] Online PvP — WebRTC DataChannel, WebSocket signaling
- [x] Battle replay export + Web Share API
- [x] Backend: score endpoints + room management + WebSocket relay

### Bug Fixes (2026-03-04)
- [x] **CRITICAL: CymaticsCanvas invalid hex-to-rgba** — `#FF2A6D` → `rgba(FF2A6D,0.15)` threw on every frame
- [x] **CRITICAL: 43Hz re-render cascade** — Audio features triggered full React tree re-render at 43fps. Fixed by storing features in ref, throttling state updates to 12Hz, CymaticsCanvas+VoiceInputViz use featuresRef directly.
- [x] **CRITICAL: Stale closures in battle effects** — `startListenWindow` captured stale XState context
- [x] **Speech synthesis fallback** — Added 6s timeout + per-utterance safety timeout for devices where onend never fires
- [x] **Defensive refactor** — All Speech Synthesis, Web Audio, WebRTC, AudioWorklet calls wrapped in try-catch. App is now crash-proof on any device.

### P0 Backlog (Next)
- [ ] Tune MFCC Euclidean distance thresholds with real mic testing
- [ ] Advanced Phoneme Tuning screen (record/fine-tune phoneme samples)
- [ ] Profile selection UI in calibration (skip re-calibration)

### P1 Backlog
- [ ] Enemy AI Variety (aggressive, defensive personalities)
- [ ] Multiple battle arenas (different particle themes)
- [ ] Score persistence with player names
- [ ] Global leaderboards

### P2 Backlog
- [ ] Customizable Cymatics Visualizer
- [ ] Animated GIF replay export
- [ ] iOS App Store PWA submission guide

## API Endpoints
- `GET /api/` — health check
- `POST /api/scores` — save game score
- `GET /api/scores` — leaderboard (top 20)
- `POST /api/rooms` — create online room
- `WS /api/ws/room/{code}/{role}` — WebSocket signaling
