/**
 * Lazy WebAudio singleton + a short "tower bell" tone.
 *
 * AudioContext must be created on a user gesture (autoplay policy),
 * so getCtx() is called the first time a tower is clicked, not earlier.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) {
    const Ctx = (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    ctx = new Ctx();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/**
 * Play a brief two-voice chime. `freq` Hz drives the fundamental,
 * which we pair with a fifth (3:2) for richness. Envelope is
 * 8ms attack, 600ms exponential decay — short enough to feel
 * responsive on rapid clicks.
 */
export function playTone(freq: number, durationMs = 600, gain = 0.18) {
  if (typeof window === 'undefined') return;
  const ac = getCtx();
  const now = ac.currentTime;
  const dur = durationMs / 1000;

  const master = ac.createGain();
  master.gain.setValueAtTime(0, now);
  master.gain.linearRampToValueAtTime(gain, now + 0.008);
  master.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  master.connect(ac.destination);

  // soft lowpass for warmth
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 2400;
  filter.Q.value = 0.6;
  filter.connect(master);

  const partials: { freq: number; weight: number; type: OscillatorType }[] = [
    { freq, weight: 1.0, type: 'sine' },
    { freq: freq * 1.5, weight: 0.35, type: 'triangle' },
    { freq: freq * 2.0, weight: 0.12, type: 'sine' },
  ];

  for (const p of partials) {
    const osc = ac.createOscillator();
    osc.type = p.type;
    osc.frequency.value = p.freq;
    const g = ac.createGain();
    g.gain.value = p.weight;
    osc.connect(g).connect(filter);
    osc.start(now);
    osc.stop(now + dur);
  }
}

/**
 * Map a building height (metres) to a pleasant frequency between
 * 220Hz (low) and 880Hz (high) using the A-minor pentatonic scale,
 * so adjacent towers never produce dissonant intervals.
 */
const PENTATONIC_A_MINOR = [220, 247, 294, 330, 392, 440, 494, 588, 660, 784, 880];

export function freqForHeight(metres: number, minH = 150, maxH = 830): number {
  const clamped = Math.max(minH, Math.min(maxH, metres));
  const t = (clamped - minH) / (maxH - minH);
  const idx = Math.round(t * (PENTATONIC_A_MINOR.length - 1));
  return PENTATONIC_A_MINOR[idx];
}
