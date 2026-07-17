// Tiny WebAudio blips for Big Picture navigation — no assets, ~50ms each.
// The AudioContext is created lazily on first use (requires a user gesture,
// which pad/keyboard input satisfies).
let ctx = null;
let enabled = true;

const ensureCtx = () => {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
};

const blip = (freq, dur = 0.05, gain = 0.04, slide = 0) => {
  if (!enabled) return;
  try {
    const c = ensureCtx();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, c.currentTime);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), c.currentTime + dur);
    g.gain.setValueAtTime(gain, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    osc.connect(g).connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + dur);
  } catch {
    /* audio unavailable — stay silent */
  }
};

export const bpSounds = {
  setEnabled(value) {
    enabled = !!value;
  },
  isEnabled() {
    return enabled;
  },
  tick() {
    blip(2100, 0.03, 0.02);
  },
  confirm() {
    blip(880, 0.07, 0.045, 440);
  },
  back() {
    blip(600, 0.06, 0.035, -180);
  },
  section() {
    blip(1250, 0.05, 0.03, 350);
  },
};
