# PHONEME-MON — REVERSE ARCHITECTURE SPECIFICATION

## 🎯 SYSTEM OVERVIEW

**Phoneme-Mon** is a 100% voice-controlled Progressive Web App (PWA) battle game where players use their voice to produce phonemes (speech sounds) that are analyzed in real-time to play Rock-Paper-Scissors-style combat against AI or other players.

**Core Concept**: Players vocalize three types of phonemes:
- **BURST** (explosive consonants like "BAH", "TAH") → defeats FLOW
- **FLOW** (fricatives like "SHHH", "FFFF") → defeats TONE
- **TONE** (sustained vowels like "AAAH", "OOOH") → defeats BURST

---

## 📊 HIGH-LEVEL ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                        │
│  (React Components - Screens, Game UI, Visual Feedback)     │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                    STATE MANAGEMENT LAYER                    │
│            (XState v5 Finite State Machine)                  │
│  Boot → Install → Calibration → Tutorial → Battle → End     │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌──────────────────┬──────────────────┬──────────────────────┐
│   AUDIO ENGINE   │   VOICE ORACLE   │   NETWORK LAYER      │
│  (AudioWorklet)  │  (Speech Synth)  │  (WebRTC/WebSocket)  │
│  Feature Extract │   TTS Narration  │  Online Multiplayer  │
└──────────────────┴──────────────────┴──────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                      BACKEND SERVICES                        │
│      FastAPI + MongoDB (Scores, Rooms, WebSocket Relay)     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏗️ TECHNOLOGY STACK

### Frontend
- **React 18** with Create React App + CRACO
- **XState v5** (state machine) + @xstate/react v4
- **TailwindCSS** + Shadcn UI components
- **Canvas 2D API** for cymatics visualization
- **Web Audio API** + AudioWorklets (DSP processing)
- **Web Speech Synthesis API** (text-to-speech, no API key)
- **WebRTC** (peer-to-peer for online PvP)

### Backend
- **FastAPI** (Python web framework)
- **MongoDB** via Motor (async driver)
- **WebSockets** (signaling relay for online mode)

### Key Libraries
- **XState**: `xstate@5.15.0`, `@xstate/react@4.1.1`
- **Lucide React**: `lucide-react@0.507.0` (icons)
- **React Router**: `react-router-dom@7.5.1`

---

## 📁 PROJECT STRUCTURE

```
phoneme-mon/
├── frontend/
│   ├── public/
│   │   ├── worklets/
│   │   │   └── MeydaProcessor.js          # AudioWorklet DSP kernel
│   │   ├── manifest.json                  # PWA manifest
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── screens/                   # Full-screen views
│   │   │   │   ├── BootScreen.js          # Initial touch-to-link screen
│   │   │   │   ├── DiegeticInstall.js     # Mode + Oracle selection
│   │   │   │   ├── CalibrationScreen.js   # Voice calibration (3 phonemes)
│   │   │   │   ├── TutorialScreen.js      # RPS tutorial + practice
│   │   │   │   ├── OnlineMatchmaking.js   # Room creation/joining
│   │   │   │   └── EndGameScreen.js       # Results + replay
│   │   │   ├── game/                      # Battle-specific UI
│   │   │   │   ├── CymaticsCanvas.js      # Particle visualizer (5200 particles)
│   │   │   │   └── BattleHUD.js           # HP bars, round counter
│   │   │   └── ui/                        # Reusable UI components
│   │   │       ├── OracleDisplay.js       # Oracle speech text display
│   │   │       ├── VoiceInputViz.js       # Mic input visualization
│   │   │       ├── RPSOverlay.js          # Quick reference overlay
│   │   │       └── ListenCountdown.js     # 6s countdown timer
│   │   ├── hooks/                         # Custom React hooks
│   │   │   ├── useAudioEngine.js          # Audio processing interface
│   │   │   ├── useOracleVoice.js          # TTS wrapper
│   │   │   ├── useBattleReplay.js         # Replay export system
│   │   │   ├── useWebRTC.js               # P2P networking
│   │   │   └── useCalibrationProfiles.js  # LocalStorage voice profiles
│   │   ├── machines/                      # XState state machines
│   │   │   ├── gameMachine.js             # Main game FSM
│   │   │   └── enemyAI.js                 # Markov chain AI
│   │   ├── utils/                         # Utility modules
│   │   │   ├── AudioContextManager.js     # Singleton audio context
│   │   │   ├── AUIManager.js              # Spatial audio (HRTF)
│   │   │   ├── dspMath.js                 # DSP calculations
│   │   │   ├── narrationStrings.js        # Oracle dialogue library
│   │   │   └── speechUtils.js             # TTS helpers
│   │   ├── App.js                         # Main app component
│   │   ├── App.css                        # App-specific styles
│   │   ├── index.js                       # React entry point
│   │   └── index.css                      # Global styles + Tailwind
│   ├── craco.config.js                    # CRACO config
│   ├── tailwind.config.js                 # Tailwind config
│   └── package.json
├── backend/
│   ├── server.py                          # FastAPI app
│   ├── requirements.txt
│   └── tests/
│       └── test_phonemon.py               # Pytest suite
├── design_guidelines.json                 # Design system spec
├── memory/
│   └── PRD.md                             # Product requirements
└── test_reports/                          # Test results
```

