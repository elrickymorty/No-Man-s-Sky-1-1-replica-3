// ============ 100% procedural audio: ambient, generative music, SFX ============

export class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.ambGain = null;
    this.muted = false;
    this._noiseBuf = null;
    this._ambNodes = [];
    this._ambTimer = null;
    this._musicTimer = null;
    this._chordIdx = 0;
    this._musicMode = null;
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.55;
    this.master.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.9;
    this.sfxGain.connect(this.master);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.5;
    this.musicGain.connect(this.master);
    this.ambGain = this.ctx.createGain();
    this.ambGain.gain.value = 0.5;
    this.ambGain.connect(this.master);
  }

  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.55, this.ctx.currentTime, 0.05);
    return this.muted;
  }

  _noise(dur = 1) {
    if (!this._noiseBuf) {
      const len = this.ctx.sampleRate * 2;
      this._noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this._noiseBuf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + 0.02 * w) / 1.02; // brownish
        d[i] = last * 3.5;
      }
    }
    return this._noiseBuf;
  }

  _env(node, t0, a, peak, dec) {
    const g = node.gain;
    g.setValueAtTime(0.0001, t0);
    g.linearRampToValueAtTime(peak, t0 + a);
    g.exponentialRampToValueAtTime(0.0001, t0 + a + dec);
  }

  _osc(type, f0, f1, t0, dur, peak, dest, q) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    const g = this.ctx.createGain();
    this._env(g, t0, Math.min(0.01, dur * 0.2), peak, dur);
    o.connect(g).connect(dest);
    o.start(t0);
    o.stop(t0 + dur + 0.1);
    return o;
  }

  _burst(filterType, f0, f1, t0, dur, peak, dest) {
    const src = this.ctx.createBufferSource();
    src.buffer = this._noise();
    const f = this.ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.setValueAtTime(f0, t0);
    if (f1 && f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t0 + dur);
    const g = this.ctx.createGain();
    this._env(g, t0, 0.008, peak, dur);
    src.connect(f).connect(g).connect(dest);
    src.start(t0);
    src.stop(t0 + dur + 0.1);
  }

  click() { if (!this.ctx) return; const t = this.ctx.currentTime; this._osc('square', 1150, 900, t, 0.05, 0.12, this.sfxGain); }
  error() { if (!this.ctx) return; const t = this.ctx.currentTime; this._osc('square', 196, 160, t, 0.16, 0.14, this.sfxGain); }
  scan() { if (!this.ctx) return; const t = this.ctx.currentTime; this._osc('sine', 480, 1500, t, 0.28, 0.16, this.sfxGain); this._osc('sine', 960, 3000, t + 0.05, 0.2, 0.06, this.sfxGain); }
  mineTick() { if (!this.ctx) return; const t = this.ctx.currentTime; this._burst('bandpass', 1600 + Math.random() * 800, 900, t, 0.07, 0.2, this.sfxGain); }
  mineHit() { if (!this.ctx) return; const t = this.ctx.currentTime; this._osc('triangle', 660, 660, t, 0.1, 0.16, this.sfxGain); this._osc('triangle', 990, 990, t + 0.07, 0.14, 0.14, this.sfxGain); }
  pickup(n = 1) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const f = 780 + Math.min(6, n) * 60;
    this._osc('sine', f, f * 1.4, t, 0.12, 0.16, this.sfxGain);
  }
  craft() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [523, 659, 784].forEach((f, i) => this._osc('triangle', f, f, t + i * 0.09, 0.22, 0.14, this.sfxGain));
  }
  footstep(alt) { if (!this.ctx) return; const t = this.ctx.currentTime; this._burst('lowpass', alt ? 320 : 260, 140, t, 0.06, 0.1, this.sfxGain); }
  land() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._osc('sine', 70, 32, t, 1.1, 0.5, this.sfxGain);
    this._burst('lowpass', 500, 90, t, 1.4, 0.35, this.sfxGain);
  }
  takeoff() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._burst('lowpass', 180, 700, t, 1.8, 0.3, this.sfxGain);
    this._osc('sawtooth', 40, 120, t, 1.6, 0.1, this.sfxGain);
  }
  warp() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._burst('bandpass', 240, 5200, t, 1.7, 0.3, this.sfxGain);
    this._osc('sine', 180, 1400, t, 1.7, 0.16, this.sfxGain);
  }

  // ---------------- ambient ----------------
  setAmbient(mode) {
    if (!this.ctx) return;
    this.stopAmbient();
    const t = this.ctx.currentTime;
    if (mode === 'planet') {
      // wind: looping filtered noise with slow gusts
      const src = this.ctx.createBufferSource();
      src.buffer = this._noise();
      src.loop = true;
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 420;
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.07;
      const lfoG = this.ctx.createGain();
      lfoG.gain.value = 260;
      lfo.connect(lfoG).connect(f.frequency);
      lfo.start(t);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.16, t + 3);
      src.connect(f).connect(g).connect(this.ambGain);
      src.start(t);
      this._ambNodes.push(src, lfo, f, g);
      // distant bird-ish chirps
      this._ambTimer = setInterval(() => {
        if (!this.ctx || this.muted) return;
        if (Math.random() < 0.65) {
          const t0 = this.ctx.currentTime;
          const f0 = 900 + Math.random() * 900;
          this._osc('sine', f0, f0 * (1.2 + Math.random() * 0.4), t0, 0.14, 0.028, this.ambGain);
          if (Math.random() < 0.5) this._osc('sine', f0 * 1.1, f0 * 1.5, t0 + 0.22, 0.12, 0.02, this.ambGain);
        }
      }, 4500);
    } else if (mode === 'space') {
      // deep drone
      const o1 = this.ctx.createOscillator();
      o1.type = 'sine';
      o1.frequency.value = 48;
      const o2 = this.ctx.createOscillator();
      o2.type = 'sine';
      o2.frequency.value = 48.4;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.09, t + 4);
      o1.connect(g); o2.connect(g);
      g.connect(this.ambGain);
      o1.start(t); o2.start(t);
      this._ambNodes.push(o1, o2, g);
    }
  }

  stopAmbient() {
    if (this._ambTimer) { clearInterval(this._ambTimer); this._ambTimer = null; }
    if (this._ambNodes.length && this.ctx) {
      const t = this.ctx.currentTime;
      const nodes = this._ambNodes;
      this._ambNodes = [];
      for (const n of nodes) {
        try {
          if (n.gain && n.gain.setValueAtTime) {
            n.gain.setValueAtTime(n.gain.value, t);
            n.gain.linearRampToValueAtTime(0.0001, t + 1);
          }
          if (n.stop) n.stop(t + 1.1);
        } catch { /* ignore */ }
      }
    }
  }

  // ---------------- generative music ----------------
  setMusic(mode) {
    if (!this.ctx) return;
    if (this._musicMode === mode) return;
    this._musicMode = mode;
    if (this._musicTimer) { clearInterval(this._musicTimer); this._musicTimer = null; }
    const space = mode === 'space';
    const chords = space
      ? [[174.61, 220.0, 261.63], [146.83, 174.61, 220.0], [196.0, 246.94, 293.66], [164.81, 207.65, 246.94]]
      : [[220.0, 261.63, 329.63], [174.61, 220.0, 261.63], [196.0, 246.94, 329.63], [164.81, 196.0, 246.94]];
    const scale = space ? [440, 523.25, 659.25, 783.99, 880, 1046.5] : [440, 523.25, 587.33, 659.25, 783.99, 880];

    // shared delay for sparkle
    const delay = this.ctx.createDelay(1.0);
    delay.delayTime.value = 0.34;
    const fb = this.ctx.createGain();
    fb.gain.value = 0.34;
    const wet = this.ctx.createGain();
    wet.gain.value = 0.5;
    delay.connect(fb).connect(delay);
    delay.connect(wet).connect(this.musicGain);
    this._musicDelay = delay;

    const playChord = () => {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;
      const ch = chords[this._chordIdx % chords.length];
      this._chordIdx++;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(500, t);
      lp.frequency.linearRampToValueAtTime(900, t + 3);
      lp.frequency.linearRampToValueAtTime(420, t + 7.5);
      const cg = this.ctx.createGain();
      cg.gain.setValueAtTime(0.0001, t);
      cg.gain.linearRampToValueAtTime(0.05, t + 2.6);
      cg.gain.linearRampToValueAtTime(0.0001, t + 8);
      lp.connect(cg).connect(this.musicGain);
      for (const f of ch) {
        for (const det of [-1.5, 1.5]) {
          const o = this.ctx.createOscillator();
          o.type = 'sawtooth';
          o.frequency.value = f;
          o.detune.value = det;
          o.connect(lp);
          o.start(t);
          o.stop(t + 8.2);
        }
      }
    };

    const playPluck = () => {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;
      const f = scale[Math.floor(Math.random() * scale.length)];
      const o = this.ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.075, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      o.connect(g);
      g.connect(this.musicGain);
      g.connect(this._musicDelay);
      o.start(t);
      o.stop(t + 1);
    };

    playChord();
    this._musicTimer = setInterval(playChord, 8000);
    this._musicTimer2 = setInterval(playPluck, 2100);
  }

  stopMusic() {
    this._musicMode = null;
    if (this._musicTimer) { clearInterval(this._musicTimer); this._musicTimer = null; }
    if (this._musicTimer2) { clearInterval(this._musicTimer2); this._musicTimer2 = null; }
  }
}
