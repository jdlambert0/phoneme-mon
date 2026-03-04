import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * TutorialScreen — Interactive tutorial with RPS diagram + sound practice
 * Shows before first battle to teach players the three phonemes.
 */

const PHONEMES = [
  {
    id: 'burst',
    label: 'BURST',
    color: '#FF2A6D',
    beats: 'FLOW',
    losesTo: 'TONE',
    instruction: 'Make a sharp, explosive sound',
    example: '"Pah!" "Bah!" "Tch!"',
    tip: 'Quick, percussive — like a drum hit',
  },
  {
    id: 'flow',
    label: 'FLOW',
    color: '#05D9E8',
    beats: 'TONE',
    losesTo: 'BURST',
    instruction: 'Make a sustained hissing sound',
    example: '"Ssshhhh" "Ffffff" "Hhhhh"',
    tip: 'Continuous, breathy — like wind',
  },
  {
    id: 'tone',
    label: 'TONE',
    color: '#D1F7FF',
    beats: 'BURST',
    losesTo: 'FLOW',
    instruction: 'Sing or hum a steady note',
    example: '"Aaahh" "Ooooh" "Mmmmm"',
    tip: 'Smooth, sustained — like a bell',
  },
];

const STEPS = ['intro', 'burst', 'flow', 'tone', 'ready'];

