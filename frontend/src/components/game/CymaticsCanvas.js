import React, { useEffect, useRef } from 'react';
import { GOLDEN_RATIO, icosahedronVertices2D } from '../../utils/dspMath';

const TOTAL_PARTICLES = 5200;

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function createSprite(color = '#ffffff') {
  const s = document.createElement('canvas');
  s.width = 16; s.height = 16;
  const c = s.getContext('2d');
  const g = c.createRadialGradient(8, 8, 0, 8, 8, 8);
  g.addColorStop(0, color.replace(')', ', 1)').replace('rgb', 'rgba'));
  g.addColorStop(0.5, color.replace(')', ', 0.4)').replace('rgb', 'rgba'));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 16, 16);
  return s;
}

function createParticle(cx, cy, type, features) {
  const rms = features?.rms || 0.05;
  const speed = 1 + rms * 15;
  const angle = Math.random() * Math.PI * 2;
  let hue;
  if (type === 'burst') hue = 340 + Math.random() * 20;
  else if (type === 'flow') hue = 185 + Math.random() * 20;
  else if (type === 'tone') hue = 210 + Math.random() * 30;
  else hue = 200 + Math.random() * 160;

  return {
    x: cx + (Math.random() - 0.5) * 40,
    y: cy + (Math.random() - 0.5) * 40,
    vx: Math.cos(angle) * speed * (0.3 + Math.random() * 0.7),
    vy: Math.sin(angle) * speed * (0.3 + Math.random() * 0.7),
    life: 1.0,
    decay: type === 'ambient' ? 0.002 + Math.random() * 0.003 : 0.012 + Math.random() * 0.015,
    hue,
    size: type === 'ambient' ? 1.5 + Math.random() * 2 : 2 + Math.random() * 4,
    type,
    gravity: type === 'burst' ? 0.04 : type === 'flow' ? -0.01 : 0,
    drag: type === 'tone' ? 0.985 : 0.97,
  };
}

/**
 * CymaticsCanvas — High-performance physics particle visualizer.
 * Reads from featuresRef directly (no React re-renders for audio frames).
 * Animation loop runs once and reads refs on each frame.
 */
export const CymaticsCanvas = ({ featuresRef, activePhoneme, gameState }) => {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const rotationRef = useRef(0);
  const spritesRef = useRef({});
  const rafRef = useRef(null);
  const lastPhonemeRef = useRef(null);

  const activePhonemeRef = useRef(activePhoneme);
  const gameStateRef = useRef(gameState);

  useEffect(() => { activePhonemeRef.current = activePhoneme; }, [activePhoneme]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  // Initialize sprites once
  useEffect(() => {
    spritesRef.current = {
      burst: createSprite('rgb(255,42,109)'),
      flow: createSprite('rgb(5,217,232)'),
      tone: createSprite('rgb(209,247,255)'),
      ambient: createSprite('rgb(120,140,200)'),
    };
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { width: w, height: h } = canvas;
    for (let i = 0; i < 800; i++) {
      const p = createParticle(Math.random() * w, Math.random() * h, 'ambient', null);
      p.life = Math.random();
      particlesRef.current.push(p);
    }
  }, []);

  // Spawn burst on phoneme detection
  useEffect(() => {
    if (!activePhoneme || activePhoneme === lastPhonemeRef.current) return;
    lastPhonemeRef.current = activePhoneme;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cx = canvas.width / 2, cy = canvas.height / 2;
    const count = activePhoneme === 'burst' ? 300 : activePhoneme === 'flow' ? 200 : 150;
    const features = featuresRef?.current;
    for (let i = 0; i < count; i++) {
      particlesRef.current.push(createParticle(cx, cy, activePhoneme, features));
    }
  }, [activePhoneme, featuresRef]);

  // Single animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      try {
        const curFeatures = featuresRef?.current;
        const curPhoneme = activePhonemeRef.current;
        const curGameState = gameStateRef.current;

        const ctx = canvas.getContext('2d');
        if (!ctx) { rafRef.current = requestAnimationFrame(draw); return; }
        const w = canvas.width, h = canvas.height;

        ctx.fillStyle = 'rgba(3,3,5,0.18)';
        ctx.fillRect(0, 0, w, h);

        const cx = w / 2, cy = h / 2;
        const rms = curFeatures?.rms || 0;
        const centroid = curFeatures?.spectralCentroid || 1000;

        if (Math.random() < 0.3) {
          particlesRef.current.push(createParticle(
            Math.random() * w, Math.random() * h, 'ambient', curFeatures
          ));
        }

        while (particlesRef.current.length > TOTAL_PARTICLES) {
          particlesRef.current.shift();
        }

        const sprites = spritesRef.current;
        particlesRef.current = particlesRef.current.filter((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += p.gravity;
          p.vx *= p.drag;
          p.vy *= p.drag;
          p.life -= p.decay;
          if (p.life <= 0) return false;

          const alpha = Math.min(1, p.life * 2);
          ctx.globalAlpha = alpha * 0.85;
          const sprite = sprites[p.type] || sprites.ambient;
          const s = p.size * (1 + rms * 3);
          ctx.drawImage(sprite, p.x - s / 2, p.y - s / 2, s, s);
          return true;
        });

        ctx.globalAlpha = 1;

        // Icosahedron wireframe
        if (curPhoneme === 'tone' || curGameState === 'CALIBRATION') {
          rotationRef.current += 0.008;
          const verts = icosahedronVertices2D(
            cx, cy, 80 + rms * 120,
            rotationRef.current, rotationRef.current * 0.6
          );
          ctx.strokeStyle = 'rgba(209,247,255,0.4)';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          verts.forEach(({ x, y }, i) => {
            const next = verts[(i + 1) % verts.length];
            ctx.moveTo(x, y);
            ctx.lineTo(next.x, next.y);
          });
          ctx.stroke();
          verts.forEach(({ x, y }) => {
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(209,247,255,0.8)';
            ctx.fill();
          });
        }

        // Voice circle glow
        if (rms > 0.01) {
          const pulseR = 30 + rms * 200;
          const hexColor = curPhoneme === 'burst' ? '#FF2A6D' : curPhoneme === 'flow' ? '#05D9E8' : '#D1F7FF';
          const rgb = hexToRgb(hexColor);
          ctx.beginPath();
          ctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${Math.min(rms * 4, 0.6)})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Centroid sweep line
        if (curFeatures?.spectralCentroid > 500) {
          const freq = Math.min(centroid / 8000, 1);
          const lineY = cy + (0.5 - freq) * h * 0.5;
          ctx.strokeStyle = 'rgba(5,217,232,0.08)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, lineY);
          ctx.lineTo(w, lineY);
          ctx.stroke();
        }
      } catch (e) {
        // Swallow canvas errors — animation must not die
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [featuresRef]);

  return (
    <canvas
      ref={canvasRef}
      data-testid="cymatics-canvas"
      style={{ position: 'fixed', inset: 0, zIndex: 0, background: '#030305' }}
    />
  );
};
