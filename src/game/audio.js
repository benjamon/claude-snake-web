let audioCtx = null;
let masterGain = null;

export function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.45;
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function makeOsc(type = 'sine', freq, start, stop, gain, gStart = null, gEnd = null, freqEnd = null) {
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type;
  osc.connect(g); g.connect(masterGain);
  osc.frequency.setValueAtTime(freq, start);
  if (freqEnd !== null) osc.frequency.linearRampToValueAtTime(freqEnd, stop);
  g.gain.setValueAtTime(gStart ?? gain, start);
  if (gEnd !== null) g.gain.linearRampToValueAtTime(gEnd, stop);
  osc.start(start); osc.stop(stop);
  return osc;
}

export function sndEat() {
  ensureAudio(); const t = audioCtx.currentTime, dur = 0.10;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.connect(g); g.connect(masterGain);
  osc.frequency.setValueAtTime(300, t);
  osc.frequency.linearRampToValueAtTime(1050, t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.50, t + dur * 0.08);
  g.gain.linearRampToValueAtTime(0, t + dur);
  osc.start(t); osc.stop(t + dur);
}

export function sndDie() {
  ensureAudio(); const t = audioCtx.currentTime;
  const o1 = audioCtx.createOscillator();
  const o2 = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o1.connect(g); o2.connect(g); g.connect(masterGain);
  o1.type = 'sine'; o2.type = 'square';
  [o1, o2].forEach(o => {
    o.frequency.setValueAtTime(380, t);
    o.frequency.exponentialRampToValueAtTime(68, t + 0.55);
  });
  g.gain.setValueAtTime(0.45, t); g.gain.linearRampToValueAtTime(0, t + 0.55);
  o1.start(t); o1.stop(t + 0.55); o2.start(t); o2.stop(t + 0.55);
}

export function sndVictory() {
  ensureAudio(); const t = audioCtx.currentTime;
  [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
    const st = t + i * 0.20;
    makeOsc('sine', freq, st, st + 0.35, 0.35, 0.35, 0.001);
  });
}

export function sndPortal() {
  ensureAudio(); const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.connect(g); g.connect(masterGain);
  osc.frequency.setValueAtTime(80, t);
  osc.frequency.exponentialRampToValueAtTime(1800, t + 0.45);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.38, t + 0.02);
  g.gain.setValueAtTime(0.38, t + 0.29);
  g.gain.linearRampToValueAtTime(0, t + 0.45);
  osc.start(t); osc.stop(t + 0.45);
}

export function sndTunnelPickup() {
  ensureAudio(); const t = audioCtx.currentTime, dur = 0.18;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.connect(g); g.connect(masterGain);
  osc.frequency.setValueAtTime(600, t);
  osc.frequency.linearRampToValueAtTime(2400, t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.35, t + dur * 0.06);
  g.gain.linearRampToValueAtTime(0, t + dur);
  osc.start(t); osc.stop(t + dur);
}

export function sndTunnelActivate() {
  ensureAudio(); const t = audioCtx.currentTime;
  makeOsc('sine', 80, t, t + 0.15, 0.5, 0.5, 0.001, 40);
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = 'sawtooth'; osc.connect(g); g.connect(masterGain);
  osc.frequency.setValueAtTime(300, t); osc.frequency.linearRampToValueAtTime(900, t + 0.30);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.28, t + 0.05);
  g.gain.linearRampToValueAtTime(0, t + 0.30);
  osc.start(t); osc.stop(t + 0.30);
}

export function sndHaloPickup() {
  ensureAudio(); const t = audioCtx.currentTime;
  [[880, 0.32], [1320, 0.18], [1760, 0.10]].forEach(([f, a]) =>
    makeOsc('sine', f, t, t + 0.40, a, a, 0.001)
  );
}

export function sndHaloSave() {
  ensureAudio(); const t = audioCtx.currentTime;
  [[523.25, 0.32], [659.25, 0.22], [1046.50, 0.16], [1318.51, 0.08]].forEach(([f, a]) => {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.connect(g); g.connect(masterGain);
    osc.frequency.value = f;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    osc.start(t); osc.stop(t + 0.55);
  });
}

export function sndHaloSpawn() {
  ensureAudio(); const t = audioCtx.currentTime;
  // Sustained holy chorus: stacked fifths with slow swell
  [[523.25, 0.14], [659.25, 0.10], [783.99, 0.08], [530, 0.12], [665, 0.08]].forEach(([f, a]) => {
    const osc = audioCtx.createOscillator(), g = audioCtx.createGain();
    osc.connect(g); g.connect(masterGain);
    osc.frequency.value = f;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(a, t + 0.15);
    g.gain.setValueAtTime(a, t + 0.5);
    g.gain.linearRampToValueAtTime(0, t + 0.8);
    osc.start(t); osc.stop(t + 0.8);
  });
}

export function sndDeathBlockSpawn() {
  ensureAudio(); const t = audioCtx.currentTime;
  // Short ominous thud with low rumble
  makeOsc('sawtooth', 65, t, t + 0.2, 0.2, 0.2, 0.001, 40);
  makeOsc('sine', 90, t, t + 0.15, 0.15, 0.15, 0.001, 50);
}