---

## 🎮 GAME STATE MACHINE (XState v5)

### State Flow Diagram

```
INIT_BOOT
    ↓ (TOUCH event)
DIEGETIC_INSTALL
    ↓ (SET_ORACLE with gameMode)
    ├── gameMode === 'online' → ONLINE_MATCHMAKING
    │                               ↓ (ROOM_CONNECTED)
    │                           CALIBRATION
    └── gameMode !== 'online' → CALIBRATION
                                    ↓ (NEXT_CALIBRATION_PHASE × 3 or 6)
                                    ├── tutorialMode === true → TUTORIAL
                                    │                              ↓ (START_BATTLE)
                                    └── tutorialMode === false → BATTLE_LOOP
                                                                    ↕ (COMMIT_MOVE)
                                                                RESULT_DISPLAY
                                                                    ↓ (after 5000ms)
                                                                    ├── game over → END_GAME
                                                                    └── continue → BATTLE_LOOP
                                                                                      ↓ (REPLAY)
                                                                                  INIT_BOOT
```

### State Descriptions

| State | Purpose | Key Actions |
|-------|---------|-------------|
| `INIT_BOOT` | Entry point - requires user touch to unlock audio | Display "TOUCH TO LINK" screen |
| `DIEGETIC_INSTALL` | Mode selection + Oracle personality + voice gender | Show 4 modes (Tutorial/Solo/Pass&Play/Online) |
| `ONLINE_MATCHMAKING` | Create/join online rooms | Generate 5-char room code, WebSocket connection |
| `CALIBRATION` | Record voice samples for each phoneme | 3 phases (Burst/Flow/Tone) per player |
| `TUTORIAL` | Teach RPS mechanics + phoneme practice | Interactive diagram + 3 practice steps |
| `BATTLE_LOOP` | Active combat - listen for player moves | 6s listen window, enemy AI or opponent move |
| `RESULT_DISPLAY` | Show round outcome (win/lose/tie) | Display moves, update HP, 5s pause |
| `END_GAME` | Final results + replay option | Show winner, final score, share replay |

### Context Schema

```javascript
{
  // Oracle config
  oraclePersonality: 'mentor' | 'rival' | 'ancient',
  oracleGender: 'female' | 'male',

  // Game mode
  gameMode: 'solo' | 'passplay' | 'online',
  tutorialMode: boolean,

  // Online mode
  roomCode: string | null,
  onlineRole: 'host' | 'guest' | null,

  // Calibration
  calibrationStep: 0-5,  // 0-2 = P1, 3-5 = P2
  calibrationSamples: {
    p1: { burst: [], flow: [], tone: [] },  // MFCC arrays
    p2: { burst: [], flow: [], tone: [] }
  },

  // Players
  players: [
    { name: string, title: string, calibration: { burst, flow, tone } },
    { name: string, title: string, calibration: { burst, flow, tone } }
  ],

  // Battle state
  playerHealth: [10, 10],
  round: 0,
  maxRounds: 10,
  pendingMoves: [null, null],      // Current round moves
  articulationScores: [0, 0],      // Move quality scores
  glassDaggerActive: [false, false],
  playerHistory: [],               // Last 20 moves (for AI)
  difficulty: 0.3,                 // AI difficulty (0-1)
  currentTurn: 0,                  // For pass-and-play

  // Results
  roundWinner: 'p1' | 'p2' | 'tie' | null,
  winner: 'p1' | 'p2' | 'tie' | null,
  finalScore: [0, 0]
}
```

---

## 🎙️ AUDIO PROCESSING PIPELINE

### Architecture

```
Microphone Input
      ↓
MediaStream (getUserMedia)
      ↓
AudioContext.createMediaStreamSource()
      ↓
AudioWorkletNode (meyda-processor)
      ↓
MeydaProcessor.js (512-sample circular buffer)
      ↓
DSP Feature Extraction (43 Hz)
      ↓
postMessage to Main Thread
      ↓
useAudioEngine Hook (throttled to 12 Hz for React)
      ↓
featuresRef.current (instant access)
      ↓
Phoneme Classification (MFCC distance matching)
      ↓
XState Machine Events (COMMIT_MOVE)
```

### Audio Features Extracted

