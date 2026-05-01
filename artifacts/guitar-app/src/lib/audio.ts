let audioCtx: AudioContext | null = null;

function getContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

export function midiToFreq(midi: number) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// ---------------------------------------------------------------------------
// Karplus-Strong plucked string synthesis — realistic guitar tone
// ---------------------------------------------------------------------------
interface ActiveString {
  source: AudioBufferSourceNode;
  gain: GainNode;
  feedback: GainNode;
}
const activeStrings = new Map<number, ActiveString>();

export function playGuitarString({
  midi,
  duration = 4,
  velocity = 0.72,
  stringId,
}: {
  midi: number;
  duration?: number;
  velocity?: number;
  stringId?: number;
}) {
  const ctx = getContext();
  const freq = midiToFreq(midi);
  const now = ctx.currentTime;

  // Silence existing note on the same string
  if (stringId !== undefined && activeStrings.has(stringId)) {
    const prev = activeStrings.get(stringId)!;
    try {
      prev.gain.gain.cancelScheduledValues(now);
      prev.gain.gain.setValueAtTime(0.001, now);
      prev.feedback.gain.value = 0;
    } catch (_) { /* ignore */ }
    activeStrings.delete(stringId);
  }

  const delayTime = 1 / freq;

  // ── Excitation: one period of shaped noise ──────────────────────────────
  const numSamples = Math.max(2, Math.ceil(ctx.sampleRate * delayTime));
  const noiseBuffer = ctx.createBuffer(1, numSamples, ctx.sampleRate);
  const nd = noiseBuffer.getChannelData(0);
  for (let i = 0; i < numSamples; i++) {
    // Pluck shape: slight decay within excitation window
    nd[i] = (Math.random() * 2 - 1) * (1 - i / numSamples);
  }
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;

  // ── Feedback delay (one period) ──────────────────────────────────────────
  const delay = ctx.createDelay(1.0);
  delay.delayTime.value = delayTime;

  // ── Smoothing / averaging filter in feedback (string damping) ───────────
  const lpf = ctx.createBiquadFilter();
  lpf.type = "lowpass";
  // Lower strings decay slower → higher cutoff
  lpf.frequency.value = Math.min(freq * 7, 14000);
  lpf.Q.value = 0.5;

  // ── Feedback gain (< 1 → exponential decay) ─────────────────────────────
  const fbGain = createFeedbackGain(ctx, freq);

  // ── Body EQ: slight warmth boost around 200 Hz ──────────────────────────
  const bodyEq = ctx.createBiquadFilter();
  bodyEq.type = "peaking";
  bodyEq.frequency.value = 200;
  bodyEq.gain.value = 3;
  bodyEq.Q.value = 1.2;

  // ── Master output gain with fade-out ────────────────────────────────────
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(velocity, now);
  masterGain.gain.setValueAtTime(velocity, now + duration * 0.65);
  masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  // ── Soft compressor ─────────────────────────────────────────────────────
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -22;
  comp.knee.value = 8;
  comp.ratio.value = 3;
  comp.attack.value = 0.004;
  comp.release.value = 0.12;

  // ── Connections ─────────────────────────────────────────────────────────
  // KS feedback loop: source → delay → lpf → fbGain → delay (cycle)
  source.connect(delay);
  delay.connect(lpf);
  lpf.connect(fbGain);
  fbGain.connect(delay); // ← feedback cycle (allowed: DelayNode in path)
  // Output branch: lpf → bodyEq → masterGain → comp → out
  lpf.connect(bodyEq);
  bodyEq.connect(masterGain);
  masterGain.connect(comp);
  comp.connect(ctx.destination);

  source.start(now);

  // Silence feedback after note ends
  fbGain.gain.setValueAtTime(fbGain.gain.value, now + duration * 0.9);
  fbGain.gain.linearRampToValueAtTime(0, now + duration + 0.1);

  if (stringId !== undefined) {
    activeStrings.set(stringId, { source, gain: masterGain, feedback: fbGain });
    source.onended = () => {
      if (activeStrings.get(stringId)?.source === source) {
        activeStrings.delete(stringId);
      }
    };
  }
}

/** Tune the Karplus-Strong feedback coefficient to the string frequency */
function createFeedbackGain(ctx: AudioContext, freq: number): GainNode {
  const g = ctx.createGain();
  // Lower-pitched strings sustain longer
  if (freq < 100)      g.gain.value = 0.997;
  else if (freq < 200) g.gain.value = 0.996;
  else if (freq < 400) g.gain.value = 0.994;
  else if (freq < 800) g.gain.value = 0.991;
  else                 g.gain.value = 0.988;
  return g;
}

// ---------------------------------------------------------------------------
// Legacy simple playNote kept for StrumPattern compatibility
// ---------------------------------------------------------------------------
interface ActiveOsc { osc: OscillatorNode; gain: GainNode }
const activeOscillators = new Map<number, ActiveOsc>();

export function playNote({
  midi,
  duration = 1.5,
  stringId,
}: {
  midi: number;
  duration?: number;
  stringId?: number;
}) {
  const ctx = getContext();
  if (stringId !== undefined && activeOscillators.has(stringId)) {
    const active = activeOscillators.get(stringId)!;
    active.gain.gain.cancelScheduledValues(ctx.currentTime);
    active.gain.gain.setValueAtTime(active.gain.gain.value, ctx.currentTime);
    active.gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    active.osc.stop(ctx.currentTime + 0.05);
    activeOscillators.delete(stringId);
  }
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(midiToFreq(midi), ctx.currentTime);
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
  if (stringId !== undefined) {
    activeOscillators.set(stringId, { osc, gain: gainNode });
    osc.onended = () => {
      if (activeOscillators.get(stringId)?.osc === osc) {
        activeOscillators.delete(stringId);
      }
    };
  }
}

export function stopAll() {
  const ctx = getContext();
  for (const { gain } of activeOscillators.values()) {
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
  }
  activeOscillators.clear();
  for (const { gain, feedback } of activeStrings.values()) {
    try {
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      feedback.gain.value = 0;
    } catch (_) { /* ignore */ }
  }
  activeStrings.clear();
}
