import React from 'react';

const PHONEME_COLORS = { burst: '#FF2A6D', flow: '#05D9E8', tone: '#D1F7FF' };

export default function EndGameScreen({ winner, players, finalScore, gameMode, onReplay, onShare, personality }) {
  const isP1Win = winner === 'p1';
  const isTie = winner === 'tie';
  const p1 = players?.[0] || { title: 'You' };
  const p2 = players?.[1] || { title: gameMode === 'passplay' ? 'Challenger' : 'Enemy' };

  const winnerName = isTie ? null : isP1Win ? p1.title : p2.title;
  const winnerColor = isP1Win ? '#FF2A6D' : isTie ? '#FFD700' : '#05D9E8';

  return (
    <div
      data-testid="end-game-screen"
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.95)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 32,
      }}
    >
      {/* Result label */}
      <div style={{
        fontFamily: 'Rajdhani, sans-serif', fontSize: 9,
        letterSpacing: 6, color: 'rgba(255,255,255,0.3)',
        textTransform: 'uppercase', marginBottom: 20,
      }}>
        {isTie ? 'STALEMATE' : isP1Win ? 'VICTORY' : 'DEFEAT'}
      </div>

      {/* Winner name */}
      <div style={{
        fontFamily: 'Cinzel, serif',
        fontSize: 'clamp(28px, 8vw, 52px)',
        color: winnerColor,
        letterSpacing: '0.15em',
        textShadow: `0 0 60px ${winnerColor}`,
        textAlign: 'center',
        marginBottom: 8,
      }}>
        {isTie ? 'EQUAL RESONANCE' : winnerName}
      </div>

      {!isTie && (
        <div style={{
          fontFamily: 'Rajdhani', fontSize: 9, letterSpacing: 4,
          color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: 48,
        }}>
          {isP1Win ? 'PHONEMIC DOMINANCE ACHIEVED' : 'ENEMY OVERCAME YOUR VOICE'}
        </div>
      )}

      {/* Score display */}
      <div style={{
        display: 'flex', gap: 48, alignItems: 'center', marginBottom: 64,
      }}>
        {[0, 1].map((i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: 'Cinzel, serif', fontSize: 36,
              color: i === 0 ? '#FF2A6D' : '#05D9E8',
              lineHeight: 1,
            }}>
              {finalScore?.[i] ?? 0}
            </div>
            <div style={{
              fontFamily: 'Rajdhani', fontSize: 8, letterSpacing: 3,
              color: 'rgba(255,255,255,0.3)', marginTop: 6, textTransform: 'uppercase',
            }}>
              {i === 0 ? (p1.title || 'Player 1') : (p2.title || (gameMode === 'passplay' ? 'Player 2' : 'Enemy'))}
            </div>
          </div>
        ))}
        <div style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'Cinzel', fontSize: 24 }}>vs</div>
      </div>

      {/* Replay */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          data-testid="replay-button"
          onClick={onReplay}
          style={{
            fontFamily: 'Rajdhani, sans-serif', fontSize: 11, letterSpacing: 6,
            color: 'rgba(255,255,255,0.7)', background: 'transparent',
            border: '1px solid rgba(255,255,255,0.15)', padding: '14px 40px',
            textTransform: 'uppercase', cursor: 'pointer',
            transition: 'border-color 0.2s ease, color 0.2s ease',
          }}
          onMouseEnter={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.5)'; e.target.style.color = '#fff'; }}
          onMouseLeave={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.15)'; e.target.style.color = 'rgba(255,255,255,0.7)'; }}
        >
          LINK AGAIN
        </button>

        {onShare && (
          <button
            data-testid="share-replay-button"
            onClick={onShare}
            style={{
              fontFamily: 'Rajdhani, sans-serif', fontSize: 11, letterSpacing: 6,
              color: '#05D9E8', background: 'transparent',
              border: '1px solid rgba(5,217,232,0.25)', padding: '14px 40px',
              textTransform: 'uppercase', cursor: 'pointer',
              transition: 'border-color 0.2s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#05D9E8'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(5,217,232,0.25)'}
          >
            SHARE REPLAY
          </button>
        )}
      </div>
    </div>
  );
}