| Feature | Purpose | Algorithm |
|---------|---------|-----------|
| **RMS** (Root Mean Square) | Amplitude/volume detection | `sqrt(sum(samples²) / N)` |
| **ZCR** (Zero Crossing Rate) | Burst vs. continuous sound | Count of sign changes / N |
| **Spectral Centroid** | Frequency "brightness" | Weighted average of FFT bins |
| **Spectral Flatness** | Tone purity (vowel detection) | Geometric mean / arithmetic mean |
| **MFCC-13** (Mel-Frequency Cepstral Coefficients) | Phoneme fingerprint | 26 Mel filters → DCT → 13 coeffs |

### Phoneme Classification Logic

```javascript
// Calibration phase: Record 3s of each phoneme
calibration = {
  burst: averageMFCC([sample1, sample2, ...]),  // 13-dim vector
  flow:  averageMFCC([sample1, sample2, ...]),
  tone:  averageMFCC([sample1, sample2, ...])
}

// Real-time classification: Find closest match
function classifyPhoneme(liveFeatures, calibration) {
  distances = {
    burst: euclideanDistance(liveFeatures.mfcc, calibration.burst),
    flow:  euclideanDistance(liveFeatures.mfcc, calibration.flow),
    tone:  euclideanDistance(liveFeatures.mfcc, calibration.tone)
  }

  bestMatch = min(distances)  // Lowest distance = best match
  articulationScore = distances[best] / distances[secondBest]

  return { phoneme: bestMatch, articulationScore }
}
```

### AudioWorklet DSP Kernel (`MeydaProcessor.js`)

**Key Features:**
- Runs in separate audio thread (no main thread blocking)
- 512-sample circular buffer (Hann windowed)
- Custom FFT implementation (no external dependencies)
- 26 Mel-frequency filterbanks
- DCT for MFCC extraction
- NaN guards for device compatibility
- Posts features at ~43 Hz (128-frame render quanta)

---

## 🤖 ENEMY AI SYSTEM

### Markov Chain Predictive AI

The AI learns player patterns using a **2nd-order Markov chain**:

```javascript
// Build transition map from player history
// Key: "last2Moves", Value: { burst: count, flow: count, tone: count }

playerHistory = ['burst', 'flow', 'burst', 'tone', ...]
                                          ↑
                                    predict next
// Look at last 2 moves: ['burst', 'tone']
// Find what player did next most often after this pattern
// Counter that prediction

predictedMove = mostLikelyNext(['burst', 'tone'])  // e.g., 'flow'
counterMove = COUNTERS[predictedMove]              // 'burst'
```

### Adaptive Difficulty

```javascript
difficulty = min(0.15 + round * 0.08, 0.9)  // Increases with rounds
if (articulationScore > 0.6) {              // Player struggling?
  difficulty -= 0.25                         // Reduce difficulty (mercy)
}

useMarkov = random() < difficulty
if (useMarkov) {
  return counterMove(predictPlayerMove(history))
} else {
  return randomPhoneme()  // Random choice
}
```

---

## 🎨 VISUAL SYSTEM

### CymaticsCanvas (Particle Visualizer)