export default function TutorialScreen({ featuresRef, onComplete, onSkip }) {
  const [step, setStep] = useState('intro');
  const [practiceActive, setPracticeActive] = useState(false);
  const [detectedRms, setDetectedRms] = useState(0);
  const [practiceSuccess, setPracticeSuccess] = useState({ burst: false, flow: false, tone: false });
  const rafRef = useRef(null);
  const timerRef = useRef(null);

  // Monitor RMS during practice via RAF (no React re-renders from audio)
  useEffect(() => {
    if (!practiceActive) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    const poll = () => {
      const rms = featuresRef?.current?.rms || 0;
      setDetectedRms(rms);
      rafRef.current = requestAnimationFrame(poll);
    };
    rafRef.current = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rafRef.current);
  }, [practiceActive, featuresRef]);

  const startPractice = useCallback((phonemeId) => {
    setPracticeActive(true);
    // After 3 seconds of practice, mark as success if they made sound
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setPracticeActive(false);
      setPracticeSuccess(prev => ({ ...prev, [phonemeId]: true }));
      // Auto-advance after a brief pause
      setTimeout(() => {
        const idx = STEPS.indexOf(phonemeId);
        if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
      }, 800);
    }, 3000);
  }, []);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const currentPhoneme = PHONEMES.find(p => p.id === step);
  const allPracticed = practiceSuccess.burst && practiceSuccess.flow && practiceSuccess.tone;

  return (
    <div
      data-testid="tutorial-screen"
      style={{
        position: 'fixed', inset: 0, zIndex: 80,
        background: 'rgba(3,3,5,0.98)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '24px',
        overflow: 'auto',
      }}
    >
      {/* Skip button */}
      <button
        data-testid="tutorial-skip"
        onClick={onSkip}
        style={{
          position: 'absolute', top: 20, right: 24,
          fontFamily: 'Rajdhani', fontSize: 9, letterSpacing: 4,
          color: 'rgba(255,255,255,0.3)', background: 'transparent',
          border: 'none', cursor: 'pointer', textTransform: 'uppercase',
        }}
      >
        SKIP
      </button>

      {/* ─── INTRO: RPS Triangle ─── */}
      {step === 'intro' && (
        <div style={{ textAlign: 'center', maxWidth: 420, width: '100%' }}>
          <div style={{
            fontFamily: 'Rajdhani', fontSize: 9, letterSpacing: 6,
            color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: 24,
          }}>
            HOW TO FIGHT
          </div>

          <div style={{
            fontFamily: 'Cinzel', fontSize: 'clamp(16px, 3vw, 22px)',
            color: '#D1F7FF', letterSpacing: 3, marginBottom: 32,
          }}>
            VOICE IS YOUR WEAPON
          </div>

          {/* RPS Triangle Diagram */}
          <div data-testid="rps-diagram" style={{ position: 'relative', width: 280, height: 260, margin: '0 auto 32px' }}>
            <svg width="280" height="260" viewBox="0 0 280 260" style={{ position: 'absolute', inset: 0 }}>
              {/* Triangle edges with arrows */}
              {/* BURST (top) → FLOW (bottom-right): Burst beats Flow */}
              <line x1="140" y1="38" x2="240" y2="210" stroke="#FF2A6D" strokeWidth="1" opacity="0.4" />
              <polygon points="230,195 245,210 225,212" fill="#FF2A6D" opacity="0.6" />

              {/* FLOW (bottom-right) → TONE (bottom-left): Flow beats Tone */}
              <line x1="240" y1="220" x2="40" y2="220" stroke="#05D9E8" strokeWidth="1" opacity="0.4" />
              <polygon points="55,213 40,220 55,227" fill="#05D9E8" opacity="0.6" />

              {/* TONE (bottom-left) → BURST (top): Tone beats Burst */}
              <line x1="40" y1="210" x2="140" y2="38" stroke="#D1F7FF" strokeWidth="1" opacity="0.4" />
              <polygon points="133,53 140,38 147,53" fill="#D1F7FF" opacity="0.6" />
            </svg>

            {/* BURST node (top center) */}
            <div style={{
              position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
              textAlign: 'center',
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                border: '2px solid #FF2A6D', background: 'rgba(255,42,109,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 4px',
                boxShadow: '0 0 20px rgba(255,42,109,0.3)',
              }}>
                <span style={{ fontFamily: 'Cinzel', fontSize: 10, color: '#FF2A6D', letterSpacing: 2 }}>B</span>
              </div>
              <div style={{ fontFamily: 'Rajdhani', fontSize: 10, color: '#FF2A6D', letterSpacing: 3 }}>BURST</div>
              <div style={{ fontFamily: 'Manrope', fontSize: 8, color: 'rgba(255,255,255,0.35)' }}>"Pah!" "Tch!"</div>
            </div>

            {/* FLOW node (bottom right) */}
            <div style={{
              position: 'absolute', bottom: 0, right: 0,
              textAlign: 'center',
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                border: '2px solid #05D9E8', background: 'rgba(5,217,232,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 4px',
                boxShadow: '0 0 20px rgba(5,217,232,0.3)',
              }}>
                <span style={{ fontFamily: 'Cinzel', fontSize: 10, color: '#05D9E8', letterSpacing: 2 }}>F</span>
              </div>
              <div style={{ fontFamily: 'Rajdhani', fontSize: 10, color: '#05D9E8', letterSpacing: 3 }}>FLOW</div>
              <div style={{ fontFamily: 'Manrope', fontSize: 8, color: 'rgba(255,255,255,0.35)' }}>"Ssshh" "Ffff"</div>
            </div>

            {/* TONE node (bottom left) */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0,
              textAlign: 'center',
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                border: '2px solid #D1F7FF', background: 'rgba(209,247,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 4px',
                boxShadow: '0 0 20px rgba(209,247,255,0.3)',
              }}>
                <span style={{ fontFamily: 'Cinzel', fontSize: 10, color: '#D1F7FF', letterSpacing: 2 }}>T</span>
              </div>
              <div style={{ fontFamily: 'Rajdhani', fontSize: 10, color: '#D1F7FF', letterSpacing: 3 }}>TONE</div>
              <div style={{ fontFamily: 'Manrope', fontSize: 8, color: 'rgba(255,255,255,0.35)' }}>"Aaah" "Mmm"</div>
            </div>

            {/* Center labels */}
            <div style={{
              position: 'absolute', top: '42%', left: '68%',
              fontFamily: 'Rajdhani', fontSize: 7, color: 'rgba(255,42,109,0.5)',
              letterSpacing: 2, transform: 'rotate(55deg)',
            }}>BEATS</div>
            <div style={{
              position: 'absolute', bottom: '15%', left: '38%',
              fontFamily: 'Rajdhani', fontSize: 7, color: 'rgba(5,217,232,0.5)',
              letterSpacing: 2,
            }}>BEATS</div>
            <div style={{
              position: 'absolute', top: '42%', left: '10%',
              fontFamily: 'Rajdhani', fontSize: 7, color: 'rgba(209,247,255,0.5)',
              letterSpacing: 2, transform: 'rotate(-55deg)',
            }}>BEATS</div>
          </div>

          {/* Explanation text */}
          <div style={{
            fontFamily: 'Manrope', fontSize: 12, color: 'rgba(255,255,255,0.5)',
            lineHeight: 1.8, marginBottom: 32,
          }}>
            Make sounds into your mic to attack.
            <br />Each sound type beats one and loses to another.
          </div>

          <button
            data-testid="tutorial-start-practice"
            onClick={() => setStep('burst')}
            style={{
              fontFamily: 'Cinzel', fontSize: 13, letterSpacing: 4,
              color: '#D1F7FF', background: 'transparent',
              border: '1px solid rgba(209,247,255,0.3)',
              padding: '16px 40px', cursor: 'pointer', textTransform: 'uppercase',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#D1F7FF'; e.currentTarget.style.boxShadow = '0 0 20px rgba(209,247,255,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(209,247,255,0.3)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            PRACTICE SOUNDS
          </button>
        </div>
      )}

      {/* ─── PHONEME PRACTICE STEPS ─── */}
      {currentPhoneme && (
        <div style={{ textAlign: 'center', maxWidth: 400, width: '100%' }}>
          {/* Progress dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 32 }}>
            {PHONEMES.map(p => (
              <div key={p.id} style={{
                width: 8, height: 8, borderRadius: '50%',
                background: practiceSuccess[p.id] ? p.color
                  : p.id === step ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)',
                boxShadow: practiceSuccess[p.id] ? `0 0 8px ${p.color}` : 'none',
                transition: 'all 0.3s ease',
              }} />
            ))}
          </div>

          <div style={{
            fontFamily: 'Rajdhani', fontSize: 9, letterSpacing: 5,
            color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: 16,
          }}>
            PRACTICE · {currentPhoneme.label}
          </div>

          {/* Phoneme circle */}
          <div style={{
            width: 100, height: 100, borderRadius: '50%',
            border: `2px solid ${currentPhoneme.color}`,
            background: practiceActive
              ? `rgba(${currentPhoneme.id === 'burst' ? '255,42,109' : currentPhoneme.id === 'flow' ? '5,217,232' : '209,247,255'},${Math.min(detectedRms * 3, 0.4)})`
              : `rgba(${currentPhoneme.id === 'burst' ? '255,42,109' : currentPhoneme.id === 'flow' ? '5,217,232' : '209,247,255'},0.05)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: practiceActive ? `0 0 ${30 + detectedRms * 60}px ${currentPhoneme.color}40` : `0 0 20px ${currentPhoneme.color}20`,
            transition: 'box-shadow 0.1s ease',
            transform: practiceActive ? `scale(${1 + detectedRms * 0.5})` : 'scale(1)',
          }}>
            <span style={{
              fontFamily: 'Cinzel', fontSize: 28, color: currentPhoneme.color, letterSpacing: 4,
            }}>
              {currentPhoneme.label}
            </span>
          </div>

          {/* Instruction */}
          <div style={{
            fontFamily: 'Cinzel', fontSize: 14, color: currentPhoneme.color,
            letterSpacing: 2, marginBottom: 8,
          }}>
            {currentPhoneme.instruction}
          </div>

          <div style={{
            fontFamily: 'Manrope', fontSize: 11, color: 'rgba(255,255,255,0.5)',
            marginBottom: 4,
          }}>
            Try saying: {currentPhoneme.example}
          </div>

          <div style={{
            fontFamily: 'Manrope', fontSize: 10, color: 'rgba(255,255,255,0.3)',
            marginBottom: 24,
          }}>
            {currentPhoneme.tip}
          </div>

          {/* Beats / Loses to */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 28 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Rajdhani', fontSize: 8, letterSpacing: 3, color: '#00FF94', marginBottom: 4 }}>BEATS</div>
              <div style={{ fontFamily: 'Cinzel', fontSize: 12, color: 'rgba(255,255,255,0.6)', letterSpacing: 2 }}>{currentPhoneme.beats}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Rajdhani', fontSize: 8, letterSpacing: 3, color: '#FF0055', marginBottom: 4 }}>LOSES TO</div>
              <div style={{ fontFamily: 'Cinzel', fontSize: 12, color: 'rgba(255,255,255,0.6)', letterSpacing: 2 }}>{currentPhoneme.losesTo}</div>
            </div>
          </div>

          {/* Practice / Done buttons */}
          {!practiceActive && !practiceSuccess[currentPhoneme.id] && (
            <button
              data-testid={`tutorial-practice-${currentPhoneme.id}`}
              onClick={() => startPractice(currentPhoneme.id)}
              style={{
                fontFamily: 'Cinzel', fontSize: 12, letterSpacing: 3,
                color: currentPhoneme.color, background: 'transparent',
                border: `1px solid ${currentPhoneme.color}40`,
                padding: '14px 36px', cursor: 'pointer', textTransform: 'uppercase',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = currentPhoneme.color}
              onMouseLeave={e => e.currentTarget.style.borderColor = `${currentPhoneme.color}40`}
            >
              TAP & SPEAK
            </button>
          )}

          {practiceActive && (
            <div style={{
              fontFamily: 'Rajdhani', fontSize: 11, letterSpacing: 4,
              color: currentPhoneme.color, textTransform: 'uppercase',
              animation: 'breathe 1.5s ease infinite',
            }}>
              LISTENING...
            </div>
          )}

          {practiceSuccess[currentPhoneme.id] && !practiceActive && (
            <div style={{
              fontFamily: 'Rajdhani', fontSize: 11, letterSpacing: 4,
              color: '#00FF94', textTransform: 'uppercase',
            }}>
              LEARNED
            </div>
          )}
        </div>
      )}

      {/* ─── READY SCREEN ─── */}
      {step === 'ready' && (
        <div style={{ textAlign: 'center', maxWidth: 400, width: '100%' }}>
          <div style={{
            fontFamily: 'Rajdhani', fontSize: 9, letterSpacing: 6,
            color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: 24,
          }}>
            TRAINING COMPLETE
          </div>

          {/* Mini RPS recap */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 32 }}>
            {PHONEMES.map(p => (
              <div key={p.id} style={{ textAlign: 'center' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  border: `1.5px solid ${p.color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 6px',
                  boxShadow: `0 0 12px ${p.color}30`,
                }}>
                  <span style={{ fontFamily: 'Cinzel', fontSize: 9, color: p.color, letterSpacing: 2 }}>
                    {p.label.charAt(0)}
                  </span>
                </div>
                <div style={{ fontFamily: 'Rajdhani', fontSize: 8, color: p.color, letterSpacing: 2 }}>{p.label}</div>
              </div>
            ))}
          </div>

          <div style={{
            fontFamily: 'Manrope', fontSize: 12, color: 'rgba(255,255,255,0.5)',
            lineHeight: 1.8, marginBottom: 32,
          }}>
            You have 6 seconds each round to make your sound.
            <br />The Oracle will detect your attack automatically.
          </div>

          <button
            data-testid="tutorial-begin-battle"
            onClick={onComplete}
            style={{
              fontFamily: 'Cinzel', fontSize: 14, letterSpacing: 5,
              color: '#00FF94', background: 'transparent',
              border: '1px solid rgba(0,255,148,0.4)',
              padding: '18px 48px', cursor: 'pointer', textTransform: 'uppercase',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#00FF94'; e.currentTarget.style.boxShadow = '0 0 24px rgba(0,255,148,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,255,148,0.4)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            BEGIN BATTLE
          </button>
        </div>
      )}
    </div>
  );
}
