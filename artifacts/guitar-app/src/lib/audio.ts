let audioCtx: AudioContext | null = null;

function getContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

const activeOscillators = new Map<number, { osc: OscillatorNode; gain: GainNode }>();

function midiToFreq(midi: number) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function playNote({ midi, duration = 1.5, stringId }: { midi: number; duration?: number; stringId?: number }) {
  const ctx = getContext();
  
  // Stop existing note on the same string
  if (stringId !== undefined && activeOscillators.has(stringId)) {
    const active = activeOscillators.get(stringId);
    if (active) {
      active.gain.gain.cancelScheduledValues(ctx.currentTime);
      active.gain.gain.setValueAtTime(active.gain.gain.value, ctx.currentTime);
      active.gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      active.osc.stop(ctx.currentTime + 0.05);
      activeOscillators.delete(stringId);
    }
  }

  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  // Plucked string approximation
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(midiToFreq(midi), ctx.currentTime);

  // Envelope
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.02); // Fast attack
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration); // Long decay/release

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);

  if (stringId !== undefined) {
    activeOscillators.set(stringId, { osc, gain: gainNode });
    
    // Clean up
    osc.onended = () => {
      if (activeOscillators.get(stringId)?.osc === osc) {
        activeOscillators.delete(stringId);
      }
    };
  }
}

export function stopAll() {
  const ctx = getContext();
  for (const [id, active] of activeOscillators.entries()) {
    active.gain.gain.cancelScheduledValues(ctx.currentTime);
    active.gain.gain.setValueAtTime(active.gain.gain.value, ctx.currentTime);
    active.gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    active.osc.stop(ctx.currentTime + 0.05);
  }
  activeOscillators.clear();
}
