import React, { useEffect, useRef } from 'react';

const PHONEME_COLORS = {
  burst: '#FF2A6D',
  flow: '#05D9E8',
  tone: '#D1F7FF',
};

/**
 * VoiceInputViz — Uses RAF to poll featuresRef directly,
 * avoiding React re-renders on every audio frame.
 */
export const VoiceInputViz = ({ featuresRef, detectedPhoneme, isListening = false }) => {
  const rmsRef = useRef(0);
  const rafRef = useRef(null);
  const svgRef = useRef(null);
  const coreRef = useRef(null);
  const innerRef = useRef(null);
  const labelRef = useRef(null);
  const ringsRef = useRef([]);

  useEffect(() => {
    if (!isListening) {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    const animate = () => {
      const features = featuresRef?.current;
      const target = features?.rms || 0;
      // Smooth interpolation
      rmsRef.current += (target - rmsRef.current) * 0.25;
      const r = 28 + rmsRef.current * 120;
      const color = detectedPhoneme ? (PHONEME_COLORS[detectedPhoneme] || '#ffffff') : '#ffffff';
      const scales = [1.8, 2.6, 3.5];

      // Update DOM directly (no React re-render)
      if (coreRef.current) {
        coreRef.current.setAttribute('r', r);
        coreRef.current.setAttribute('fill', color);
        coreRef.current.setAttribute('opacity', 0.15 + rmsRef.current * 0.4);
      }
      if (innerRef.current) {
        innerRef.current.setAttribute('r', Math.max(4, r * 0.4));
        innerRef.current.setAttribute('fill', color);
      }
      for (let i = 0; i < ringsRef.current.length; i++) {
        const ring = ringsRef.current[i];
        if (ring) {
          ring.setAttribute('r', r * scales[i]);
          ring.setAttribute('stroke', color);
          ring.setAttribute('opacity', Math.max(0, 0.25 - i * 0.08) * (rmsRef.current * 10));
        }
      }
      if (labelRef.current) {
        labelRef.current.textContent = detectedPhoneme ? detectedPhoneme.toUpperCase() : '';
        labelRef.current.setAttribute('y', r + 20);
        labelRef.current.setAttribute('fill', color);
      }

      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isListening, detectedPhoneme, featuresRef]);

  if (!isListening) return null;

  return (
    <div
      data-testid="voice-input-viz"
      style={{
        position: 'fixed', bottom: 48, left: '50%', transform: 'translateX(-50%)',
        zIndex: 30, pointerEvents: 'none', width: 80, height: 80,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <svg ref={svgRef} width={80} height={80} viewBox="-40 -40 80 80" overflow="visible">
        <circle ref={el => (ringsRef.current[0] = el)} cx={0} cy={0} r={50} fill="none" stroke="#fff" strokeWidth={0.5} opacity={0} />
        <circle ref={el => (ringsRef.current[1] = el)} cx={0} cy={0} r={73} fill="none" stroke="#fff" strokeWidth={0.5} opacity={0} />
        <circle ref={el => (ringsRef.current[2] = el)} cx={0} cy={0} r={98} fill="none" stroke="#fff" strokeWidth={0.5} opacity={0} />
        <circle ref={coreRef} cx={0} cy={0} r={28} fill="#ffffff" opacity={0.15} />
        <circle ref={innerRef} cx={0} cy={0} r={11} fill="#ffffff" opacity={0.8} />
        <text ref={labelRef} textAnchor="middle" y={48} fill="#ffffff" fontSize={8} letterSpacing={3} fontFamily="Rajdhani, sans-serif" />
      </svg>
    </div>
  );
};
