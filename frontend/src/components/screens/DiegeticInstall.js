import React, { useEffect, useRef, useState, useCallback } from 'react';
import { getNarration } from '../../utils/narrationStrings';
import { VoiceInputViz } from '../ui/VoiceInputViz';
import { OracleDisplay } from '../ui/OracleDisplay';

const GAME_MODES = [
  { id: 'solo',     label: 'SOLO',        desc: 'One voice vs the Oracle enemy' },
  { id: 'passplay', label: 'PASS & PLAY', desc: 'Two voices, one device' },
  { id: 'online',   label: 'ONLINE DUEL', desc: 'Challenge a remote opponent' },
];

/**
 * DiegeticInstall: Oracle speaks rules, player chooses mode + personality via phoneme
 * Oracle personality is chosen by first phoneme detected (Burst=Rival, Flow=Mentor, Tone=Ancient)
 */
export default function DiegeticInstall({ oracle, onComplete, latestFeatures, featuresRef }) {
  const [phase, setPhase] = useState('mode_select'); // mode_select | rules | oracle_select | confirming
  const [selectedMode, setSelectedMode] = useState('solo');
  const [detectedPersonality, setDetectedPersonality] = useState(null);
  const [detectedGender, setDetectedGender] = useState('female');
  const [oracleText, setOracleText] = useState('');
  const [hasSpoken, setHasSpoken] = useState(false);
  const listenWindowRef = useRef(null);
  const rmsHistoryRef = useRef([]);

  // Accumulate RMS for phoneme detection
  useEffect(() => {
    if (phase !== 'oracle_select') return;
    const rms = latestFeatures?.rms || 0;
    rmsHistoryRef.current.push(rms);
    if (rmsHistoryRef.current.length > 30) rmsHistoryRef.current.shift();
  }, [latestFeatures, phase]);

  const detectPersonalityFromVoice = useCallback(() => {
    // Heuristic: ZCR and centroid determine phoneme type
    const feat = latestFeatures;
    if (!feat || feat.rms < 0.05) return null;
    const { zcr, spectralCentroid, spectralFlatness } = feat;
    if (feat.rms > 0.15 && zcr < 0.3) return 'rival';    // Burst
    if (zcr > 0.25 || spectralCentroid > 3000) return 'mentor'; // Flow
    if (spectralFlatness < 0.3 && zcr < 0.15) return 'ancient'; // Tone
    return null;
  }, [latestFeatures]);

  const startRules = useCallback((mode) => {
    setSelectedMode(mode);
    setPhase('rules');
    const narr = getNarration('rpsRules', 'mentor');
    setOracleText(narr);

    const advanceToOracleSelect = () => {
      setPhase('oracle_select');
      setOracleText('Speak now. A Burst summons the Rival. A Flow summons the Mentor. A Tone summons the Ancient. Your first sound chooses your Oracle.');
      oracle?.speak('Speak now. A Burst summons the Rival. A Flow summons the Mentor. A Tone summons the Ancient. Your first sound chooses your Oracle.');
    };

    oracle?.speak(narr, () => setTimeout(advanceToOracleSelect, 500));
    // Fallback: auto-advance after 8s if speech synthesis never fires callback
    setTimeout(() => {
      setPhase((prev) => prev === 'rules' ? 'oracle_select' : prev);
    }, 8000);
  }, [oracle]);

  const selectPersonality = useCallback((personality) => {
    if (phase !== 'oracle_select') return;
    setDetectedPersonality(personality);
    setPhase('confirming');
    const confirmText = `The ${personality.toUpperCase()} has been summoned. Linking your voice to the system.`;
    setOracleText(confirmText);
    oracle?.speak(confirmText, () => {
      setTimeout(() => {
        onComplete({ personality, gender: detectedGender, gameMode: selectedMode });
      }, 600);
    });
    // Fallback if speech never fires
    setTimeout(() => onComplete({ personality, gender: detectedGender, gameMode: selectedMode }), 5000);
  }, [phase, oracle, detectedGender, selectedMode, onComplete]);

  // Auto-detect phoneme during oracle_select phase
  useEffect(() => {
    if (phase !== 'oracle_select') return;
    const rms = latestFeatures?.rms || 0;
    if (rms < 0.08) return;
    const personality = detectPersonalityFromVoice();
    if (!personality) return;
    clearTimeout(listenWindowRef.current);
    listenWindowRef.current = setTimeout(() => selectPersonality(personality), 400);
  }, [latestFeatures, phase, detectPersonalityFromVoice, selectPersonality]);

  // Gender toggle (accessible UI fallback)
  const toggleGender = () => setDetectedGender((g) => g === 'female' ? 'male' : 'female');

  const PERSONALITY_COLORS = { mentor: '#D1F7FF', rival: '#FF2A6D', ancient: 'rgba(209,247,255,0.5)' };

  return (
    <div
      data-testid="diegetic-install"
      style={{
        position: 'fixed', inset: 0, zIndex: 80,
        background: 'rgba(3,3,5,0.97)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px',
      }}
    >
      <OracleDisplay text={oracleText} personality="mentor" isActive={!!oracleText} />

      {phase === 'mode_select' && (
        <div style={{ marginTop: 140, display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 360 }}>
        <div style={{ fontFamily: 'Rajdhani', fontSize: 9, letterSpacing: 5, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', marginBottom: 16 }}>
            Select Mode
          </div>
          {GAME_MODES.map(({ id, label, desc }) => (
            <button
              key={id}
              data-testid={`mode-${id}`}
              onClick={() => startRules(id)}
              style={{
                fontFamily: 'Cinzel, serif', fontSize: 14,
                letterSpacing: 4, color: 'rgba(255,255,255,0.8)',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.12)',
                padding: '20px 32px', textTransform: 'uppercase',
                cursor: 'pointer', textAlign: 'left',
                transition: 'border-color 0.2s ease, color 0.2s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'}
            >
              <div>{label}</div>
              <div style={{ fontFamily: 'Manrope', fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4, letterSpacing: 1 }}>{desc}</div>
            </button>
          ))}

          {/* Gender selector */}
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 16, alignItems: 'center' }}>
            <span style={{ fontFamily: 'Rajdhani', fontSize: 9, letterSpacing: 3, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Oracle Voice</span>
            <button
              data-testid="gender-toggle"
              onClick={toggleGender}
              style={{
                fontFamily: 'Rajdhani', fontSize: 10, letterSpacing: 3,
                color: '#D1F7FF', background: 'transparent',
                border: '1px solid rgba(209,247,255,0.2)', padding: '6px 16px',
                cursor: 'pointer', textTransform: 'uppercase',
              }}
            >
              {detectedGender === 'female' ? 'FEMALE' : 'MALE'}
            </button>
          </div>
        </div>
      )}

      {phase === 'oracle_select' && (
        <div style={{ marginTop: 160, textAlign: 'center' }}>
          <div style={{ fontFamily: 'Rajdhani', fontSize: 9, letterSpacing: 5, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: 28 }}>
            Speak or tap to choose your Oracle
          </div>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
            {[
              { phoneme: 'burst', personality: 'rival',   color: '#FF2A6D' },
              { phoneme: 'flow',  personality: 'mentor',  color: '#05D9E8' },
              { phoneme: 'tone',  personality: 'ancient', color: '#D1F7FF' },
            ].map(({ phoneme, personality: p, color }) => (
              <button
                key={p}
                data-testid={`oracle-select-${p}`}
                onClick={() => selectPersonality(p)}
                style={{
                  fontFamily: 'Cinzel', fontSize: 11, letterSpacing: 3,
                  color, background: 'transparent',
                  border: `1px solid ${color}30`,
                  padding: '16px 20px', textTransform: 'uppercase',
                  cursor: 'pointer', textAlign: 'center', minWidth: 90,
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = color; e.currentTarget.style.boxShadow = `0 0 12px ${color}40`; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = `${color}30`; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div>{phoneme.toUpperCase()}</div>
                <div style={{ fontFamily: 'Rajdhani', fontSize: 8, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
                  → {p.toUpperCase()}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 'confirming' && detectedPersonality && (
        <div style={{ marginTop: 160, textAlign: 'center' }}>
          <div style={{ fontFamily: 'Cinzel', fontSize: 28, color: PERSONALITY_COLORS[detectedPersonality], letterSpacing: 6, textShadow: `0 0 40px ${PERSONALITY_COLORS[detectedPersonality]}` }}>
            {detectedPersonality.toUpperCase()}
          </div>
          <div style={{ fontFamily: 'Rajdhani', fontSize: 9, letterSpacing: 4, color: 'rgba(255,255,255,0.3)', marginTop: 8, textTransform: 'uppercase' }}>
            Oracle Summoned
          </div>
        </div>
      )}

      <VoiceInputViz featuresRef={featuresRef} isListening={phase === 'oracle_select'} />
    </div>
  );
}
