/**
 * AudioContextManager - Singleton
 * Handles iOS unlock, Silent Stream hack, AudioWorklet initialization
 * All external API calls wrapped in try-catch for device compatibility.
 */

let _instance = null;

export class AudioContextManager {
  constructor() {
    this.ctx = null;
    this.workletNode = null;
    this.sourceNode = null;
    this.stream = null;
    this._featureListeners = [];
    this._silentOsc = null;
    this._unlocked = false;
  }

  static getInstance() {
    if (!_instance) _instance = new AudioContextManager();
    return _instance;
  }

  async unlock() {
    if (this._unlocked && this.ctx) return this.ctx;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) throw new Error('Web Audio API not supported');
      this.ctx = new AudioCtx({ sampleRate: 44100, latencyHint: 'interactive' });
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      this._setupSilentStream();
      this._unlocked = true;
    } catch (e) {
      console.warn('AudioContext unlock failed:', e);
      // Create a minimal context as fallback
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
        this._unlocked = true;
      } catch (_) {}
    }
    return this.ctx;
  }

  _setupSilentStream() {
    try {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      gain.gain.value = 0.0001;
      const dest = this.ctx.createMediaStreamDestination();
      osc.connect(gain);
      gain.connect(dest);
      osc.frequency.value = 1;
      osc.start();
      this._silentOsc = osc;
      gain.connect(this.ctx.destination);
    } catch (e) {
      console.warn('Silent stream setup failed:', e);
    }
  }

  async initMicrophone() {
    if (!this.ctx) throw new Error('AudioContext not initialized');

    // Resume context if suspended (can happen on mobile)
    if (this.ctx.state === 'suspended') {
      try { await this.ctx.resume(); } catch (_) {}
    }

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });

    const micSource = this.ctx.createMediaStreamSource(this.stream);

    try {
      await this.ctx.audioWorklet.addModule('/worklets/MeydaProcessor.js');
    } catch (e) {
      // Worklet might already be registered, or path issue
      console.warn('AudioWorklet addModule:', e);
    }

    try {
      this.workletNode = new AudioWorkletNode(this.ctx, 'meyda-processor');
    } catch (e) {
      console.error('Failed to create AudioWorkletNode:', e);
      // Clean up mic stream
      this.stream?.getTracks().forEach(t => t.stop());
      throw e;
    }

    this.workletNode.port.onmessage = (e) => {
      if (e.data) {
        for (let i = 0; i < this._featureListeners.length; i++) {
          try { this._featureListeners[i](e.data); } catch (_) {}
        }
      }
    };

    micSource.connect(this.workletNode);
    // Don't connect worklet to destination — it creates feedback
    this.sourceNode = micSource;
    return true;
  }

  onFeatures(callback) {
    this._featureListeners.push(callback);
    return () => {
      this._featureListeners = this._featureListeners.filter(c => c !== callback);
    };
  }

  getSampleRate() {
    return this.ctx?.sampleRate ?? 44100;
  }

  isReady() {
    return this._unlocked && !!this.workletNode;
  }

  destroy() {
    try { this._silentOsc?.stop(); } catch (_) {}
    try { this.stream?.getTracks().forEach(t => t.stop()); } catch (_) {}
    try { this.workletNode?.disconnect(); } catch (_) {}
    try { this.sourceNode?.disconnect(); } catch (_) {}
    try { this.ctx?.close(); } catch (_) {}
    _instance = null;
  }
}
