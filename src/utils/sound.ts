// Procedural Web Audio API sound synthesizer for tactile tile & card feedback.

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  setMuted(muted: boolean) {
    this.muted = muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      if (!this.ctx) {
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'triangle', gainPeak = 0.08, delay = 0) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playTileTap() {
    const jitter = 0.94 + Math.random() * 0.12;
    this.playTone(520 * jitter, 0.06, 'triangle', 0.07);
  }

  playTileRemove() {
    this.playTone(340, 0.055, 'sine', 0.055);
  }

  playCardFlip(index: number) {
    const notes = [440, 493.88, 554.37, 659.25];
    this.playTone(notes[index % notes.length], 0.08, 'sine', 0.06, index * 0.075);
  }

  playRungSolved() {
    this.playTone(523.25, 0.14, 'triangle', 0.08, 0);
    this.playTone(659.25, 0.22, 'triangle', 0.09, 0.08);
  }

  playHintReveal(tier: number) {
    const base = tier === 1 ? 587.33 : tier === 2 ? 698.46 : 783.99;
    this.playTone(base, 0.16, 'sine', 0.07, 0);
    this.playTone(base * 1.25, 0.2, 'sine', 0.05, 0.07);
  }

  playErrorShake() {
    this.playTone(155, 0.12, 'sawtooth', 0.04, 0);
    this.playTone(125, 0.14, 'sawtooth', 0.035, 0.06);
  }

  playVictoryFanfare() {
    const chord = [523.25, 659.25, 783.99, 987.77, 1046.5];
    chord.forEach((freq, idx) => {
      this.playTone(freq, 0.28, 'triangle', 0.08, idx * 0.09);
    });
  }
}

export const soundEngine = new SoundEngine();
