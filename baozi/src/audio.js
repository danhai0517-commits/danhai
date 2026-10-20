// Tiny WebAudio synth for interaction sounds; off by default.
let ctx = null; let enabled = false; let master = null;
function ensure() { if (!ctx) { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 0.35; master.connect(ctx.destination); } if (ctx.state === 'suspended') ctx.resume(); }
function tone(freq, dur, type = 'sine', gain = 0.6, slide = 0, delay = 0) {
  const o = ctx.createOscillator(), g = ctx.createGain(); const t = ctx.currentTime + delay;
  o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
const sounds = {
  grab: () => tone(620, 0.09, 'triangle', 0.35, 300),
  deposit: () => { tone(880, 0.12, 'sine', 0.4); tone(1320, 0.18, 'sine', 0.35, 0, 0.08); },
  gold: () => { [880, 1108, 1320, 1760].forEach((f, i) => tone(f, 0.22, 'triangle', 0.35, 0, i * 0.07)); },
  dash: () => tone(240, 0.25, 'sawtooth', 0.18, 520),
  join: () => { tone(523, 0.1, 'square', 0.18); tone(784, 0.14, 'square', 0.18, 0, 0.09); },
  squeak: () => tone(1500, 0.12, 'square', 0.12, 600),
  whack: () => { tone(160, 0.12, 'square', 0.35, -100); tone(90, 0.16, 'triangle', 0.3, -50, 0.02); },
  lid: () => tone(300, 0.2, 'triangle', 0.2, 120),
  gift: () => { [659, 784, 988, 1318].forEach((f, i) => tone(f, 0.25, 'sine', 0.3, 0, i * 0.06)); },
  fanfare: () => { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.3, 'triangle', 0.35, 0, i * 0.13)); },
  tick: () => tone(1000, 0.05, 'square', 0.12),
};
const last = {};
export const audio = {
  get enabled() { return enabled; },
  toggle() { enabled = !enabled; if (enabled) ensure(); return enabled; },
  play(name) { if (!enabled || !sounds[name]) return; const now = performance.now(); if (last[name] && now - last[name] < 60) return; last[name] = now; try { ensure(); sounds[name](); } catch { /* ignore audio errors */ } },
};
