import React, { useEffect, useState, useRef } from 'react';

const PERSONALITY_COLORS = {
  mentor: '#D1F7FF',
  rival: '#FF2A6D',
  ancient: 'rgba(209,247,255,0.6)',
};

export const OracleDisplay = ({ text, personality = 'mentor', isActive = false }) => {
  const [displayText, setDisplayText] = useState('');
  const [charIndex, setCharIndex] = useState(0);
  const textRef = useRef(text);

  useEffect(() => {
    if (!text) { setDisplayText(''); setCharIndex(0); return; }
    textRef.current = text;
    setDisplayText('');
    setCharIndex(0);
  }, [text]);

  useEffect(() => {
    if (!textRef.current || charIndex >= textRef.current.length) return;
    const delay = personality === 'ancient' ? 55 : personality === 'rival' ? 22 : 35;
    const t = setTimeout(() => {
      setDisplayText(textRef.current.slice(0, charIndex + 1));
      setCharIndex((i) => i + 1);
    }, delay);
    return () => clearTimeout(t);
  }, [charIndex, personality]);

  const color = PERSONALITY_COLORS[personality] || '#ffffff';

  return (
    <div
      data-testid="oracle-display"
      aria-live="polite"
      aria-label={text}
      style={{
        position: 'fixed',
        top: '22%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '80%',
        maxWidth: 600,
        zIndex: 20,
        textAlign: 'center',
        pointerEvents: 'none',
        opacity: isActive ? 1 : 0,
        transition: 'opacity 0.5s ease',
      }}
    >
      {/* Personality label */}
      <div style={{
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: 9,
        letterSpacing: 5,
        color: 'rgba(255,255,255,0.3)',
        textTransform: 'uppercase',
        marginBottom: 12,
      }}>
        ORACLE · {personality.toUpperCase()}
      </div>

      {/* Main text */}
      <div style={{
        fontFamily: 'Cinzel, serif',
        fontSize: 'clamp(13px, 2.5vw, 20px)',
        lineHeight: 1.8,
        color,
        letterSpacing: 2,
        textShadow: `0 0 40px ${color}`,
        minHeight: 60,
      }}>
        {displayText}
        {charIndex < (text?.length || 0) && (
          <span style={{ opacity: 0.7, animation: 'cursorBlink 0.8s infinite' }}>_</span>
        )}
      </div>
    </div>
  );
};
