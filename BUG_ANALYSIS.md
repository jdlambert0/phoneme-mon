# Phoneme-Mon — Complete Bug Analysis & Fix Report

## Summary
**9 bugs found and fixed across 7 files.** 2 critical, 5 major, 2 minor.
The most impactful bug completely broke the game's core voice-detection mechanic.

---

## CRITICAL BUGS (Game-Breaking)

### BUG 1: `classifyPhoneme()` called with wrong argument type → ALL voice detection broken
**File:** `frontend/src/hooks/useAudioEngine.js` (line 102)
**Severity:** CRITICAL — Breaks the entire game
**Symptom:** Every player move defaults to 'burst' regardless of what sound is made
**Root cause:** `detectMove()` calls `classifyPhoneme(loudest, calibrationRef.current)` where
`loudest` is a **features object** (`{rms, zcr, mfcc, spectralCentroid, ...}`), but
`classifyPhoneme` expects an **MFCC array** (13-element number array). Inside classifyPhoneme,
`euclideanDist(loudest, centroid)` iterates `Math.min(loudest.length, centroid.length)` —
but objects have no `.length`, so `Math.min(undefined, 13) = NaN`, the loop never executes,
every distance = 0, and the first phoneme ('burst') always wins.
**Fix:** Changed to `classifyPhoneme(loudest.mfcc, calibrationRef.current)`
**Impact:** Voice-controlled RPS combat now actually classifies phonemes correctly.

### BUG 2: Online mode COMMIT_MOVE silently dropped → player's move never stored
**File:** `frontend/src/machines/gameMachine.js`
**Severity:** CRITICAL — Online mode completely broken
**Symptom:** Online player's actual phoneme input always treated as 'burst'
**Root cause:** `BATTLE_LOOP.on.COMMIT_MOVE` array only had guards for `solo` and `passplay`.
For `gameMode === 'online'`, no guard matches → event silently ignored by XState.
Player's move never stored in `pendingMoves[0]`. When REMOTE_MOVE arrives,
`context.pendingMoves[0] || 'burst'` always falls through to default.
**Fix:** Added online-mode COMMIT_MOVE handler that stores the move without resolving.
Resolution deferred to REMOTE_MOVE arrival, matching the intended WebRTC flow.

---

## MAJOR BUGS

### BUG 3: Mic init races with CalibrationScreen → calibration may collect zero samples
**File:** `frontend/src/App.js`
**Symptom:** On first play, calibration recording might capture nothing
**Root cause:** `handleOracleSelected` sent the state machine transition (`SET_ORACLE`)
BEFORE awaiting `audioEngine.initMic()`. The screen transitions to CALIBRATION
immediately, but the mic permission dialog may still be showing. If mic isn't ready
during the 3-second recording window, zero MFCC samples are collected.
**Fix:** Moved `await audioEngine.initMic()` before `send({ type: 'SET_ORACLE' })`.
The DiegeticInstall "confirming" animation covers the wait naturally.

### BUG 4: DiegeticInstall calls `onComplete` twice
**File:** `frontend/src/components/screens/DiegeticInstall.js`
**Symptom:** `handleOracleSelected` called twice → double mic init, potential state issues
**Root cause:** `selectPersonality` registers BOTH a speech-synthesis callback AND a
5-second fallback timeout, each calling `onComplete`. If speech finishes before 5s
(the common case), both fire.
**Fix:** Added `completedRef` guard — only the first call to `fireComplete` executes,
subsequent calls are no-ops. Fallback timeout is also cleared when speech fires.

### BUG 5: Online matchmaking stale closure never detects connection
**File:** `frontend/src/App.js`
**Symptom:** Always waits 30-second timeout instead of detecting WebRTC connection instantly
**Root cause:** `setInterval` inside the `onRoomReady` callback captures `rtcStatus` state
value from the render when the callback was created. React state is immutable within
a closure — `rtcStatus === 'connected'` will NEVER be true inside this stale closure.
**Fix:** Added `rtcStatusRef` (useRef) mirroring `rtcStatus`. The interval reads
`rtcStatusRef.current` which always reflects the latest value.

