/* =====================================================================
   GRIND HOUSE — synth SFX (no audio files; pure WebAudio)
   Crunchy, satisfying blips for buy / upgrade / merge / ship / pull.
   ===================================================================== */
let ctx = null, enabled = false, master = null;

export function init(on) {
  enabled = !!on;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.22; master.connect(ctx.destination);
  } catch (_) { ctx = null; }
  // resume on first gesture (autoplay policy)
  const resume = () => { if (ctx && ctx.state === "suspended") ctx.resume(); window.removeEventListener("pointerdown", resume); };
  window.addEventListener("pointerdown", resume);
}
export function setEnabled(on) { enabled = !!on; }

function tone(freq, dur, type = "square", vol = 1, slide = 0) {
  if (!enabled || !ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}

const SFX = {
  buy:      () => { tone(420, 0.08, "square", 0.7, 1.6); },
  upgrade:  () => { tone(523, 0.10, "triangle", 0.8, 1.5); tone(784, 0.12, "triangle", 0.5, 1.4); },
  merge:    () => { tone(330, 0.12, "sawtooth", 0.7, 2.2); setTimeout(() => tone(660, 0.18, "sawtooth", 0.7, 1.6), 70); },
  ship:     () => { [262, 330, 392, 523, 659].forEach((f, i) => setTimeout(() => tone(f, 0.22, "sawtooth", 0.7, 1.2), i * 60)); },
  pull:     () => { tone(600, 0.10, "square", 0.6, 1.4); },
  legendary:() => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.25, "triangle", 0.7, 1.1), i * 80)); },
  achieve:  () => { tone(784, 0.10, "triangle", 0.7); setTimeout(() => tone(1175, 0.16, "triangle", 0.6), 90); },
  collect:  () => { [400, 600, 900].forEach((f, i) => setTimeout(() => tone(f, 0.10, "square", 0.5, 1.5), i * 45)); },
  err:      () => { tone(160, 0.12, "sawtooth", 0.5, 0.7); },
};
export function play(name) { try { (SFX[name] || (() => {}))(); } catch (_) {} }
