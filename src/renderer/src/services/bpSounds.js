let ctx = null;
let enabled = true;

// Constructing an AudioContext boots the OS audio device and blocks the main
// thread for up to ~2.5s on Windows, so warmup() pays that cost during idle
// rather than on the first blip
const ensureCtx = () => {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
};

// A context that is still booting has its clock at 0, and notes scheduled there
// are dropped — so pay a lead-in only until it is genuinely running, otherwise
// every navigation blip would lag by that much
const LEAD_IN = 0.05;
const leadIn = (c) => (c.state === "running" && c.currentTime > 0 ? 0 : LEAD_IN);

const blip = (freq, dur = 0.05, gain = 0.04, slide = 0, delay = 0) => {
  if (!enabled) return;
  try {
    const c = ensureCtx();
    const at = c.currentTime + leadIn(c) + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, at);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), at + dur);
    g.gain.setValueAtTime(gain, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(g).connect(c.destination);
    osc.start(at);
    osc.stop(at + dur);
  } catch {}
};

export const bpSounds = {
  warmup() {
    const run = () => {
      try { ensureCtx(); } catch {}
    };
    if (typeof requestIdleCallback === "function") requestIdleCallback(run, { timeout: 4000 });
    else setTimeout(run, 1500);
  },
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
  enter() {
    blip(523, 0.18, 0.05);
    blip(784, 0.16, 0.045, 0, 0.09);
    blip(1046, 0.3, 0.04, 0, 0.18);
  },
  exit() {
    blip(1046, 0.16, 0.045);
    blip(784, 0.14, 0.04, 0, 0.08);
    blip(523, 0.26, 0.035, 0, 0.16);
  },
};