**Specifications:**
- **5,200 particles** total
- **Golden ratio-based distribution** (φ = 1.618...)
- **RAF-based animation loop** (60 FPS target)
- **Direct ref reads** (no React re-renders per frame)
- **Particle physics:**
  - Burst: High initial velocity, gravity (0.04), red hue (#FF2A6D)
  - Flow: Medium velocity, anti-gravity (-0.01), cyan hue (#05D9E8)
  - Tone: Slow velocity, high drag (0.985), blue hue (#D1F7FF)
  - Ambient: Constant spawn rate, random velocities

**Geometric Overlays:**
- **Icosahedron wireframe** (12 vertices, golden ratio-based)
- **Voice circle glow** (expands with RMS amplitude)
- **Spectral centroid sweep line** (horizontal line tracking frequency)

### Design System

**Color Palette:**
```javascript
{
  void: { pure: '#000000', deep: '#030305', surface: '#0A0A0C' },
  phonemes: { burst: '#FF2A6D', flow: '#05D9E8', tone: '#D1F7FF' },
  status: { success: '#00FF94', warning: '#FFD700', error: '#FF0055' }
}
```

**Typography:**
- Headings: **Cinzel** (serif, ornate) - Oracle speech
- Data: **Rajdhani** (condensed sans) - HUD, timers
- Body: **Manrope** (rounded sans) - instructions

**UI Principles:**
1. **Auditory-first**: Sound drives visuals, not vice versa
2. **Diegetic**: No traditional menus - world IS interface
3. **Darkness as canvas**: Near-black (#030305) background
4. **Cymatic precision**: Visuals mathematically represent sound

---

## 🗣️ ORACLE VOICE SYSTEM

### TTS Configuration

**3 Personalities × 2 Genders = 6 Voice Profiles:**

| Personality | Female Params | Male Params | Character |
|-------------|---------------|-------------|-----------|
| **Mentor** | pitch: 1.15, rate: 0.88 | pitch: 0.85, rate: 0.85 | Patient teacher |
| **Rival** | pitch: 1.25, rate: 1.12 | pitch: 0.9, rate: 1.08 | Aggressive competitor |
| **Ancient** | pitch: 0.95, rate: 0.7 | pitch: 0.65, rate: 0.68 | Cryptic elder |

### Voice Selection Algorithm

```javascript
// Prefer platform-specific voices first
FEMALE_HINTS = ['Samantha', 'Victoria', 'Karen', 'Siri', ...]
MALE_HINTS = ['Alex', 'Daniel', 'Tom', 'Fred', ...]

voices = speechSynthesis.getVoices()
  .filter(v => v.lang.startsWith('en'))

scored = voices.map(v => ({
  voice: v,
  score: matchScore(v.name, HINTS)  // Higher score = better match
}))

return scored.sort((a, b) => b.score - a.score)[0].voice
```

### Narration System

**Recency Effect Prevention:**
- Tracks last 5 used phrases
- Avoids repeating recently used lines
- Falls back to full pool if all exhausted

**Event Categories:**
- `install` - Welcome messages
- `rpsRules` - Game rules explanation
- `calibrate_{phoneme}` - Calibration instructions
- `win_round` / `lose_round` / `tie_round` - Round outcomes
- `win_game` / `lose_game` - Final results
- `glass_dagger` - Articulation compensation message
- `your_turn` - Turn prompts

---

## 🌐 NETWORKING LAYER

### Online Multiplayer Architecture

```
Player 1 (Host)                           Player 2 (Guest)
      ↓                                          ↓
Create Room (POST /api/rooms)           Join Room (input code)
      ↓                                          ↓
WebSocket /api/ws/room/{code}/host      WebSocket /api/ws/room/{code}/guest
      ↓←─────────────────────────────────────→↓
         ICE candidates, SDP offer/answer
      ↓                                          ↓
RTCPeerConnection (STUN)               RTCPeerConnection (STUN)
      ↓←─────────────────────────────────────→↓
              RTCDataChannel (game moves)
```

### WebRTC Signaling Flow

1. **Host creates room** → Backend generates 5-char code (e.g., "XY3AU")
2. **Guest joins room** → Backend verifies code exists
3. **Both connect WebSockets** → Backend relays signaling messages
4. **Host creates offer** → Sent via WebSocket to guest
5. **Guest creates answer** → Sent via WebSocket to host
6. **ICE candidates exchanged** → NAT traversal via STUN servers
7. **DataChannel opens** → Direct P2P connection established
8. **Game data flows** → Moves sent via DataChannel, no backend

### Backend API Endpoints

| Method | Endpoint | Purpose | Response |
|--------|----------|---------|----------|
| GET | `/api/` | Health check | `{ message: "Phoneme-Mon API v1" }` |
| POST | `/api/scores` | Save game score | Score object with ID |
| GET | `/api/scores` | Leaderboard (top 20) | Array of score objects |
| POST | `/api/rooms` | Create online room | `{ room_code, role: "host" }` |
| GET | `/api/rooms/{code}/exists` | Check room validity | `{ exists: bool, has_host: bool }` |
| WS | `/api/ws/room/{code}/{role}` | WebRTC signaling relay | Bidirectional messages |

---

## 💾 DATA PERSISTENCE

### MongoDB Collections

**`game_scores`**
```javascript
{
  id: "uuid",
  player_title: "The Striker",     // Assigned based on dominant phoneme
  personality: "rival",             // Oracle personality used
  rounds_won: 7,
  rounds_lost: 3,
  timestamp: ISODate("2026-03-05T...")
}
```

**`status_checks`** (health monitoring)
```javascript
{
  id: "uuid",
  client_name: "test_client",
  timestamp: ISODate("2026-03-05T...")
}
```

### LocalStorage (Client-Side)

**`phonemon_profiles`** (calibration profiles)
```javascript
[
  {
    id: "timestamp-random",
    title: "The Weaver",
    calibration: {
      burst: [13 MFCC coefficients],
      flow: [13 MFCC coefficients],
      tone: [13 MFCC coefficients]
    },
    personality: "mentor",
    lastUsed: "2026-03-05T..."
  },
  // ... max 6 profiles
]
```

---

## 🎯 GAME MECHANICS

### Combat System (RPS Logic)

```
BURST > FLOW   (Explosive overpowers turbulent)
FLOW > TONE    (Turbulent disrupts sustained)
TONE > BURST   (Sustained absorbs explosive)
```

### Battle Flow

1. **Listen Window** (6 seconds)
   - Player vocalizes phoneme
   - AudioWorklet extracts features
   - MFCC matched against calibration
   - Best match selected

2. **Enemy Move** (simultaneous)
   - Solo: Markov AI predicts + counters
   - Pass&Play: 2nd player's turn
   - Online: Remote player via DataChannel

3. **Resolution** (instant)
   - Compare moves via RPS logic
   - Winner: -1 HP to loser
   - Tie: No damage

4. **Result Display** (5 seconds)
   - Show both moves
   - Update HP bars (shake animation)
   - Oracle narration

5. **Next Round** (loop until HP = 0 or 10 rounds)

### Game Modes

| Mode | Players | Opponent | Network |
|------|---------|----------|---------|
| **Tutorial** | 1 | None | Offline |
| **Solo** | 1 | Markov AI | Offline |
| **Pass & Play** | 2 (same device) | Local human | Offline |
| **Online Duel** | 2 (remote) | Remote human | WebRTC P2P |

### Special Mechanics

**Glass Dagger** (Articulation Compensation)
- Activates when `articulationScore > 0.7`
- High score = poor distinction between phonemes
- Gives player benefit of doubt (mercy mechanic)
- Oracle narrates special message

**Adaptive Difficulty** (Solo Mode)
- Starts at 30% AI prediction accuracy
- Increases ~8% per round (max 90%)
- Reduces if player articulation is poor
- AI uses random moves when not predicting

---

## 🔧 PERFORMANCE OPTIMIZATIONS

### Audio Feature Throttling

**Problem:** AudioWorklet posts at ~43 Hz → React re-renders 43×/sec → cascade lag

**Solution:**
```javascript
// Store features in ref (instant, no re-render)
featuresRef.current = features

// Throttle React state updates to 12 Hz
const STATE_UPDATE_INTERVAL = 80  // ms
if (!throttleTimer) {
  throttleTimer = setTimeout(() => {
    setLatestFeatures(featuresRef.current)
    throttleTimer = null
  }, STATE_UPDATE_INTERVAL)
}
```

### Canvas RAF Loop Optimization

**Problem:** Canvas re-initializes on every prop change

**Solution:**
```javascript
// Use refs for fast-changing values
const activePhonemeRef = useRef(activePhoneme)
const gameStateRef = useRef(gameState)

// Single RAF loop with [] dependency
useEffect(() => {
  const draw = () => {
    const features = featuresRef.current
    const phoneme = activePhonemeRef.current
    // ... render logic
    requestAnimationFrame(draw)
  }
  requestAnimationFrame(draw)
  return () => cancelAnimationFrame(rafId)
}, [])  // Empty deps - runs once
```

### iOS Audio Context Hacks

**Silent Stream Hack** (prevent context suspension)
```javascript
const osc = ctx.createOscillator()
const gain = ctx.createGain()
gain.gain.value = 0.0001  // Inaudible
osc.connect(gain).connect(ctx.destination)
osc.start()  // Keep context alive
```

**Unlock on User Gesture**
```javascript
// AudioContext must be created AFTER user interaction
document.addEventListener('touchstart', async () => {
  const ctx = new AudioContext()
  if (ctx.state === 'suspended') {
    await ctx.resume()
  }
}, { once: true })
```

---

## 🛡️ ERROR HANDLING STRATEGY

### Defensive Programming Pattern

**All external APIs wrapped in try-catch:**
- Web Audio API (context creation, worklet loading)
- Speech Synthesis API (voice enumeration, utterance)
- WebRTC (peer connection, data channel)
- Canvas operations (2D context, drawing)

**Example:**
```javascript
try {
  window.speechSynthesis.speak(utterance)
} catch (e) {
  console.warn('Speech synthesis failed:', e)
  onEnd?.()  // Always fire callback
}

// Safety timeout (speech may never fire callback)
setTimeout(() => onEnd?.(), estimatedDuration)
```

### Fallback Mechanisms

| Failure | Fallback |
|---------|----------|
| Speech synthesis never loads | 8-second timeout → auto-advance |
| AudioWorklet fails to load | Error message, graceful degradation |
| Microphone denied | Show "LINK BROKEN" error |
| WebRTC connection fails | Display connection status |
| Voice not detected in 6s | TIMEOUT_MOVE event with default 'burst' |

---

## 📱 PWA CONFIGURATION

### Manifest (`public/manifest.json`)

```json
{
  "short_name": "Phoneme-Mon",
  "name": "Phoneme-Mon Voice Combat",
  "description": "100% voice-controlled 3D auditory battle game",
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#000000",
  "background_color": "#000000",
  "categories": ["games", "entertainment"]
}
```

### iOS-Specific Meta Tags

```html
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Phoneme-Mon">
```

### Installation Flow

1. User visits URL in browser
2. Browser detects PWA manifest
3. iOS: "Add to Home Screen" in Share menu
4. Android: Browser prompts "Install App"
5. App opens in standalone mode (no browser chrome)

---

## 🧪 TESTING INFRASTRUCTURE

### Backend Tests (`backend/tests/test_phonemon.py`)

**6 Test Cases:**
1. Health check endpoint
2. POST score creation
3. GET scores retrieval
4. POST room creation
5. Room existence check (valid code)
6. Room existence check (invalid code)

**Run:** `pytest backend/tests/ --verbose`

### Frontend Testing Strategy

**Headless Limitations:**
- Microphone not available → Cannot test audio detection
- Speech synthesis may not fire callbacks → Use timeouts
- WebRTC requires network → Mock P2P connections

**5 Test Iterations Documented:**
1. Initial flow testing (mode select, gender toggle)
2. Full e2e Solo Mode (calibration → battle → end)
3. Bug fix verification (canvas errors, RAF loop)
4. Round progression testing (10 rounds complete)
5. New features (tutorial, HP bars, timing)

### Test Data Generators

```javascript
// Create test score
POST /api/scores
{
  "player_title": "TEST_Champion",
  "personality": "rival",
  "rounds_won": 7,
  "rounds_lost": 3
}

// Create test room
POST /api/rooms
→ { "room_code": "XY3AU", "role": "host" }
```

---

## 🔄 CRITICAL DATA FLOWS

### Flow 1: Calibration → Battle

```
1. User selects mode + oracle → SET_ORACLE event
2. State machine → CALIBRATION
3. For each phoneme (Burst/Flow/Tone):
   a. Oracle says instruction
   b. startCalibrationRecording()
   c. Record 3s of audio features
   d. stopCalibrationRecording() → MFCC samples[]
   e. ADD_CALIBRATION_SAMPLE event
   f. NEXT_CALIBRATION_PHASE event
4. After 3 phases:
   a. averageMFCC(samples) → calibration fingerprint
   b. getDominantPhoneme() → assign player title
   c. Transition to BATTLE_LOOP or TUTORIAL
5. Store calibration in context.players[].calibration
```

### Flow 2: Battle Round Execution

```
1. BATTLE_LOOP state entry
2. Oracle narrates turn announcement
3. startListenWindow():
   a. setIsListening(true)
   b. Start 6s countdown
   c. Start feature detection interval (80ms)
   d. Update activePhoneme on detection
4. After 6s:
   a. Stop detection interval
   b. detectMove() → final classification
   c. COMMIT_MOVE event with { move, articulationScore }
5. State machine resolves:
   a. Solo: getEnemyMove(history, difficulty)
   b. PassPlay: Wait for 2nd player
   c. Online: Wait for remote DataChannel message
6. resolveRPS(move1, move2) → winner
7. Update health, scores, round count
8. Transition to RESULT_DISPLAY
9. After 5s → back to BATTLE_LOOP or END_GAME
```

### Flow 3: Online Multiplayer Setup

```
1. User clicks ONLINE DUEL
2. State machine → ONLINE_MATCHMAKING
3. Host path:
   a. Click "CREATE ROOM"
   b. POST /api/rooms → { room_code: "ABC12" }
   c. Display room code
   d. WebSocket connect to /api/ws/room/ABC12/host
   e. RTCPeerConnection.createOffer()
   f. Send offer via WebSocket
   g. Wait for answer from guest
   h. ICE candidates exchange
   i. DataChannel opens → ROOM_CONNECTED event
4. Guest path:
   a. Enter room code "ABC12"
   b. GET /api/rooms/ABC12/exists → { exists: true }
   c. WebSocket connect to /api/ws/room/ABC12/guest
   d. Receive offer from host via WebSocket
   e. RTCPeerConnection.createAnswer()
   f. Send answer via WebSocket
   g. ICE candidates exchange
   h. DataChannel opens → ROOM_CONNECTED event
5. Both players → CALIBRATION
6. During battle:
   a. Player makes move
   b. sendMove(phoneme, score) via DataChannel
   c. Opponent receives REMOTE_MOVE event
   d. Both resolve locally (no server)
```

---

## 🎨 DESIGN SYSTEM REFERENCE

### Z-Index Layers

| Layer | Z-Index | Components |
|-------|---------|------------|
| Canvas | 0 | CymaticsCanvas |
| Vignette | 10 | Noise overlay |
| UI Layer | 20-30 | Oracle, HUD, Viz |
| Modal | 50-60 | Calibration, Tutorial |
| Error | 200 | Mic error banner |

### Animation Keyframes

```css
@keyframes breathe {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.9; }
}

@keyframes hud-shake {
  0%, 100% { transform: translateX(0); }
  15% { transform: translateX(-6px); }
  30% { transform: translateX(5px); }
  /* ... */
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### Responsive Breakpoints

- Mobile: Default (portrait)
- Tablet: `md:` prefix (768px+)
- Desktop: Not primary target (game designed for mobile)

---

## 🚀 DEPLOYMENT & ENVIRONMENT

### Environment Variables

**Frontend (`.env` or Vite config):**
```
REACT_APP_BACKEND_URL=http://localhost:8000
```

**Backend (`.env`):**
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=phonemon
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### Build Commands

**Frontend:**
```bash
npm install
npm run build      # Production build
npm start          # Development server
```

**Backend:**
```bash
pip install -r requirements.txt
uvicorn server:app --reload  # Development
```

### Production Checklist

- [ ] CORS_ORIGINS configured for production domain
- [ ] MongoDB connection secured
- [ ] HTTPS enabled (required for getUserMedia on iOS)
- [ ] Service worker registered (PWA offline support)
- [ ] manifest.json icons generated (multiple sizes)
- [ ] Audio context unlock tested on iOS Safari

---

## 📊 KEY METRICS & CONSTANTS

### Timing Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `LISTEN_WINDOW_MS` | 6000 ms | Player phoneme input duration |
| `RESULT_DISPLAY_DELAY` | 5000 ms | Round result pause |
| `CALIBRATION_RECORD_DURATION` | 3000 ms | Per-phoneme calibration |
| `CALIBRATION_COUNTDOWN` | 1000 ms | 3-2-1 countdown |
| `STATE_UPDATE_INTERVAL` | 80 ms | React state throttle (12 Hz) |
| `FEATURE_BUFFER_FRAMES` | 15 | Audio feature rolling buffer |

### Audio Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `BUFFER_SIZE` | 512 | AudioWorklet FFT window |
| `SAMPLE_RATE` | 44100 Hz | Audio context sample rate |
| `MEL_FILTERS` | 26 | Mel-frequency filterbank |
| `MFCC_COEFFS` | 13 | MFCC feature dimensions |
| `FEATURE_POST_RATE` | ~43 Hz | AudioWorklet message rate |

### Game Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `MAX_HEALTH` | 10 HP | Starting health per player |
| `MAX_ROUNDS` | 10 | Maximum battle duration |
| `MARKOV_ORDER` | 2 | AI pattern history depth |
| `TOTAL_PARTICLES` | 5200 | Canvas particle limit |
| `MAX_PROFILES` | 6 | LocalStorage calibration profiles |

---

## 🐛 KNOWN ISSUES & LIMITATIONS

### Resolved (as of latest iteration)
- ✅ CymaticsCanvas hex-to-rgba color conversion bug
- ✅ 43Hz re-render cascade (throttled to 12Hz)
- ✅ Stale closures in battle effects
- ✅ Speech synthesis fallback timeouts
- ✅ Solo Mode AI opponent logic

### Current Limitations
- ⚠️ Headless testing cannot test microphone input
- ⚠️ Speech synthesis may fail silently on some devices
- ⚠️ WebRTC requires HTTPS in production
- ⚠️ Low contrast text in some UI areas (intentional aesthetic)
- ⚠️ Calibration accuracy depends on mic quality

### Future Enhancements (Backlog)
- Advanced phoneme tuning screen
- Profile selection UI in calibration
- Enemy AI personality variations
- Global leaderboard integration
- Customizable cymatics visualizer
- Animated GIF replay export

---

## 📚 DEPENDENCY VERSIONS

### Frontend Key Packages

```json
{
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "xstate": "^5.15.0",
  "@xstate/react": "^4.1.1",
  "react-router-dom": "^7.5.1",
  "lucide-react": "^0.507.0",
  "tailwindcss": "^3.4.17",
  "@radix-ui/react-*": "Various (Shadcn UI)"
}
```

### Backend Key Packages

```python
fastapi==0.110.1
uvicorn==0.25.0
pymongo==4.5.0
motor==3.3.1
pydantic>=2.6.4
```

---

## 🎓 LEARNING RESOURCES

### Understanding the Codebase

**Start Here (Reading Order):**
1. `memory/PRD.md` - Product requirements
2. `design_guidelines.json` - Design system
3. `frontend/src/machines/gameMachine.js` - Game state logic
4. `frontend/src/App.js` - Main component orchestration
5. `frontend/src/hooks/useAudioEngine.js` - Audio interface
6. `frontend/public/worklets/MeydaProcessor.js` - DSP kernel

**Key Concepts to Understand:**
- **XState Finite State Machines**: Explicit state transitions, no implicit state
- **AudioWorklets**: Separate audio thread for real-time processing
- **MFCC**: Mel-Frequency Cepstral Coefficients for voice fingerprinting
- **Markov Chains**: Probabilistic prediction based on historical patterns
- **WebRTC**: Peer-to-peer networking with STUN/ICE
- **RAF Optimization**: RequestAnimationFrame for smooth 60fps visuals

---

## 🔍 DEBUGGING GUIDE

### Common Issues

**Issue: "AudioWorklet not loading"**
- Check console for CORS errors
- Verify `/worklets/MeydaProcessor.js` path is correct
- Ensure `audioWorklet.addModule()` called after user gesture

**Issue: "Microphone not working"**
- Check browser console for getUserMedia errors
- Verify HTTPS (required on iOS)
- Test in different browser (Safari vs Chrome)
- Check system mic permissions

**Issue: "Speech synthesis not speaking"**
- Check `speechSynthesis.getVoices()` returns voices
- iOS: May require user interaction before first speak
- Add fallback timeout (already implemented)

**Issue: "Battle rounds not advancing"**
- Check XState DevTools (install extension)
- Verify `COMMIT_MOVE` event firing
- Check `pendingMoves` in context
- Look for state machine guards blocking transition

**Issue: "WebRTC connection fails"**
- Check WebSocket connection established
- Verify STUN servers accessible
- Test both host/guest roles
- Check browser console for ICE failures

### Debug Tools

**Browser Console:**
```javascript
// Access XState machine
window.DEBUG_STATE = state  // Set in App.js

// Check audio features
window.DEBUG_FEATURES = featuresRef.current

// Force state transition
send({ type: 'COMMIT_MOVE', move: 'burst', articulationScore: 0.5 })
```

**XState Inspector:**
```javascript
import { inspect } from '@xstate/inspect'

inspect({ iframe: false })  // Opens in new tab
```

---

## 📝 SUMMARY FOR LLM AGENTS

### Quick Reference Card

**What is Phoneme-Mon?**
Voice-controlled PWA battle game using phoneme classification (Burst/Flow/Tone) for Rock-Paper-Scissors combat.

**Tech Stack:**
React 18 + XState v5 + AudioWorklets + Canvas 2D + FastAPI + MongoDB

**Core Systems:**
1. **Audio Pipeline**: Mic → AudioWorklet → MFCC → Phoneme Classification
2. **State Machine**: XState FSM with 8 states (Boot → Battle → End)
3. **Enemy AI**: 2nd-order Markov chain with adaptive difficulty
4. **Multiplayer**: WebRTC P2P + WebSocket signaling relay
5. **Visuals**: 5200-particle cymatics canvas with RAF optimization

**Critical Files:**
- `frontend/src/App.js` - Main orchestrator
- `frontend/src/machines/gameMachine.js` - State logic
- `frontend/src/hooks/useAudioEngine.js` - Audio interface
- `frontend/public/worklets/MeydaProcessor.js` - DSP kernel
- `backend/server.py` - API + WebSocket relay

**Key Patterns:**
- Defensive try-catch on ALL external APIs (Web Audio, Speech, WebRTC)
- Ref-based optimization for high-frequency data (audio features)
- Throttled React state updates (43Hz → 12Hz)
- Timeout fallbacks for async operations

**Data Flow:**
Mic → AudioWorklet (43Hz) → useAudioEngine (12Hz) → Ref → XState Events → UI Update

**Testing:**
Backend: 6 pytest cases (scores, rooms)
Frontend: 5 documented test iterations (Solo Mode verified working)

---

## 📄 CHANGELOG

### Version History

**v1.0 (2026-03-04)** - Initial Release
- Core audio pipeline with MFCC-based phoneme classification
- Solo Mode with Markov AI
- Pass & Play local multiplayer
- Online PvP with WebRTC
- Cymatics visualization with 5200 particles
- 3 Oracle personalities × 2 genders
- Tutorial mode with interactive RPS diagram
- Battle replay export system

**Bug Fixes:**
- Fixed CymaticsCanvas hex-to-rgba conversion
- Fixed 43Hz re-render cascade (throttled to 12Hz)
- Fixed stale closures in battle effects
- Added speech synthesis fallback timeouts

---

## 🎯 CONCLUSION

This specification provides a complete architectural overview of Phoneme-Mon for LLM agents to understand:

1. **System Design**: Modular architecture with clear separation of concerns
2. **Data Flows**: How audio → features → classification → game logic → visuals
3. **State Management**: XState FSM with explicit transitions
4. **Performance**: RAF loops, ref optimization, throttling strategies
5. **Multiplayer**: WebRTC signaling and P2P data channels
6. **Error Handling**: Defensive programming with fallbacks
7. **Testing**: Documented test cases and known limitations

**Key Takeaway**: Phoneme-Mon is a highly technical, performance-optimized voice game that demonstrates advanced Web Audio API usage, real-time DSP, predictive AI, and peer-to-peer networking in a PWA context.
