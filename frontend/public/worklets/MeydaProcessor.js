/**
 * MeydaProcessor - AudioWorklet DSP Kernel
 * Extracts RMS, ZCR, spectralCentroid, spectralFlatness, MFCC-13
 * Uses a 512-sample circular buffer over 128-frame render quanta
 */
class MeydaProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.BUFFER_SIZE = 512;
    this.buffer = new Float32Array(this.BUFFER_SIZE);
    this.writeIndex = 0;
    this.samplesWritten = 0;
    this.MEL_FILTERS = 26;
    this.MFCC_COEFFS = 13;
    this.hannWindow = this._buildHann(this.BUFFER_SIZE);
    this.melFilterbank = null; // built on first process (sampleRate available)
  }

  _buildHann(N) {
    const w = new Float32Array(N);
    for (let i = 0; i < N; i++) w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1)));
    return w;
  }

  _buildMelFilterbank() {
    const N = this.BUFFER_SIZE;
    const numBins = N / 2 + 1;
    const nyquist = sampleRate / 2;
    const hzToMel = (f) => 2595 * Math.log10(1 + f / 700);
    const melToHz = (m) => 700 * (Math.pow(10, m / 2595) - 1);
    const minMel = hzToMel(20);
    const maxMel = hzToMel(nyquist);
    const melPoints = new Float32Array(this.MEL_FILTERS + 2);
    for (let i = 0; i < melPoints.length; i++) {
      melPoints[i] = melToHz(minMel + (i / (this.MEL_FILTERS + 1)) * (maxMel - minMel));
    }
    const binPoints = Array.from(melPoints).map((hz) =>
      Math.floor((hz / nyquist) * (numBins - 1))
    );
    const filters = [];
    for (let m = 1; m <= this.MEL_FILTERS; m++) {
      const f = new Float32Array(numBins);
      const l = binPoints[m - 1], c = binPoints[m], r = binPoints[m + 1];
      for (let k = l; k <= c; k++) f[k] = (k - l) / Math.max(c - l, 1);
      for (let k = c; k <= r; k++) f[k] = (r - k) / Math.max(r - c, 1);
      filters.push(f);
    }
    return filters;
  }

  _fft(frame) {
    const N = frame.length;
    const real = new Float32Array(frame);
    const imag = new Float32Array(N);
    // Bit-reversal
    let j = 0;
    for (let i = 1; i < N; i++) {
      let bit = N >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        [real[i], real[j]] = [real[j], real[i]];
        [imag[i], imag[j]] = [imag[j], imag[i]];
      }
    }
    // Butterfly
    for (let len = 2; len <= N; len <<= 1) {
      const ang = (-2 * Math.PI) / len;
      const wR = Math.cos(ang), wI = Math.sin(ang);
      for (let i = 0; i < N; i += len) {
        let tR = 1, tI = 0;
        for (let k = 0; k < len >> 1; k++) {
          const uR = real[i + k], uI = imag[i + k];
          const vR = real[i + k + len / 2] * tR - imag[i + k + len / 2] * tI;
          const vI = real[i + k + len / 2] * tI + imag[i + k + len / 2] * tR;
          real[i + k] = uR + vR; imag[i + k] = uI + vI;
          real[i + k + len / 2] = uR - vR; imag[i + k + len / 2] = uI - vI;
          const nR = tR * wR - tI * wI;
          tI = tR * wI + tI * wR; tR = nR;
        }
      }
    }
    // Power spectrum (first half)
    const half = N / 2 + 1;
    const mag = new Float32Array(half);
    for (let i = 0; i < half; i++) mag[i] = Math.sqrt(real[i] ** 2 + imag[i] ** 2) / N;
    return mag;
  }

  _computeRMS(frame) {
    let s = 0;
    for (let i = 0; i < frame.length; i++) s += frame[i] ** 2;
    return Math.sqrt(s / frame.length);
  }

  _computeZCR(frame) {
    let c = 0;
    for (let i = 1; i < frame.length; i++) {
      if ((frame[i] >= 0) !== (frame[i - 1] >= 0)) c++;
    }
    return c / frame.length;
  }

  _computeSpectralCentroid(mag) {
    const binHz = sampleRate / this.BUFFER_SIZE;
    let weighted = 0, total = 0;
    for (let i = 0; i < mag.length; i++) { weighted += i * binHz * mag[i]; total += mag[i]; }
    return total > 1e-10 ? weighted / total : 0;
  }

  _computeSpectralFlatness(mag) {
    let logSum = 0, sum = 0, n = 0;
    for (let i = 0; i < mag.length; i++) {
      if (mag[i] > 1e-10) { logSum += Math.log(mag[i]); sum += mag[i]; n++; }
    }
    if (n === 0 || sum === 0) return 0;
    return Math.exp(logSum / n) / (sum / n);
  }

  _computeMFCC(mag) {
    if (!this.melFilterbank) this.melFilterbank = this._buildMelFilterbank();
    const logEnergies = this.melFilterbank.map((filter) => {
      let e = 0;
      for (let k = 0; k < Math.min(filter.length, mag.length); k++) e += filter[k] * mag[k];
      return Math.log(Math.max(e, 1e-10));
    });
    const M = logEnergies.length;
    const mfcc = new Array(this.MFCC_COEFFS);
    for (let n = 0; n < this.MFCC_COEFFS; n++) {
      let sum = 0;
      for (let m = 0; m < M; m++) sum += logEnergies[m] * Math.cos((Math.PI * n * (m + 0.5)) / M);
      mfcc[n] = sum;
    }
    return mfcc;
  }

  process(inputs) {
    try {
      const ch = inputs[0]?.[0];
      if (!ch || ch.length === 0) return true;

      for (let i = 0; i < ch.length; i++) {
        const v = ch[i];
        this.buffer[this.writeIndex] = (v === v) ? v : 0; // NaN guard
        this.writeIndex = (this.writeIndex + 1) % this.BUFFER_SIZE;
      }
      this.samplesWritten += ch.length;

      if (this.samplesWritten < this.BUFFER_SIZE) return true;
      this.samplesWritten = 0; // Reset so FFT runs every 512 samples, not every 128

      // Get ordered buffer
      const frame = new Float32Array(this.BUFFER_SIZE);
      for (let i = 0; i < this.BUFFER_SIZE; i++) {
        frame[i] = this.buffer[(this.writeIndex + i) % this.BUFFER_SIZE];
      }

      const rms = this._computeRMS(frame);
      const zcr = this._computeZCR(frame);

      // Apply Hann window before FFT
      const windowed = new Float32Array(this.BUFFER_SIZE);
      for (let i = 0; i < this.BUFFER_SIZE; i++) windowed[i] = frame[i] * this.hannWindow[i];

      const mag = this._fft(windowed);
      const spectralCentroid = this._computeSpectralCentroid(mag);
      const spectralFlatness = this._computeSpectralFlatness(mag);
      const mfcc = this._computeMFCC(mag);

      this.port.postMessage({ rms, zcr, spectralCentroid, spectralFlatness, mfcc, timestamp: currentTime });
    } catch (e) {
      // Swallow errors — worklet must not die
    }
    return true;
  }
}

registerProcessor('meyda-processor', MeydaProcessor);
