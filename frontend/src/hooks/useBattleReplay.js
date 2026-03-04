/**
 * useBattleReplay — records DSP frames + move events and exports as spectral PNG
 */
import { useRef, useCallback } from 'react';

const MAX_FRAMES = 6000; // ~140s at 43fps

export function useBattleReplay() {
  const framesRef    = useRef([]);
  const movesRef     = useRef([]);
  const startRef     = useRef(null);
  const recordingRef = useRef(false);

  const startRecording = useCallback(() => {
    framesRef.current    = [];
    movesRef.current     = [];
    startRef.current     = Date.now();
    recordingRef.current = true;
  }, []);

  const recordFrame = useCallback((features) => {
    if (!recordingRef.current || framesRef.current.length >= MAX_FRAMES) return;
    framesRef.current.push({
      t:        Date.now() - startRef.current,
      rms:      features.rms,
      centroid: features.spectralCentroid,
      flatness: features.spectralFlatness,
      mfcc:     features.mfcc ? features.mfcc.slice(0, 13) : null,
    });
  }, []);

  const recordMove = useCallback((player, phoneme, articulationScore, winner) => {
    if (!recordingRef.current) return;
    movesRef.current.push({
      t: Date.now() - startRef.current,
      player, phoneme, articulationScore, winner,
    });
  }, []);

  const stopRecording = useCallback(() => { recordingRef.current = false; }, []);

  const exportCanvas = useCallback(() => {
    const frames = framesRef.current;
    const moves  = movesRef.current;
    if (frames.length < 5) return null;

    const W = 640, H = 260;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#030305';
    ctx.fillRect(0, 0, W, H);

    const totalTime = Math.max(1, frames[frames.length - 1].t);
    const fw = W / frames.length;

    // ── RMS waveform (upper half) ───────────────────────────────────────────
    const midY = H * 0.45;
    frames.forEach((f, i) => {
      const x = i * fw;
      const h = f.rms * midY * 1.8;
      const hue = Math.min(360, (f.centroid / 6000) * 280 + 160);
      ctx.fillStyle = `hsla(${hue},70%,55%,0.5)`;
      ctx.fillRect(x, midY - h / 2, Math.max(1, fw), h);
    });

    // ── MFCC spectrogram (lower half) ──────────────────────────────────────
    const spectroTop = H * 0.55;
    const spectroH   = H * 0.36;
    frames.forEach((f, i) => {
      if (!f.mfcc) return;
      const x = i * fw;
      f.mfcc.forEach((v, m) => {
        const y      = spectroTop + (m / 13) * spectroH;
        const bright = Math.min(80, Math.abs(v) * 3);
        ctx.fillStyle = `hsla(210,60%,${20 + bright}%,0.75)`;
        ctx.fillRect(x, y, Math.max(1, fw), spectroH / 13 + 0.5);
      });
    });

    // ── Move event markers ──────────────────────────────────────────────────
    const COLORS = { burst: '#FF2A6D', flow: '#05D9E8', tone: '#D1F7FF' };
    moves.forEach((m) => {
      const x     = (m.t / totalTime) * W;
      const color = COLORS[m.phoneme] || '#ffffff';
      ctx.strokeStyle = color;
      ctx.lineWidth   = 1.5;
      ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H * 0.5); ctx.stroke();
      // Label
      ctx.fillStyle   = color;
      ctx.globalAlpha = 0.9;
      ctx.font = '700 9px Rajdhani, sans-serif';
      ctx.fillText((m.phoneme || '?')[0].toUpperCase(), x + 2, 11);
      // Winner dot
      if (m.winner === 'p1') {
        ctx.beginPath();
        ctx.arc(x, H * 0.5 - 6, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#00FF94';
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    });

    // ── Watermark ──────────────────────────────────────────────────────────
    ctx.fillStyle   = 'rgba(255,255,255,0.25)';
    ctx.font        = '9px Cinzel, serif';
    ctx.globalAlpha = 0.6;
    ctx.fillText('PHONEME-MON · BATTLE REPLAY', 12, H - 10);
    ctx.globalAlpha = 1;

    return canvas;
  }, []);

  const shareReplay = useCallback(async (playerTitle = 'Voice') => {
    const canvas = exportCanvas();
    if (!canvas) return false;
    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) { resolve(false); return; }
        const file = new File([blob], 'phonemon-replay.png', { type: 'image/png' });
        try {
          if (navigator.share && navigator.canShare?.({ files: [file] })) {
            await navigator.share({
              title: 'Phoneme-Mon Battle Replay',
              text:  `${playerTitle} — Voice Combat Spectral Replay`,
              files: [file],
            });
            resolve(true);
          } else {
            const url = URL.createObjectURL(blob);
            const a   = document.createElement('a');
            a.href     = url;
            a.download = 'phonemon-replay.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            resolve(true);
          }
        } catch (e) { console.warn('Share failed', e); resolve(false); }
      }, 'image/png');
    });
  }, [exportCanvas]);

  return { startRecording, recordFrame, recordMove, stopRecording, shareReplay, exportCanvas };
}
