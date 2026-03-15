import React, { useState, useEffect, useRef, useCallback } from 'react';
import { classifyPhoneme } from '../../utils/dspMath';

const PHONEMES = [
  { id: 'burst', label: 'BURST', color: '#FF2A6D' },
  { id: 'flow',  label: 'FLOW',  color: '#05D9E8' },
  { id: 'tone',  label: 'TONE',  color: '#D1F7FF' },
];

/**
 * PhonemeTuneScreen — Advanced phoneme detection tuning
 * Live visualization of MFCC distances to each calibration centroid.
 * Players can see in real-time how their voice maps to each phoneme.
 */
export default function PhonemeTuneScreen({ calibration, featuresRef, onClose, onRecalibrate }) {
  const [liveResult, setLiveResult] = useState(null);
  const [sensitivity, setSensitivity] = useState(0.7); // 0-1 threshold multiplier
  const [history, setHistory] = useState([]); // Last N classifications
  const rafRef = useRef(null);
  const historyMaxLen = 30;

  // Poll features at ~15Hz for live classification
  useEffect(() => {
    if (!calibration) return;

    let lastUpdate = 0;
    const poll = () => {
      const now = Date.now();
      if (now - lastUpdate > 66) { // ~15Hz
        lastUpdate = now;
        const features = featuresRef?.current;
        if (features?.mfcc && features.rms > 0.015) {
          const result = classifyPhoneme(features, calibration);
          setLiveResult({
            ...result,
            rms: features.rms,
            zcr: features.zcr,
            centroid: features.spectralCentroid,
          });

          if (result.phoneme) {
            setHistory(prev => {
              const next = [...prev, { phoneme: result.phoneme, distance: result.distances?.[result.phoneme] || 0, time: now }];
              return next.slice(-historyMaxLen);
            });
          }
        } else {
          setLiveResult(null);
        }
      }
      rafRef.current = requestAnimationFrame(poll);
    };

    rafRef.current = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rafRef.current);
  }, [calibration, featuresRef]);

  // Compute accuracy stats from history
  const stats = PHONEMES.reduce((acc, p) => {
    acc[p.id] = history.filter(h => h.phoneme === p.id).length;
    return acc;
  }, {});
  const totalDetections = history.length;

  return (
    <div
      data-testid="phoneme-tune-screen"
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(3,3,5,0.97)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        padding: '32px 24px',
        overflow: 'auto',
      }}
    >
      {/* Close */}
      <button
        data-testid="tune-close"
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
        ADVANCED
      </div>

      <div style={{
        fontFamily: 'Cinzel', fontSize: 'clamp(16px, 4vw, 24px)',
        color: '#D1F7FF', letterSpacing: 4,
        textShadow: '0 0 30px rgba(209,247,255,0.2)',
        marginBottom: 32,
      }}>
        PHONEME TUNING
      </div>

      {/* Live distance meters */}
      <div style={{
        display: 'flex', gap: 20, justifyContent: 'center',
        width: '100%', maxWidth: 420, marginBottom: 32,
      }}>
        {PHONEMES.map(p => {
          const dist = liveResult?.distances?.[p.id] ?? 0;
          const isActive = liveResult?.phoneme === p.id;
          // Normalize distance for visual (lower = better match = taller bar)
          const maxDist = 40; // rough max euclidean distance for MFCC
          const matchStrength = Math.max(0, 1 - (dist / maxDist));

          return (
            <div key={p.id} style={{ flex: 1, textAlign: 'center' }}>
              {/* Label */}
              <div style={{
                fontFamily: 'Cinzel', fontSize: 11, letterSpacing: 3,
                color: isActive ? p.color : 'rgba(255,255,255,0.3)',
                marginBottom: 8,
                textShadow: isActive ? `0 0 12px ${p.color}` : 'none',
                transition: 'all 0.15s ease',
              }}>
                {p.label}
              </div>

              {/* Distance bar (vertical) */}
              <div style={{
                width: '100%', height: 120,
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${isActive ? p.color + '40' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 4, position: 'relative', overflow: 'hidden',
                transition: 'border-color 0.15s ease',
              }}>
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  height: `${matchStrength * 100}%`,
                  background: `linear-gradient(to top, ${p.color}40, ${p.color}10)`,
                  transition: 'height 0.1s ease',
                  borderRadius: '0 0 3px 3px',
                }} />
                {isActive && (
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    height: `${matchStrength * 100}%`,
                    background: `${p.color}20`,
                    boxShadow: `0 0 20px ${p.color}30`,
                    animation: 'breathe 1s ease infinite',
                  }} />
                )}
              </div>

              {/* Distance value */}
              <div style={{
                fontFamily: 'Rajdhani', fontSize: 10, letterSpacing: 2,
                color: isActive ? p.color : 'rgba(255,255,255,0.25)',
                marginTop: 6,
              }}>
                {dist > 0 ? dist.toFixed(1) : '—'}
              </div>

              {/* Detection count */}
              <div style={{
                fontFamily: 'Rajdhani', fontSize: 8, letterSpacing: 2,
                color: 'rgba(255,255,255,0.15)', marginTop: 2,
              }}>
                {stats[p.id] || 0} / {totalDetections}
              </div>
            </div>
          );
        })}
      </div>

      {/* Live info */}
      {liveResult && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16, width: '100%', maxWidth: 360, marginBottom: 24,
        }}>
          {[
            { label: 'RMS', value: liveResult.rms?.toFixed(3) || '0', color: '#05D9E8' },
            { label: 'ZCR', value: liveResult.zcr?.toFixed(3) || '0', color: '#D1F7FF' },
            { label: 'CENTROID', value: `${Math.round(liveResult.centroid || 0)} Hz`, color: '#FF2A6D' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Rajdhani', fontSize: 7, letterSpacing: 3, color: 'rgba(255,255,255,0.2)', marginBottom: 4 }}>
                {label}
              </div>
              <div style={{ fontFamily: 'Rajdhani', fontSize: 14, fontWeight: 700, color, letterSpacing: 1 }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Articulation score */}
      {liveResult?.articulationScore != null && (
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            fontFamily: 'Rajdhani', fontSize: 8, letterSpacing: 4,
            color: 'rgba(255,255,255,0.2)', marginBottom: 6,
          }}>
            ARTICULATION SCORE
          </div>
          <div style={{
            fontFamily: 'Cinzel', fontSize: 24,
            color: liveResult.articulationScore > 0.7 ? '#FFD700' : '#00FF94',
            textShadow: `0 0 16px ${liveResult.articulationScore > 0.7 ? '#FFD700' : '#00FF94'}40`,
          }}>
            {liveResult.articulationScore.toFixed(2)}
          </div>
          <div style={{
            fontFamily: 'Rajdhani', fontSize: 8, letterSpacing: 3,
            color: liveResult.articulationScore > 0.7 ? '#FFD700' : 'rgba(255,255,255,0.3)',
            marginTop: 4,
          }}>
            {liveResult.articulationScore > 0.7 ? 'GLASS DAGGER RANGE' : 'CLEAR DISTINCTION'}
          </div>
        </div>
      )}

      {/* No voice */}
      {!liveResult && (
        <div style={{
          fontFamily: 'Rajdhani', fontSize: 10, letterSpacing: 4,
          color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase',
          marginBottom: 24, animation: 'breathe 2s ease infinite',
        }}>
          SPEAK TO SEE LIVE ANALYSIS
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginTop: 16 }}>
        {onRecalibrate && (
          <button
            data-testid="tune-recalibrate"
            onClick={onRecalibrate}
            style={{
              fontFamily: 'Rajdhani', fontSize: 10, letterSpacing: 4,
              color: '#FF2A6D', background: 'transparent',
              border: '1px solid rgba(255,42,109,0.25)', padding: '12px 28px',
              cursor: 'pointer', textTransform: 'uppercase',
              transition: 'border-color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#FF2A6D'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,42,109,0.25)'}
          >
            RECALIBRATE
          </button>
        )}
      </div>

      {/* Help text */}
      <div style={{
        fontFamily: 'Manrope', fontSize: 10, color: 'rgba(255,255,255,0.2)',
        textAlign: 'center', lineHeight: 1.8, marginTop: 32, maxWidth: 360,
      }}>
        The bars show how closely your voice matches each calibrated phoneme.
        Taller = closer match. If two bars are similar height, detection may be ambiguous (glass dagger range).
      </div>
    </div>
  );
}