export function sndWallWarning() {
  ensureAudio(); const t = audioCtx.currentTime;
  // Quick warning beep
  makeOsc('square', 880, t, t + 0.06, 0.18, 0.18, 0.001);
  makeOsc('square', 880, t + 0.1, t + 0.16, 0.18, 0.18, 0.001);
}

export function sndTunnelSpawn() {
  ensureAudio(); const t = audioCtx.currentTime;
  // Soft shimmer: two detuned sines sweeping up
  makeOsc('sine', 400, t, t + 0.25, 0.18, 0.18, 0.001, 800);
  makeOsc('sine', 410, t + 0.03, t + 0.28, 0.12, 0.12, 0.001, 820);
}

export function sndPortalSpawn() {
  ensureAudio(); const t = audioCtx.currentTime;
  // Deep warble rising into a chime
  makeOsc('sine', 120, t, t + 0.3, 0.22, 0.22, 0.001, 400);
  makeOsc('triangle', 600, t + 0.15, t + 0.45, 0.15, 0.15, 0.001, 1200);
}

export function sndCrownShatter() {
  ensureAudio(); const t = audioCtx.currentTime;
  // Glass-like shatter: high freq burst with noise-like harmonics
  makeOsc('square', 2200, t, t + 0.08, 0.25, 0.25, 0.001, 800);
  makeOsc('sawtooth', 3400, t, t + 0.12, 0.15, 0.15, 0.001, 600);
  makeOsc('sine', 1600, t + 0.02, t + 0.15, 0.2, 0.2, 0.001, 400);
  // Low thud underneath
  makeOsc('sine', 120, t, t + 0.1, 0.2, 0.2, 0.001, 60);
}

export function sndDeathHit() {
  ensureAudio(); const t = audioCtx.currentTime;
  makeOsc('square', 180, t, t + 0.08, 0.3, 0.3, 0.001, 90);
  makeOsc('sawtooth', 260, t, t + 0.06, 0.2, 0.2, 0.001, 120);
}

export function sndDeathFinale() {
  ensureAudio(); const t = audioCtx.currentTime;
  makeOsc('sawtooth', 100, t, t + 0.4, 0.35, 0.35, 0.001, 40);
  makeOsc('square', 200, t, t + 0.35, 0.2, 0.2, 0.001, 60);
  makeOsc('sine', 150, t + 0.05, t + 0.45, 0.25, 0.25, 0.001, 30);
}

// ---- Background music ----
let bgAudio = null;
let bgRunning = false, bgTimer = null;
let bgUsingFile = false;

function bgPickSrc() {
  const tmp = new Audio();
  const candidates = [['bgmusic.ogg', 'audio/ogg'], ['bgmusic.mp3', 'audio/mpeg'], ['bgmusic.wav', 'audio/wav']];
  for (const [file, mime] of candidates) {
    if (tmp.canPlayType(mime) !== '') return file;
  }
  return null;
}

const BG_BPM = 120, BG_SPB = 60 / BG_BPM, BG_LOOP = 8 * BG_SPB * 1000;
const BG_MEL = [[261.63, 0, 0.85], [329.63, 1, 0.85], [392.00, 2, 0.85], [523.25, 3, 0.85],
  [392.00, 4, 0.85], [329.63, 5, 0.85], [261.63, 6, 1.80]];
const BG_BASS = [[130.81, 0, 0.45], [130.81, 2, 0.45], [98.00, 4, 0.45], [130.81, 6, 0.45]];

function bgScheduleLoop() {
  if (!bgRunning || !audioCtx) return;
  const now = audioCtx.currentTime;
  const addNote = (freq, beat, durBeats, amp) => {
    const t = now + beat * BG_SPB, dur = durBeats * BG_SPB * 0.85;
    const osc = audioCtx.createOscillator(), g = audioCtx.createGain();
    osc.connect(g); g.connect(masterGain);
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(amp, t + 0.02);
    g.gain.setValueAtTime(amp, t + dur * 0.65);
    g.gain.linearRampToValueAtTime(0, t + dur);
    osc.start(t); osc.stop(t + dur + 0.05);
  };
  BG_MEL.forEach(([f, b, d]) => addNote(f, b, d, 0.14));
  BG_BASS.forEach(([f, b, d]) => addNote(f, b, d, 0.20));
  bgTimer = setTimeout(bgScheduleLoop, BG_LOOP - 100);
}

export async function startBgMusic() {
  if (bgRunning) return;
  ensureAudio(); bgRunning = true;
  const src = bgPickSrc();
  if (src) {
    if (!bgAudio) {
      bgAudio = new Audio();
      bgAudio.loop = true;
      bgAudio.volume = 0.45;
      bgAudio.src = src;
    }
    try {
      await bgAudio.play();
      bgUsingFile = true;
      return;
    } catch (e) {
      console.warn('[bgm] file playback failed, using synth:', e.message);
    }
  }
  bgScheduleLoop();
}

export function stopBgMusic() {
  bgRunning = false;
  if (bgAudio && bgUsingFile) { bgAudio.pause(); }
  if (bgTimer) { clearTimeout(bgTimer); bgTimer = null; }
}
