import React, { useState, useEffect, useRef } from 'react';

/**
 * ListenCountdown — Shows remaining seconds during listen window + "SPEAK NOW" pulse.
 */
export const ListenCountdown = ({ isListening, durationMs = 6000 }) => {
  const [remaining, setRemaining] = useState(0);
  const startTimeRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!isListening) {
      cancelAnimationFrame(rafRef.current);
      setRemaining(0);
      return;
    }
    startTimeRef.current = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const left = Math.max(0, durationMs - elapsed);
      setRemaining(left);
      if (left > 0) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isListening, durationMs]);

  if (!isListening || remaining <= 0) return null;

  const secs = Math.ceil(remaining / 1000);
  const pct = remaining / durationMs;

  return (
    <div
      data-testid="listen-countdown"
      style={{
        position: 'fixed', top: 52, left: '50%', transform: 'translateX(-50%)',
        zIndex: 35, textAlign: 'center',
      }}
    >
      {/* Circular progress */}
      <svg width={52} height={52} viewBox="0 0 52 52" style={{ marginBottom: 4 }}>
        <circle cx={26} cy={26} r={22} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={2} />
        <circle
          cx={26} cy={26} r={22} fill="none"
          stroke={pct > 0.5 ? '#05D9E8' : pct > 0.25 ? '#FFD700' : '#FF0055'}
          strokeWidth={2}
          strokeDasharray={138.23}
          strokeDashoffset={138.23 * (1 - pct)}
          strokeLinecap="round"
          transform="rotate(-90 26 26)"
          style={{ transition: 'stroke 0.3s ease' }}
        />
        <text
          x={26} y={28} textAnchor="middle"
          style={{ fontFamily: 'Rajdhani', fontSize: 16, fontWeight: 700, fill: '#D1F7FF' }}
        >
          {secs}
        </text>
      </svg>
      {/* SPEAK NOW label */}
      <div style={{
        fontFamily: 'Rajdhani', fontSize: 9, letterSpacing: 4,
        color: '#05D9E8', textTransform: 'uppercase',
        animation: 'breathe 1.5s ease infinite',
      }}>
        SPEAK NOW
      </div>
    </div>
  );
};
