import React, { useEffect, useState, useCallback } from 'react';

const BACKEND = process.env.REACT_APP_BACKEND_URL || '';

const PERSONALITY_COLORS = {
  mentor: '#D1F7FF',
  rival: '#FF2A6D',
  ancient: 'rgba(209,247,255,0.6)',
};

/**
 * LeaderboardScreen — Displays top scores from /api/scores
 * Accessible from EndGameScreen and DiegeticInstall
 */
export default function LeaderboardScreen({ onClose }) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchScores = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND}/api/scores`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setScores(data);
    } catch (e) {
      console.warn('Failed to fetch scores:', e);
      setError('Could not connect to the leaderboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchScores(); }, [fetchScores]);

  return (
    <div
      data-testid="leaderboard-screen"
      style={{
        position: 'fixed', inset: 0, zIndex: 110,
        background: 'rgba(3,3,5,0.97)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 24px',
        overflow: 'auto',
      }}
    >
      {/* Close button */}
      <button
        data-testid="leaderboard-close"
        onClick={onClose}
        style={{
          position: 'absolute', top: 24, right: 24,
          fontFamily: 'Rajdhani', fontSize: 9, letterSpacing: 4,
          color: 'rgba(255,255,255,0.3)', background: 'transparent',
          border: 'none', cursor: 'pointer', textTransform: 'uppercase',
        }}
      >
        CLOSE ✕
      </button>

      <div style={{
        fontFamily: 'Rajdhani', fontSize: 9, letterSpacing: 6,
        color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 8,
      }}>
        GLOBAL
      </div>

      <div style={{
        fontFamily: 'Cinzel', fontSize: 'clamp(20px, 5vw, 32px)',
        color: '#D1F7FF', letterSpacing: 6,
        textShadow: '0 0 40px rgba(209,247,255,0.3)',
        marginBottom: 40,
      }}>
        LEADERBOARD
      </div>

      {loading && (
        <div style={{
          fontFamily: 'Rajdhani', fontSize: 10, letterSpacing: 4,
          color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase',
          animation: 'breathe 1.5s ease infinite',
        }}>
          LINKING TO GRID...
        </div>
      )}

      {error && (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: 'Rajdhani', fontSize: 10, letterSpacing: 3,
            color: '#FF0055', marginBottom: 16,
          }}>
            {error}
          </div>
          <button
            onClick={fetchScores}
            style={{
              fontFamily: 'Rajdhani', fontSize: 10, letterSpacing: 4,
              color: 'rgba(255,255,255,0.5)', background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)',
              padding: '10px 24px', cursor: 'pointer', textTransform: 'uppercase',
            }}
          >
            RETRY
          </button>
        </div>
      )}

      {!loading && !error && scores.length === 0 && (
        <div style={{
          fontFamily: 'Manrope', fontSize: 12, color: 'rgba(255,255,255,0.35)',
          textAlign: 'center', marginTop: 24,
        }}>
          No battles recorded yet. Be the first to link your voice.
        </div>
      )}

      {!loading && !error && scores.length > 0 && (
        <div style={{ width: '100%', maxWidth: 480 }}>
          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '28px 1fr 72px 60px',
            gap: 8, padding: '0 12px 8px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            {['#', 'VOICE TITLE', 'SCORE', 'ORACLE'].map(label => (
              <div key={label} style={{
                fontFamily: 'Rajdhani', fontSize: 8, letterSpacing: 3,
                color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase',
              }}>
                {label}
              </div>
            ))}
          </div>

          {/* Rows */}
          {scores.map((score, i) => {
            const isTop3 = i < 3;
            const rankColor = i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'rgba(255,255,255,0.35)';
            const personalityColor = PERSONALITY_COLORS[score.personality] || '#D1F7FF';
            const winRate = score.rounds_won + score.rounds_lost > 0
              ? Math.round((score.rounds_won / (score.rounds_won + score.rounds_lost)) * 100)
              : 0;

            return (
              <div
                key={score.id || i}
                data-testid={`leaderboard-row-${i}`}
                style={{
                  display: 'grid', gridTemplateColumns: '28px 1fr 72px 60px',
                  gap: 8, padding: '10px 12px',
                  alignItems: 'center',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  background: isTop3 ? `rgba(${i === 0 ? '255,215,0' : i === 1 ? '192,192,192' : '205,127,50'},0.03)` : 'transparent',
                }}
              >
                {/* Rank */}
                <div style={{
                  fontFamily: 'Cinzel', fontSize: isTop3 ? 16 : 12,
                  color: rankColor, fontWeight: isTop3 ? 700 : 400,
                  textShadow: isTop3 ? `0 0 8px ${rankColor}40` : 'none',
                }}>
                  {i + 1}
                </div>

                {/* Title */}
                <div>
                  <div style={{
                    fontFamily: 'Cinzel', fontSize: 12, color: 'rgba(255,255,255,0.8)',
                    letterSpacing: 2,
                  }}>
                    {score.player_title}
                  </div>
                  <div style={{
                    fontFamily: 'Rajdhani', fontSize: 8, color: 'rgba(255,255,255,0.2)',
                    letterSpacing: 2, marginTop: 2,
                  }}>
                    {winRate}% WIN RATE
                  </div>
                </div>

                {/* Score */}
                <div style={{
                  fontFamily: 'Rajdhani', fontSize: 13, fontWeight: 700,
                  color: isTop3 ? '#00FF94' : 'rgba(255,255,255,0.6)',
                  letterSpacing: 2,
                }}>
                  {score.rounds_won}W / {score.rounds_lost}L
                </div>

                {/* Oracle personality */}
                <div style={{
                  fontFamily: 'Rajdhani', fontSize: 8, letterSpacing: 2,
                  color: personalityColor, textTransform: 'uppercase',
                }}>
                  {score.personality || 'MENTOR'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