### BUG 6: AudioWorklet runs FFT ~345Hz instead of ~86Hz → severe mobile battery drain
**File:** `frontend/public/worklets/MeydaProcessor.js`
**Symptom:** Excessive CPU usage, battery drain on mobile devices
**Root cause:** `samplesWritten` counter is incremented on every `process()` call (128 samples)
but NEVER reset. After the first 512 samples, `samplesWritten >= BUFFER_SIZE` is permanently
true, so FFT + MFCC computation runs on every 128-sample quantum (~345Hz) instead of
every 512 samples (~86Hz). That's ~4x unnecessary CPU usage for DSP-heavy operations.
**Fix:** Reset `samplesWritten = 0` after feature extraction.

### BUG 7: TIMEOUT_MOVE breaks Pass & Play mode → P2 never gets a turn
**File:** `frontend/src/machines/gameMachine.js`
**Symptom:** If Player 1 times out, the round resolves immediately skipping Player 2
**Root cause:** `TIMEOUT_MOVE` was a single transition that always resolves the full round.
For passplay with `currentTurn === 0` (P1's turn), it assigns a default 'burst' for P1
and an AI move for P2, then transitions to RESULT_DISPLAY. P2 never gets to speak.
**Fix:** Made TIMEOUT_MOVE an array of guarded transitions. For passplay P1 timeout,
assigns default move and advances `currentTurn` to 1 (stays in BATTLE_LOOP for P2).
Other modes resolve normally.

---

## MINOR BUGS

### BUG 8: CymaticsCanvas doesn't spawn particles for repeated same-phoneme attacks
**File:** `frontend/src/components/game/CymaticsCanvas.js`
**Symptom:** burst → silence → burst: second burst has no visual particle effect
**Root cause:** `lastPhonemeRef` retains the previous phoneme value even during silence.
When the same phoneme is detected again, `activePhoneme === lastPhonemeRef.current`
is true, so the particle spawn effect is skipped.
**Fix:** Reset `lastPhonemeRef.current = null` when `activePhoneme` becomes falsy.

### BUG 9: EndGameScreen 'vs' appears after both scores instead of between them
**File:** `frontend/src/components/screens/EndGameScreen.js`
**Symptom:** Final score layout shows "3 5 vs" instead of "3 vs 5"
**Root cause:** 'vs' div was rendered as a third flex child AFTER the `.map([0,1])`
that creates both score elements.
**Fix:** Restructured to explicit P1 → VS → P2 order (no map loop).

### BUG 10 (bonus): Battle replay only records Player 1 moves
**File:** `frontend/src/App.js`
**Symptom:** Replay spectral PNG missing enemy/P2 move markers
**Root cause:** Only `ctx.pendingMoves?.[0]` was recorded; P2 data ignored.
**Fix:** Added `replay.recordMove(1, ...)` call for the opponent's move.

---

## Files Changed
| File | Changes |
|------|---------|
| `frontend/src/hooks/useAudioEngine.js` | Fix #1: Pass `.mfcc` to classifyPhoneme |
| `frontend/src/machines/gameMachine.js` | Fix #2: Online COMMIT_MOVE + Fix #7: Passplay TIMEOUT |
| `frontend/src/App.js` | Fix #3: Mic init order + Fix #5: rtcStatusRef + Fix #10: Replay |
| `frontend/src/components/screens/DiegeticInstall.js` | Fix #4: completedRef guard |
| `frontend/public/worklets/MeydaProcessor.js` | Fix #6: Reset samplesWritten |
| `frontend/src/components/game/CymaticsCanvas.js` | Fix #8: Reset lastPhonemeRef |
| `frontend/src/components/screens/EndGameScreen.js` | Fix #9: VS positioning |
