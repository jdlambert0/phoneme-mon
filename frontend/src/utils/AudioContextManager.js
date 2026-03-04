/**
 * AudioContextManager - Singleton
 * Handles iOS unlock, Silent Stream hack, AudioWorklet initialization
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

  /** Must be called from a user gesture (touch/click) */
  async unlock() {
    if (this._unlocked) return this.ctx;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx({ sampleRate: 44100, latencyHint: 'interactive' });
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this._setupSilentStream();
    this._unlocked = true;
    return this.ctx;
  }

  /** iOS hack: play silent audio to prevent context suspension */
  _setupSilentStream() {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    gain.gain.value = 0.0001; // near-silent but not zero
    const dest = this.ctx.createMediaStreamDestination();
    osc.connect(gain);
    gain.connect(dest);
    osc.frequency.value = 1;
    osc.start();
    this._silentOsc = osc;
    // Also connect gain to ctx.destination to keep alive
    gain.connect(this.ctx.destination);
  }

  async initMicrophone() {
    if (!this._unlocked) throw new Error('AudioContext not unlocked yet');
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    const micSource = this.ctx.createMediaStreamSource(this.stream);
    await this.ctx.audioWorklet.addModule('/worklets/MeydaProcessor.js');
    this.workletNode = new AudioWorkletNode(this.ctx, 'meyda-processor');
    this.workletNode.port.onmessage = (e) => {
      this._featureListeners.forEach((cb) => cb(e.data));
    };
    micSource.connect(this.workletNode);
    this.workletNode.connect(this.ctx.destination);
    this.sourceNode = micSource;
    return true;
  }

  onFeatures(callback) {
    this._featureListeners.push(callback);
    return () => {
      this._featureListeners = this._featureListeners.filter((c) => c !== callback);
    };
  }

  getSampleRate() {
    return this.ctx?.sampleRate ?? 44100;
  }

  isReady() {
    return this._unlocked && !!this.workletNode;
  }

  destroy() {
    this._silentOsc?.stop();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.workletNode?.disconnect();
    this.sourceNode?.disconnect();
    this.ctx?.close();
    _instance = null;
  }
}
