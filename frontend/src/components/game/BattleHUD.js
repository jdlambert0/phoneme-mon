import React, { useEffect, useState, useRef } from 'react';

const PHONEME_COLORS = {
  burst: '#FF2A6D',
  flow: '#05D9E8',
  tone: '#D1F7FF',
};

const MOVE_LABELS = { burst: 'BURST', flow: 'FLOW', tone: 'TONE', null: '--' };

export const BattleHUD = ({
  playerHealth = [10, 10],
  maxHealth = 10,
  round = 0,
  maxRounds = 10,
  gameMode = 'solo',
  currentTurn = 0,
  pendingMoves = [null, null],
  roundWinner = null,
  glassDaggerActive = [false, false],
  players = [],
}) => {
  const [flash, setFlash] = useState(null);
  const [shakeP1, setShakeP1] = useState(false);
  const [shakeP2, setShakeP2] = useState(false);
  const prevHealthRef = useRef([...playerHealth]);

  // Detect health changes and trigger shake animation
  useEffect(() => {
    const prev = prevHealthRef.current;
    if (prev[0] > playerHealth[0]) {
      setShakeP1(true);
      setTimeout(() => setShakeP1(false), 500);
    }
    if (prev[1] > playerHealth[1]) {
      setShakeP2(true);
      setTimeout(() => setShakeP2(false), 500);
    }
    prevHealthRef.current = [...playerHealth];
  }, [playerHealth]);

  useEffect(() => {
    if (!roundWinner) return;
    setFlash(roundWinner);
    const t = setTimeout(() => setFlash(null), 800);
    return () => clearTimeout(t);
  }, [roundWinner, round]);

  const p1 = players[0] || { title: 'You', calibration: null };
  const p2 = players[1] || { title: gameMode === 'passplay' ? 'Challenger' : 'ENEMY' };

  const renderHealthBar = (health, maxHp, isShaking, side) => {
    const pct = Math.max(0, (health / maxHp) * 100);
    const barColor = health > maxHp * 0.5 ? '#00FF94' : health > maxHp * 0.25 ? '#FFD700' : '#FF0055';
    const isRight = side === 'right';

    return (
      <div style={{
        width: '100%', maxWidth: 200,
        animation: isShaking ? 'hud-shake 0.4s ease' : 'none',
      }}>
        {/* Health bar track */}
        <div style={{
          height: 14, background: 'rgba(255,255,255,0.06)',
          borderRadius: 3, overflow: 'hidden', position: 'relative',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          {/* Filled bar */}
          <div style={{
            position: 'absolute',
            top: 0, bottom: 0,
            [isRight ? 'right' : 'left']: 0,
            width: `${pct}%`,
            background: `linear-gradient(${isRight ? '270deg' : '90deg'}, ${barColor}, ${barColor}88)`,
            transition: 'width 0.6s ease-out',
            boxShadow: `0 0 12px ${barColor}60, inset 0 1px 0 rgba(255,255,255,0.15)`,
            borderRadius: 2,
          }} />
          {/* Damage flash overlay */}
          {isShaking && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(255,255,255,0.5)',
              animation: 'hud-flash-fade 0.4s ease forwards',
              borderRadius: 2,
            }} />
          )}
          {/* Segment lines for each HP point */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
            {Array.from({ length: maxHp - 1 }).map((_, i) => (
              <div key={i} style={{
                flex: 1, borderRight: '1px solid rgba(0,0,0,0.3)',
              }} />
            ))}
            <div style={{ flex: 1 }} />
          </div>
        </div>
        {/* HP number */}
        <div style={{
          fontFamily: 'Rajdhani, sans-serif', fontSize: 12, fontWeight: 700,
          color: barColor, letterSpacing: 2,
          textAlign: isRight ? 'right' : 'left', marginTop: 4,
          textShadow: `0 0 8px ${barColor}60`,
        }}>
          {health} / {maxHp}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* CSS animations */}
      <style>{`
        @keyframes hud-shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-6px); }
          30% { transform: translateX(5px); }
          45% { transform: translateX(-4px); }
          60% { transform: translateX(3px); }
          75% { transform: translateX(-2px); }
        }
        @keyframes hud-flash-fade {
          0% { opacity: 0.6; }
          100% { opacity: 0; }
        }
        @keyframes hud-result-enter {
          0% { opacity: 0; transform: translate(-50%, 10px) scale(0.8); }
          100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
      `}</style>

      {/* Top-left: P1 */}
      <div
        data-testid="hud-player1"
        style={{
          position: 'fixed', top: 20, left: 20, zIndex: 30, width: 200,
        }}
      >
        <div style={{
          fontFamily: 'Rajdhani, sans-serif', fontSize: 11, letterSpacing: 3,
          color: '#FF2A6D', textTransform: 'uppercase', marginBottom: 6, fontWeight: 600,
        }}>
          {p1.title}
        </div>
        {renderHealthBar(playerHealth[0], maxHealth, shakeP1, 'left')}
        {glassDaggerActive[0] && (
          <div style={{ marginTop: 6, fontSize: 9, color: '#FFD700', fontFamily: 'Rajdhani', letterSpacing: 2 }}>
            GLASS DAGGER ACTIVE
          </div>
        )}
      </div>

      {/* Top-right: P2 / Enemy */}
      <div
        data-testid="hud-player2"
        style={{
          position: 'fixed', top: 20, right: 20, zIndex: 30, width: 200, textAlign: 'right',
        }}
      >
        <div style={{
          fontFamily: 'Rajdhani, sans-serif', fontSize: 11, letterSpacing: 3,
          color: '#05D9E8', textTransform: 'uppercase', marginBottom: 6, fontWeight: 600,
        }}>
          {p2.title}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          {renderHealthBar(playerHealth[1], maxHealth, shakeP2, 'right')}
        </div>
      </div>

      {/* Center-top: Round */}
      <div
        data-testid="hud-round"
        style={{
          position: 'fixed', top: 22, left: '50%', transform: 'translateX(-50%)',
          zIndex: 30, textAlign: 'center',
        }}
      >
        <div style={{
          fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: 4,
          color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase',
        }}>
          ROUND {round} / {maxRounds}
        </div>
      </div>

      {/* Bottom-center: Move result display */}
      {(pendingMoves[0] || pendingMoves[1]) && (
        <div
          data-testid="hud-moves"
          style={{
            position: 'fixed', bottom: 110, left: '50%', transform: 'translateX(-50%)',
            zIndex: 30, textAlign: 'center',
            animation: 'hud-result-enter 0.4s ease',
          }}
        >
          {/* Result label */}
          {roundWinner && (
            <div style={{
              fontFamily: 'Rajdhani', fontSize: 12, letterSpacing: 5, fontWeight: 700,
              color: roundWinner === 'tie' ? '#FFD700' : roundWinner === 'p1' ? '#00FF94' : '#FF0055',
              marginBottom: 12, textTransform: 'uppercase',
              textShadow: `0 0 12px ${roundWinner === 'tie' ? '#FFD700' : roundWinner === 'p1' ? '#00FF94' : '#FF0055'}60`,
            }}>
              {roundWinner === 'tie' ? 'STALEMATE' : roundWinner === 'p1' ? 'VICTORY' : 'DEFEAT'}
            </div>
          )}

          {/* Moves side-by-side */}
          <div style={{ display: 'flex', gap: 40, alignItems: 'center', justifyContent: 'center' }}>
            {[0, 1].map((i) => {
              const move = pendingMoves[i];
              const color = move ? PHONEME_COLORS[move] : 'rgba(255,255,255,0.15)';
              const isWinner = (roundWinner === 'p1' && i === 0) || (roundWinner === 'p2' && i === 1);
              return (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{
                    fontFamily: 'Cinzel, serif', fontSize: 20, color, letterSpacing: 4,
                    textShadow: isWinner ? `0 0 24px ${color}` : move ? `0 0 12px ${color}80` : 'none',
                    transition: 'all 0.3s ease',
                    transform: isWinner ? 'scale(1.15)' : 'scale(1)',
                  }}>
                    {MOVE_LABELS[move] || '--'}
                  </div>
                  <div style={{
                    fontSize: 9, color: 'rgba(255,255,255,0.35)',
                    fontFamily: 'Rajdhani', letterSpacing: 2, marginTop: 4,
                  }}>
                    {i === 0 ? (players[0]?.title || 'YOU') : (gameMode === 'passplay' ? players[1]?.title || 'P2' : 'ENEMY')}
                  </div>
                </div>
              );
            })}

            {/* VS separator */}
            <div style={{
              position: 'absolute', left: '50%', top: '50%',
              transform: 'translate(-50%, -50%)',
              fontFamily: 'Rajdhani', fontSize: 9, letterSpacing: 3,
              color: 'rgba(255,255,255,0.2)',
            }}>
              VS
            </div>
          </div>
        </div>
      )}

      {/* Turn indicator for PassPlay */}
      {gameMode === 'passplay' && (
        <div
          data-testid="hud-turn"
          style={{
            position: 'fixed', bottom: 60, left: '50%', transform: 'translateX(-50%)',
            fontFamily: 'Rajdhani', fontSize: 10, letterSpacing: 4,
            color: currentTurn === 0 ? '#FF2A6D' : '#05D9E8',
            zIndex: 30, textTransform: 'uppercase',
          }}
        >
          {currentTurn === 0 ? (players[0]?.title || 'Player 1') : (players[1]?.title || 'Player 2')} — SPEAK NOW
        </div>
      )}
    </>
  );
};
