/**
 * Battle Arena Themes — Visual configurations for CymaticsCanvas
 *
 * Each arena defines particle colors, background, ambient behavior,
 * wireframe style, and glow effects.
 */

export const ARENAS = {
  void: {
    id: 'void',
    name: 'THE VOID',
    desc: 'Where silence takes form',
    background: '#030305',
    fadeAlpha: 0.18,
    phonemeHues: {
      burst: [340, 360],
      flow:  [185, 205],
      tone:  [210, 240],
    },
    ambientHue: [200, 360],
    spriteColors: {
      burst:   'rgb(255,42,109)',
      flow:    'rgb(5,217,232)',
      tone:    'rgb(209,247,255)',
      ambient: 'rgb(120,140,200)',
    },
    wireframeColor: 'rgba(209,247,255,0.4)',
    wireframeVertexColor: 'rgba(209,247,255,0.8)',
    glowColors: {
      burst: '#FF2A6D',
      flow:  '#05D9E8',
      tone:  '#D1F7FF',
    },
    centroidLineColor: 'rgba(5,217,232,0.08)',
    ambientSpawnRate: 0.3,
    particleGravityMod: 1.0,
  },

  ember: {
    id: 'ember',
    name: 'EMBER SHRINE',
    desc: 'The furnace of the first voice',
    background: '#0A0503',
    fadeAlpha: 0.15,
    phonemeHues: {
      burst: [0, 30],
      flow:  [30, 55],
      tone:  [45, 70],
    },
    ambientHue: [0, 60],
    spriteColors: {
      burst:   'rgb(255,80,30)',
      flow:    'rgb(255,160,50)',
      tone:    'rgb(255,220,120)',
      ambient: 'rgb(180,60,20)',
    },
    wireframeColor: 'rgba(255,160,50,0.35)',
    wireframeVertexColor: 'rgba(255,200,80,0.8)',
    glowColors: {
      burst: '#FF5020',
      flow:  '#FFA030',
      tone:  '#FFDC80',
    },
    centroidLineColor: 'rgba(255,120,30,0.06)',
    ambientSpawnRate: 0.4,
    particleGravityMod: 0.7, // embers float more
  },

  abyss: {
    id: 'abyss',
    name: 'THE ABYSS',
    desc: 'Echoes from the deep',
    background: '#020208',
    fadeAlpha: 0.12,
    phonemeHues: {
      burst: [280, 320],
      flow:  [220, 260],
      tone:  [170, 200],
    },
    ambientHue: [220, 300],
    spriteColors: {
      burst:   'rgb(180,50,255)',
      flow:    'rgb(40,100,220)',
      tone:    'rgb(80,200,180)',
      ambient: 'rgb(60,40,120)',
    },
    wireframeColor: 'rgba(80,200,180,0.3)',
    wireframeVertexColor: 'rgba(120,220,200,0.7)',
    glowColors: {
      burst: '#B432FF',
      flow:  '#2864DC',
      tone:  '#50C8B4',
    },
    centroidLineColor: 'rgba(80,120,200,0.06)',
    ambientSpawnRate: 0.2,
    particleGravityMod: 1.5, // heavy, deep water feel
  },

  prism: {
    id: 'prism',
    name: 'PRISM GATE',
    desc: 'Where all frequencies converge',
    background: '#050305',
    fadeAlpha: 0.14,
    phonemeHues: {
      burst: [0, 360],     // full rainbow
      flow:  [120, 240],
      tone:  [240, 360],
    },
    ambientHue: [0, 360],
    spriteColors: {
      burst:   'rgb(255,120,200)',
      flow:    'rgb(120,255,180)',
      tone:    'rgb(180,120,255)',
      ambient: 'rgb(140,140,180)',
    },
    wireframeColor: 'rgba(200,180,255,0.35)',
    wireframeVertexColor: 'rgba(220,200,255,0.8)',
    glowColors: {
      burst: '#FF78C8',
      flow:  '#78FFB4',
      tone:  '#B478FF',
    },
    centroidLineColor: 'rgba(180,140,255,0.07)',
    ambientSpawnRate: 0.35,
    particleGravityMod: 0.5, // light, ethereal
  },
};

export const ARENA_LIST = Object.values(ARENAS);
export const DEFAULT_ARENA = 'void';

export function getArena(id) {
  return ARENAS[id] || ARENAS[DEFAULT_ARENA];
}
