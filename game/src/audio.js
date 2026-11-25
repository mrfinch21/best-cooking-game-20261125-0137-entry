// audio.js: every sound the game makes, synthesised with WebAudio.
// One job: small sound effects from oscillators and filtered noise. No files.
// The context is created on the first user gesture; before that every call is a no-op,
// so the game also runs silent in a headless browser taking screenshots.

let context = null;
let master = null;
let muted = false;

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.5;
  return muted;
}

/** Call from a user gesture (click or key) so the browser allows sound. */
export function unlockAudio() {
  if (context) {
    if (context.state === 'suspended') context.resume();
    return;
  }
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    context = new Ctor();
    master = context.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(context.destination);
  } catch (_error) {
    context = null;
  }
}

function tone(freq, seconds, type, volume, slideTo) {
  if (!context || !master || muted) return;
  try {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, context.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, context.currentTime + seconds);
    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + seconds);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(context.currentTime + seconds + 0.02);
  } catch (_error) {
    // Sound is garnish: a failure here must never break the game.
  }
}

function noise(seconds, volume, lowpass) {
  if (!context || !master || muted) return;
  try {
    const length = Math.max(1, Math.floor(context.sampleRate * seconds));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + seconds);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start();
  } catch (_error) {
    // Sound is garnish.
  }
}

export const sfx = {
  pickup() { tone(520, 0.07, 'sine', 0.25, 760); },
  putdown() { tone(340, 0.06, 'sine', 0.2, 260); },
  chop() { noise(0.06, 0.5, 900); tone(180, 0.05, 'square', 0.12, 120); },
  chopped() { tone(660, 0.09, 'triangle', 0.25, 880); },
  sizzle() { noise(0.25, 0.18, 3200); },
  grillDone() { tone(880, 0.12, 'sine', 0.22, 1174); },
  burnt() { tone(220, 0.25, 'sawtooth', 0.15, 110); },
  serve() { tone(660, 0.1, 'triangle', 0.3); setTimeout(() => tone(880, 0.14, 'triangle', 0.3), 90); },
  coin() { tone(1180, 0.08, 'sine', 0.22, 1560); },
  wrong() { tone(160, 0.18, 'square', 0.18, 120); },
  lost() { tone(392, 0.2, 'triangle', 0.2, 196); },
  tick() { tone(980, 0.05, 'square', 0.1); },
  start() { tone(523, 0.1, 'triangle', 0.25); setTimeout(() => tone(659, 0.1, 'triangle', 0.25), 100); setTimeout(() => tone(784, 0.16, 'triangle', 0.25), 200); },
  end() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'triangle', 0.25), i * 120)); },
};
