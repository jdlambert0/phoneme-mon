import React, { useState } from 'react';

/**
 * RPS quick-reference overlay — toggleable mini diagram during battle.
 */
export const RPSOverlay = () => {
  const [open, setOpen] = useState(false);

  return (
    <div data-testid="rps-overlay" style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 50 }}>
      {/* Toggle button */}
      <button
        data-testid="rps-overlay-toggle"
        onClick={() => setOpen(o => !o)}
        style={{
          width: 36, height: 36, borderRadius: '50%',
          background: open ? 'rgba(209,247,255,0.15)' : 'rgba(255,255,255,0.06)',
          border: `1px solid ${open ? 'rgba(209,247,255,0.4)' : 'rgba(255,255,255,0.12)'}`,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s ease',
        }}
      >
        <span style={{ fontFamily: 'Cinzel', fontSize: 10, color: '#D1F7FF', letterSpacing: 1 }}>?</span>
      </button>

      {/* Mini diagram */}
      {open && (
        <div style={{
          position: 'absolute', bottom: 44, right: 0,
          background: 'rgba(3,3,5,0.92)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8, padding: '14px 18px', width: 170,
          backdropFilter: 'blur(12px)',
        }}>
          <div style={{
            fontFamily: 'Rajdhani', fontSize: 8, letterSpacing: 3,
            color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginBottom: 10,
          }}>
            WHAT BEATS WHAT
          </div>
          {[
            { a: 'BURST', b: 'FLOW', color: '#FF2A6D' },
            { a: 'FLOW', b: 'TONE', color: '#05D9E8' },
            { a: 'TONE', b: 'BURST', color: '#D1F7FF' },
          ].map(({ a, b, color }) => (
            <div key={a} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              marginBottom: 6, fontFamily: 'Rajdhani', fontSize: 10, letterSpacing: 2,
            }}>
              <span style={{ color, fontWeight: 700 }}>{a}</span>
              <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 8 }}>beats</span>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>{b}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
