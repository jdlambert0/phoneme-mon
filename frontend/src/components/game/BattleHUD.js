import React, { useEffect, useState } from 'react';

const PHONEME_COLORS = {
  burst: '#FF2A6D',
  flow: '#05D9E8',
  tone: '#D1F7FF',
};

const MOVE_LABELS = { burst: 'BURST', flow: 'FLOW', tone: 'TONE', null: '—' };
const MOVE_DESC = {
  burst: 'beats Flow',
  flow: 'beats Tone',
  tone: 'beats Burst',
};

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

  useEffect(() => {
    if (!roundWinner) return;
    setFlash(roundWinner);
    const t = setTimeout(() => setFlash(null), 600);
    return () => clearTimeout(t);
  }, [roundWinner, round]);

  const p1 = players[0] || { title: 'You', calibration: null };
  const p2 = players[1] || { title: gameMode === 'passplay' ? 'Challenger' : 'ENEMY' };

  const renderBar = (health, maxHp, side) => {
    const pct = Math.max(0, (health / maxHp) * 100);
    const color = health > maxHp * 0.5 ? '#00FF94' : health > maxHp * 0.25 ? '#FFD700' : '#FF0055';
    return (
      <div className="flex flex-col gap-1" style={{ width: 120 }}>
        <div style={{
          height: 4, background: 'rgba(255,255,255,0.1)',
          borderRadius: 2, overflow: 'hidden'
        }}>
          <div style={{
            width: `${pct}%`, height: '100%', background: color,
            transition: 'width 0.4s ease, background-color 0.4s ease',
            boxShadow: `0 0 8px ${color}`,
          }} />
        </div>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontFamily: 'Rajdhani, sans-serif', textTransform: 'uppercase', letterSpacing: 2 }}>
          {health}/{maxHp}
        </span>
      </div>
    );
  };

  return (
    <>
      {/* Top-left: P1 */}
      <div
        data-testid="hud-player1"
        style={{
          position: 'fixed', top: 24, left: 24, zIndex: 30,
          animation: flash === 'p1' ? 'hudFlash 0.3s ease' : flash === 'p2' ? 'hudDim 0.3s ease' : 'none',
        }}
      >
        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 10, letterSpacing: 3, color: '#FF2A6D', textTransform: 'uppercase', marginBottom: 4 }}>
          {p1.title}
        </div>
        {renderBar(playerHealth[0], maxHealth, 'left')}
        {glassDaggerActive[0] && (
          <div style={{ marginTop: 4, fontSize: 9, color: '#FFD700', fontFamily: 'Rajdhani', letterSpacing: 2 }}>
            ◆ GLASS DAGGER
          </div>
        )}
      </div>

      {/* Top-right: P2 / Enemy */}
      <div
        data-testid="hud-player2"
        style={{
          position: 'fixed', top: 24, right: 24, zIndex: 30, textAlign: 'right',
          animation: flash === 'p2' ? 'hudFlash 0.3s ease' : flash === 'p1' ? 'hudDim 0.3s ease' : 'none',
        }}
      >
        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 10, letterSpacing: 3, color: '#05D9E8', textTransform: 'uppercase', marginBottom: 4 }}>
          {p2.title}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          {renderBar(playerHealth[1], maxHealth, 'right')}
        </div>
      </div>

      {/* Center-top: Round */}
      <div
        data-testid="hud-round"
        style={{
          position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 30, textAlign: 'center',
        }}
      >
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: 4, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>
          ROUND {round} / {maxRounds}
        </div>
      </div>

      {/* Bottom: Last moves */}
      {(pendingMoves[0] || pendingMoves[1]) && (
        <div
          data-testid="hud-moves"
          style={{
            position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
            zIndex: 30, display: 'flex', gap: 32, alignItems: 'center',
          }}
        >
          {[0, 1].map((i) => {
            const move = pendingMoves[i];
            const color = move ? PHONEME_COLORS[move] : 'rgba(255,255,255,0.15)';
            return (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: 'Cinzel, serif', fontSize: 18, color, letterSpacing: 4,
                  textShadow: move ? `0 0 20px ${color}` : 'none',
                  transition: 'color 0.3s ease',
                }}>
                  {MOVE_LABELS[move] || '—'}
                </div>
                <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', fontFamily: 'Rajdhani', letterSpacing: 2, marginTop: 2 }}>
                  {i === 0 ? (players[0]?.title || 'YOU') : (gameMode === 'passplay' ? players[1]?.title || 'P2' : 'ENEMY')}
                </div>
              </div>
            );
          })}
          <div style={{
            position: 'absolute', left: '50%', transform: 'translateX(-50%)',
            fontFamily: 'Rajdhani', fontSize: 9, letterSpacing: 3,
            color: roundWinner === 'tie' ? '#FFD700' : roundWinner === 'p1' ? '#00FF94' : '#FF0055',
            top: -20,
          }}>
            {roundWinner === 'tie' ? 'STALEMATE' : roundWinner === 'p1' ? 'VICTORY' : roundWinner === 'p2' ? 'DEFEAT' : ''}
          </div>
        </div>
      )}

      {/* Turn indicator for PassPlay */}
      {gameMode === 'passplay' && (
        <div
          data-testid="hud-turn"
          style={{
            position: 'fixed', bottom: 60, left: '50%', transform: 'translateX(-50%)',
            fontFamily: 'Rajdhani', fontSize: 9, letterSpacing: 4,
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
