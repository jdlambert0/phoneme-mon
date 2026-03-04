import React, { useState, useCallback } from 'react';

const BACKEND = process.env.REACT_APP_BACKEND_URL || '';

export default function OnlineMatchmaking({ onRoomReady, onBack, connectionStatus }) {
  const [mode, setMode]         = useState('choose'); // choose | hosting | joining
  const [code, setCode]         = useState('');
  const [inputCode, setInputCode] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const createRoom = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`${BACKEND}/api/rooms`, { method: 'POST' });
      const data = await res.json();
      setCode(data.room_code);
      setMode('hosting');
      onRoomReady({ roomCode: data.room_code, role: 'host' });
    } catch (e) {
      setError('Failed to create room. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [onRoomReady]);

  const joinRoom = useCallback(async () => {
    const clean = inputCode.trim().toUpperCase();
    if (clean.length < 5) { setError('Enter the full 5-character room code.'); return; }
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`${BACKEND}/api/rooms/${clean}/exists`);
      const data = await res.json();
      if (!data.exists) { setError('Room not found. Ask your opponent for the code.'); return; }
      onRoomReady({ roomCode: clean, role: 'guest' });
      setMode('joining');
    } catch (e) {
      setError('Connection failed. Try again.');
    } finally {
      setLoading(false);
    }
  }, [inputCode, onRoomReady]);

  const STATUS_COLOR = {
    idle: 'rgba(255,255,255,0.2)', connecting: '#FFD700',
    connected: '#00FF94', opponent_ready: '#00FF94', error: '#FF0055',
  };

  return (
    <div
      data-testid="online-matchmaking"
      style={{
        position: 'fixed', inset: 0, zIndex: 80,
        background: 'rgba(3,3,5,0.97)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: 32,
      }}
    >
      {/* Back */}
      <button
        data-testid="matchmaking-back"
        onClick={onBack}
        style={{
          position: 'absolute', top: 24, left: 24,
          fontFamily: 'Rajdhani', fontSize: 9, letterSpacing: 4,
          color: 'rgba(255,255,255,0.3)', background: 'transparent',
          border: 'none', cursor: 'pointer', textTransform: 'uppercase',
        }}
      >
        ← BACK
      </button>

      <div style={{ fontFamily: 'Rajdhani', fontSize: 9, letterSpacing: 5, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: 32 }}>
        ONLINE · VOICE DUEL
      </div>

      {mode === 'choose' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 320 }}>
          {/* Create room */}
          <button
            data-testid="create-room-btn"
            onClick={createRoom}
            disabled={loading}
            style={{
              fontFamily: 'Cinzel', fontSize: 13, letterSpacing: 4,
              color: '#FF2A6D', background: 'transparent',
              border: '1px solid rgba(255,42,109,0.3)',
              padding: '20px 32px', textTransform: 'uppercase', cursor: 'pointer',
              transition: 'border-color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#FF2A6D'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,42,109,0.3)'}
          >
            CREATE ROOM
            <div style={{ fontFamily: 'Manrope', fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>Host a duel — share the code</div>
          </button>

          {/* Join room */}
          <div style={{ border: '1px solid rgba(5,217,232,0.2)', padding: 20 }}>
            <div style={{ fontFamily: 'Cinzel', fontSize: 10, letterSpacing: 4, color: '#05D9E8', marginBottom: 12, textTransform: 'uppercase' }}>
              JOIN ROOM
            </div>
            <input
              data-testid="room-code-input"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase().slice(0, 5))}
              placeholder="ENTER CODE"
              maxLength={5}
              style={{
                width: '100%', background: 'transparent',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff', fontFamily: 'Cinzel', fontSize: 20,
                letterSpacing: 8, textAlign: 'center', padding: '12px 0',
                outline: 'none', marginBottom: 12,
              }}
            />
            <button
              data-testid="join-room-btn"
              onClick={joinRoom}
              disabled={loading || inputCode.length < 5}
              style={{
                width: '100%', fontFamily: 'Rajdhani', fontSize: 10, letterSpacing: 4,
                color: 'rgba(255,255,255,0.7)', background: 'transparent',
                border: '1px solid rgba(255,255,255,0.15)',
                padding: '12px 0', cursor: 'pointer', textTransform: 'uppercase',
                opacity: inputCode.length < 4 ? 0.4 : 1,
              }}
            >
              LINK →
            </button>
          </div>
        </div>
      )}

      {mode === 'hosting' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Rajdhani', fontSize: 9, letterSpacing: 4, color: 'rgba(255,255,255,0.3)', marginBottom: 16, textTransform: 'uppercase' }}>
            Room Code — Share with opponent
          </div>
          <div
            data-testid="room-code-display"
            style={{
              fontFamily: 'Cinzel', fontSize: 52, letterSpacing: 12,
              color: '#FF2A6D', textShadow: '0 0 40px #FF2A6D',
            }}
          >
            {code}
          </div>
          <div style={{
            marginTop: 32, fontFamily: 'Rajdhani', fontSize: 9, letterSpacing: 4,
            color: STATUS_COLOR[connectionStatus] || STATUS_COLOR.idle,
            textTransform: 'uppercase',
            animation: connectionStatus === 'connecting' ? 'breathe 1.5s ease infinite' : 'none',
          }}>
            {connectionStatus === 'connected' ? '● OPPONENT CONNECTED' : '○ WAITING FOR OPPONENT...'}
          </div>
        </div>
      )}

      {mode === 'joining' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Cinzel', fontSize: 28, letterSpacing: 4, color: '#05D9E8' }}>
            {inputCode}
          </div>
          <div style={{
            marginTop: 24, fontFamily: 'Rajdhani', fontSize: 9, letterSpacing: 4,
            color: STATUS_COLOR[connectionStatus] || STATUS_COLOR.idle, textTransform: 'uppercase',
          }}>
            {connectionStatus === 'connected' ? '● LINKED' : 'LINKING TO HOST...'}
          </div>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 20, fontFamily: 'Rajdhani', fontSize: 10, letterSpacing: 2, color: '#FF0055' }}>
          {error}
        </div>
      )}
    </div>
  );
}
