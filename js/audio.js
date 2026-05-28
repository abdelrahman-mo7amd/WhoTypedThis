
const Audio = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function getCtx() {
  if (!audioCtx) audioCtx = new Audio();
  return audioCtx;
}

function playTone(freq, dur, type = 'sine', vol = 0.2) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  } catch (e) {}
}

function sfxClick()  { playTone(600, 0.08, 'square', 0.1); }
function sfxJoin()   {
  playTone(880, 0.15, 'sine', 0.15);
  setTimeout(() => playTone(1100, 0.2, 'sine', 0.12), 100);
}
function sfxSubmit() {
  playTone(440, 0.1, 'sine', 0.15);
  setTimeout(() => playTone(660, 0.2, 'sine', 0.12), 100);
}
function sfxCorrect() {
  [523, 659, 784, 1047].forEach((f, i) =>
    setTimeout(() => playTone(f, 0.15, 'sine', 0.2), i * 80)
  );
}
function sfxWrong() {
  playTone(200, 0.3, 'sawtooth', 0.15);
  setTimeout(() => playTone(150, 0.3, 'sawtooth', 0.1), 150);
}
function sfxTimerTick()  { playTone(800, 0.05, 'square', 0.05); }
function sfxTimerAlarm() {
  [400, 300].forEach((f, i) =>
    setTimeout(() => playTone(f, 0.12, 'square', 0.2), i * 120)
  );
}
function sfxReveal() {
  playTone(300, 0.08, 'sine', 0.1);
  setTimeout(() => playTone(600, 0.15, 'sine', 0.15), 80);
}
function sfxStart() {
  [261, 329, 392, 523].forEach((f, i) =>
    setTimeout(() => playTone(f, 0.2, 'triangle', 0.18), i * 100)
  );
}
function sfxWinner() {
  [523, 523, 523, 523, 415, 523, 659].forEach((f, i) =>
    setTimeout(() => playTone(f, 0.2, 'triangle', 0.18), i * 120)
  );
}
