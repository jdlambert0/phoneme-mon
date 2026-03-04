import React, { useEffect, useState } from 'react';

const PHONEME_COLORS = {
  burst: '#FF2A6D',
  flow: '#05D9E8',
  tone: '#D1F7FF',
};

export const VoiceInputViz = ({ features, detectedPhoneme, isListening = false }) => {
  const [displayRms, setDisplayRms] = useState(0);

  useEffect(() => {
    const target = features?.rms || 0;
    setDisplayRms((prev) => prev + (target - prev) * 0.25);
  }, [features]);

  const radius = 28 + displayRms * 120;
  const color = detectedPhoneme ? PHONEME_COLORS[detectedPhoneme] : '#ffffff';
  const rings = [1.8, 2.6, 3.5];

  if (!isListening) return null;

  return (
    <div
      data-testid="voice-input-viz"
      style={{
        position: 'fixed',
        bottom: 48,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 30,
        pointerEvents: 'none',
        width: 80,
        height: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width={80} height={80} viewBox="-40 -40 80 80" overflow="visible">
        {/* Outer rings */}
        {rings.map((scale, i) => (
          <circle
            key={i}
            cx={0} cy={0}
            r={radius * scale}
            fill="none"
            stroke={color}
            strokeWidth={0.5}
            opacity={Math.max(0, 0.25 - i * 0.08) * (displayRms * 10)}
          />
        ))}

        {/* Core circle */}
        <circle
          cx={0} cy={0} r={radius}
          fill={color}
          opacity={0.15 + displayRms * 0.4}
        />
        <circle
          cx={0} cy={0} r={Math.max(4, radius * 0.4)}
          fill={color}
          opacity={0.8}
        />

        {/* Phoneme label */}
        {detectedPhoneme && (
          <text
            textAnchor="middle"
            y={radius + 20}
            fill={color}
            fontSize={8}
            letterSpacing={3}
            fontFamily="Rajdhani, sans-serif"
            style={{ textTransform: 'uppercase' }}
          >
            {detectedPhoneme.toUpperCase()}
          </text>
        )}
      </svg>
    </div>
  );
};
