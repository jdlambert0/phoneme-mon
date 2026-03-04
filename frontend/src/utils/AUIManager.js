/**
 * AUIManager — Spatial Audio (Auditory User Interface)
 * All Web Audio calls wrapped in try-catch for device compatibility.
 */
export class AUIManager {
  constructor(ctx) {
    this.ctx = ctx;
    this.entities = {};
    try {
      this._setupListener();
      this.entities = {
        oracle:    this._createPanner(0,   0,  0),
        enemy:     this._createPanner(10, 10,  5),
        inventory: this._createPanner(-10, 0,  5),
      };
    } catch (e) {
      console.warn('AUIManager init error:', e);
    }
  }

  _setupListener() {
    if (!this.ctx) return;
    const L = this.ctx.listener;
    if (!L) return;
    try {
      if (L.positionX !== undefined) {
        L.positionX.value = 0; L.positionY.value = 0; L.positionZ.value = 0;
        L.forwardX.value  = 0; L.forwardY.value  = 0; L.forwardZ.value  = -1;
        L.upX.value       = 0; L.upY.value       = 1; L.upZ.value       = 0;
      } else {
        L.setPosition(0, 0, 0);
        L.setOrientation(0, 0, -1, 0, 1, 0);
      }
    } catch {}
  }

  _createPanner(x, y, z) {
    if (!this.ctx) return null;
    try {
      const p = this.ctx.createPanner();
      p.panningModel  = 'HRTF';
      p.distanceModel = 'inverse';
      p.refDistance   = 1;
      p.maxDistance   = 50;
      p.rolloffFactor = 1;
      p.coneInnerAngle = 360;
      p.coneOuterAngle = 0;
      p.coneOuterGain  = 0;
      if (p.positionX !== undefined) {
        p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z;
      } else {
        p.setPosition(x, y, z);
      }
      p.connect(this.ctx.destination);
      return p;
    } catch (e) {
      console.warn('Panner creation failed:', e);
      return null;
    }
  }

  playTone(entityName, opts = {}) {
    try {
      const panner = this.entities[entityName];
      if (!panner || !this.ctx || this.ctx.state !== 'running') return;

      const {
        frequency = 220, duration = 0.35, type = 'sine',
        volume = 0.3, attack = 0.02, decay = 0.15,
      } = opts;

      const osc  = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = frequency;

      const t = this.ctx.currentTime;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(volume, t + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

      osc.connect(gain);
      gain.connect(panner);
      osc.start(t);
      osc.stop(t + duration + 0.05);
    } catch {}
  }

  playEvent(eventName) {
    const MAP = {
      oracle_speak:         ['oracle',    { frequency: 196,  duration: 0.2, type: 'sine',     volume: 0.22 }],
      oracle_round_win:     ['oracle',    { frequency: 440,  duration: 0.4, type: 'sine',     volume: 0.3  }],
      oracle_round_lose:    ['oracle',    { frequency: 110,  duration: 0.5, type: 'sine',     volume: 0.25 }],
      enemy_reveal:         ['enemy',     { frequency: 200,  duration: 0.6, type: 'sawtooth', volume: 0.3  }],
      enemy_wins_round:     ['enemy',     { frequency: 130,  duration: 0.8, type: 'square',   volume: 0.35 }],
      enemy_loses_round:    ['enemy',     { frequency: 350,  duration: 0.3, type: 'sine',     volume: 0.2  }],
      glass_dagger:         ['inventory', { frequency: 880,  duration: 0.7, type: 'triangle', volume: 0.3  }],
      calibration_complete: ['inventory', { frequency: 660,  duration: 0.4, type: 'sine',     volume: 0.28 }],
      round_tie:            ['oracle',    { frequency: 277,  duration: 0.3, type: 'triangle', volume: 0.2  }],
    };
    const entry = MAP[eventName];
    if (entry) this.playTone(entry[0], entry[1]);
  }

  destroy() {
    Object.values(this.entities).forEach(p => { try { p?.disconnect(); } catch {} });
  }
}
