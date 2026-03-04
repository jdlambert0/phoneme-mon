# Phoneme-Mon — PRD

## Problem Statement
Build "Phoneme-Mon" — a 100% voice-controlled, 3D auditory battle PWA. Zero-UI auditory environment where players vocalize phonemes to play RPS-style combat, analyzed in real-time via AudioWorklet DSP. Diegetic everything — no menus, Oracle narrates via 3D spatial audio.

## Design Philosophy (Three Lenses)
1. **Simple over Easy** (Rich Hickey via Easy/Simple transcript): Rules are simple (3 moves, RPS triangle), mastery is hard — spectral physics don't lie.
2. **Outloop Agentic Design** (Stripe Minions): Oracle + Enemy are autonomous agents. No menus. XState is the blueprint engine. DSP is the tool shed.
3. **Procedural Rhetoric** (Ian Bogost): The game argues "your voice is a precision instrument." Calibration = identity. Glass Dagger = procedural compassion.

## Architecture

### Tech Stack
- React 19 + CRA + CRACO
- XState v5 (@xstate/react v4)
- Web Speech Synthesis API (TTS — no API key)
- Web Speech API SpeechRecognition (optional commands)
- Custom AudioWorklet (DSP — no external lib)
- Canvas 2D (cymatics)
- FastAPI + MongoDB (minimal backend)

### Module Structure (Strict Decoupling)
```
src/worklets/         AudioWorklet DSP (MeydaProcessor.js in public/)
src/machines/         XState v5 game machine + Markov enemy AI
src/hooks/            useAudioEngine (worklet bridge) + useOracleVoice (TTS)
src/utils/            AudioContextManager, dspMath, narrationStrings, speechUtils
src/components/
  screens/            BootScreen, DiegeticInstall, CalibrationScreen, EndGameScreen
  game/               CymaticsCanvas (5000+ particles), BattleHUD
  ui/                 OracleDisplay (typewriter), VoiceInputViz (RMS circle)
```

## Game States (XState v5)
```
INIT_BOOT → (TOUCH) →
DIEGETIC_INSTALL → (SET_ORACLE: personality+gender+mode) →
CALIBRATION → (NEXT_CALIBRATION_PHASE × 3 or 6) →
BATTLE_LOOP → (COMMIT_MOVE or TIMEOUT_MOVE) →
RESULT_DISPLAY → (after 3.5s) →
END_GAME → (REPLAY) → INIT_BOOT
```

## Oracle Voice System
- 3 personalities × 2 genders = 6 voice configurations
- Mentor F/M, Rival F/M, Ancient F/M
- Selected diegetically: first phoneme detected → Oracle type (Burst=Rival, Flow=Mentor, Tone=Ancient)
- Web Speech Synthesis with pitch/rate tuning per personality
- Recency Effect: avoids repeating last 5 narration strings
- iOS fix: keep-alive interval + silent stream hack

## DSP Pipeline (AudioWorklet)
- 512-sample circular buffer (4 × 128 quantum)
- Hann windowing → Cooley-Tukey FFT → Power spectrum
- Features: RMS, ZCR, Spectral Centroid, Spectral Flatness, MFCC-13
- Mel filterbank: 26 filters, 0–22050 Hz
- Posts features ~43Hz to main thread

## RPS Logic
```
Burst (plosive/RMS spike) > Flow (fricative/high centroid) > Tone (vowel/low flatness) > Burst
```

## Glass Dagger
- Activates when articulation score is low (MFCC Euclidean distance from calibration > 0.7)
- Oracle narrates the compensation
- Prevents total loss for unclear speakers

## Enemy AI (Markov Chain)
- Order-2 Markov transition matrix on player move history
- Adaptive difficulty: increases by round, decreases if player struggling
- Counters predicted player move

## Cymatics Canvas
- 5,200 physics particles (ambient + phoneme-triggered bursts)
- Off-screen sprite canvas for performance
- Icosahedron vertices (Golden Ratio φ=1.618) for Tone visualization
- 3D rotation projected to 2D
- RMS → particle velocity, Centroid → color hue, Flatness → spread

## Pass & Play Multiplayer
- Both players calibrate MFCC fingerprints sequentially
- Oracle assigns character title based on dominant phoneme
- Turn-based with "PASS THE DEVICE" overlay between turns
- Each player's calibration stored separately in XState context

## iOS PWA Hardening
- AudioContext.resume() on first user gesture only
- Silent Stream hack: silent oscillator → MediaStreamDestination → prevents suspension
- PWA manifest: standalone mode, theme-color #000000
- iOS apple-mobile-web-app-capable meta

## Implementation Status
### Completed (2026-02-XX)
- [x] AudioWorklet DSP (MeydaProcessor.js) — RMS, ZCR, Centroid, Flatness, MFCC-13
- [x] XState v5 game machine — all states + transitions
- [x] Markov chain enemy AI with adaptive difficulty
- [x] AudioContextManager singleton with iOS hacks
- [x] 6 Oracle voice configurations (Mentor/Rival/Ancient × M/F)
- [x] Recency Effect narration system
- [x] Cymatics Canvas — 5,200 particles, golden ratio icosahedron
- [x] Oracle Display with typewriter animation
- [x] VoiceInputViz RMS circle
- [x] Battle HUD (health, round, moves, glass dagger indicator)
- [x] Boot screen (TOUCH TO LINK)
- [x] Diegetic Install (Oracle explains rules, player chooses personality by phoneme OR tap)
- [x] Calibration Screen (3-phoneme MFCC mapping, auto-advance)
- [x] End Game screen
- [x] Pass & Play multiplayer (same device)
- [x] Backend score endpoints
- [x] PWA manifest

### P0 Backlog (Next Phase)
- [ ] WebRTC PvP online multiplayer (Phase 2)
- [ ] Save calibration profile to localStorage (return players)
- [ ] Spatial audio (SpatialPannerNode) for Oracle/Enemy positioning
- [ ] Leaderboard UI

### P1 Backlog
- [ ] Multiple battle arenas (different particle/color themes)
- [ ] Score persistence with player account
- [ ] iOS App Store PWA submission guide

### P2 Backlog
- [ ] Web Speech API command recognition (start/stop/replay)
- [ ] Transformers.js Whisper fallback for broader browser support

## User Personas
- **The Explorer**: Curious about voice interfaces, wants something novel
- **The Competitive**: Pass & Play with friends/family
- **The Creative Technologist**: Appreciates the Bogostian procedural design

## API Endpoints
- `GET /api/` — health check
- `POST /api/scores` — save game score
- `GET /api/scores` — leaderboard (top 20)
