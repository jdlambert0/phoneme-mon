import React, { useRef, useCallback } from 'react';

export default function BootScreen({ onTouch }) {
  const firedRef = useRef(false);
  const handleInteraction = useCallback((e) => {
    if (firedRef.current) return;
    firedRef.current = true;
    e.preventDefault();
    onTouch();
  }, [onTouch]);

  return (
    <div
      data-testid="boot-screen"
      onClick={handleInteraction}
      onTouchStart={handleInteraction}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: '#000000',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', userSelect: 'none',
      }}
    >
      {/* Geometric rune */}
      <div style={{ position: 'relative', width: 120, height: 120, marginBottom: 48 }}>
        <svg viewBox="0 0 120 120" width={120} height={120}>
          {/* Outer ring */}
          <circle cx={60} cy={60} r={54} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
          {/* Inner pentagon */}
          {[0,1,2,3,4].map((i) => {
            const a = (i * 72 - 90) * Math.PI / 180;
            const b = ((i + 1) * 72 - 90) * Math.PI / 180;
            return (
              <line key={i}
                x1={60 + 38 * Math.cos(a)} y1={60 + 38 * Math.sin(a)}
                x2={60 + 38 * Math.cos(b)} y2={60 + 38 * Math.sin(b)}
                stroke="rgba(255,255,255,0.25)" strokeWidth={1}
              />
            );
          })}
          {/* Pentagram diagonals */}
          {[0,1,2,3,4].map((i) => {
            const a = (i * 72 - 90) * Math.PI / 180;
            const b = ((i + 2) * 72 - 90) * Math.PI / 180;
            return (
              <line key={`d${i}`}
                x1={60 + 38 * Math.cos(a)} y1={60 + 38 * Math.sin(a)}
                x2={60 + 38 * Math.cos(b)} y2={60 + 38 * Math.sin(b)}
                stroke="rgba(255,255,255,0.12)" strokeWidth={0.5}
              />
            );
          })}
          {/* Center dot */}
          <circle cx={60} cy={60} r={4} fill="rgba(255,255,255,0.6)" className="pulse-dot" />
          {/* Breathing ring */}
          <circle cx={60} cy={60} r={22} fill="none" stroke="rgba(209,247,255,0.15)" strokeWidth={1} className="breathe-ring" />
        </svg>
      </div>

      {/* PHONEME-MON */}
      <div style={{
        fontFamily: 'Cinzel, serif',
        fontSize: 'clamp(18px, 5vw, 36px)',
        letterSpacing: '0.3em',
        color: 'rgba(255,255,255,0.85)',
        textTransform: 'uppercase',
        marginBottom: 12,
      }}>
        Phoneme-Mon
      </div>

      <div style={{
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: 10,
        letterSpacing: 6,
        color: 'rgba(255,255,255,0.25)',
        textTransform: 'uppercase',
        marginBottom: 64,
      }}>
        Voice Combat System
      </div>

      {/* Touch prompt */}
      <div
        data-testid="touch-to-link"
        style={{
          fontFamily: 'Rajdhani, sans-serif',
          fontSize: 11,
          letterSpacing: 8,
          color: 'rgba(255,255,255,0.5)',
          textTransform: 'uppercase',
          animation: 'breathe 3s ease-in-out infinite',
        }}
      >
        TOUCH TO LINK
      </div>

      {/* Background texture */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: -1, pointerEvents: 'none',
        backgroundImage: `radial-gradient(ellipse at 50% 50%, rgba(20,10,40,0.5) 0%, rgba(0,0,0,1) 70%)`,
      }} />
    </div>
  );
}
