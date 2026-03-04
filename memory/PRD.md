# Phoneme-Mon — PRD

## Problem Statement
Build "Phoneme-Mon" — a 100% voice-controlled, 3D auditory battle PWA. Zero-UI auditory environment where players vocalize phonemes to play RPS-style combat, analyzed in real-time via AudioWorklet DSP.

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
  screens/            BootScreen, DiegeticInstall, CalibrationScreen, TutorialScreen, EndGameScreen, OnlineMatchmaking
  game/               CymaticsCanvas, BattleHUD
  ui/                 OracleDisplay, VoiceInputViz
```

## Game States (XState v5)
```
INIT_BOOT → DIEGETIC_INSTALL → CALIBRATION → TUTORIAL (if tutorialMode) → BATTLE_LOOP ↔ RESULT_DISPLAY → END_GAME
                              → ONLINE_MATCHMAKING (for online mode)
```

## RPS Logic
```
Burst (plosive/RMS spike) > Flow (fricative/high centroid) > Tone (vowel/low flatness) > Burst
```

## Implementation Status

### Completed
- [x] AudioWorklet DSP (MeydaProcessor.js) — RMS, ZCR, Centroid, Flatness, MFCC-13, NaN guards
- [x] XState v5 game machine — all states + TUTORIAL + ONLINE_MATCHMAKING
- [x] Markov chain enemy AI with adaptive difficulty
- [x] AudioContextManager singleton with iOS hacks, fully defensive
- [x] AUIManager — SpatialPannerNode HRTF, all try-catch
- [x] 6 Oracle voice configs + speech safety timeouts
- [x] Cymatics Canvas — 5,200 particles, golden ratio icosahedron, RAF-based
- [x] VoiceInputViz — RAF-based with direct ref reads
- [x] Battle HUD — Large segmented HP bars (14px, 10 segments), shake animation on damage, color transitions (green/yellow/red)
- [x] **Tutorial Screen** — Interactive RPS triangle diagram, 3-step phoneme practice with sound prompts, "TRAINING COMPLETE" → "BEGIN BATTLE"
- [x] **Longer battle turns** — 6s listen window, 5s result display
- [x] Boot screen, Diegetic Install (4 modes: Tutorial/Solo/Pass&Play/Online), Calibration Screen, End Game screen
- [x] Pass & Play multiplayer + Online PvP (WebRTC/WebSocket)
- [x] Battle replay export + Web Share API
- [x] Backend: score endpoints + room management + WebSocket relay
- [x] All external API calls (Speech, WebAudio, WebRTC) wrapped in try-catch

### Bug Fixes (2026-03-04)
- [x] CymaticsCanvas invalid hex-to-rgba color conversion
- [x] 43Hz re-render cascade (throttled to 12Hz)
- [x] Stale closures in battle effects
- [x] Speech synthesis fallback timeouts

### P0 Backlog (Next)
- [ ] Tune MFCC thresholds with real mic testing
- [ ] Advanced Phoneme Tuning screen
- [ ] Profile selection UI in calibration

### P1 Backlog
- [ ] Enemy AI Variety (aggressive, defensive personalities)
- [ ] Multiple battle arenas
- [ ] Global leaderboards

### P2 Backlog
- [ ] Customizable Cymatics Visualizer
- [ ] Animated GIF replay export

## API Endpoints
- `GET /api/` — health check
- `POST /api/scores` — save game score
- `GET /api/scores` — leaderboard (top 20)
- `POST /api/rooms` — create online room
- `WS /api/ws/room/{code}/{role}` — WebSocket signaling
