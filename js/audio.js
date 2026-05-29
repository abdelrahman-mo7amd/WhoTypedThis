const AudioCtx = window.AudioContext || window.webkitAudioContext;
let ctx = null;

function getCtx() {
    if (!ctx) ctx = new AudioCtx();
    return ctx;
}

function playTone(freq, dur, type = 'sine', vol=0.2){
    try {
        const c = getCtx();
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        g.gain.setValueAtTime(vol, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
        osc.connect(g);
        g.connect(c.destination);
        osc.start();
        osc.stop(c.currentTime + dur);
    } catch (_) {}
}

export const Audio = {
  click()      { playTone(600,  .08, 'square',   .10); },
  join()       { playTone(880,  .15, 'sine',      .15); setTimeout(() => playTone(1100, .2, 'sine', .12), 100); },
  submit()     { playTone(440,  .10, 'sine',      .15); setTimeout(() => playTone(660,  .2, 'sine', .12), 100); },
  correct()    { [523,659,784,1047].forEach((f, i) => setTimeout(() => playTone(f, .15, 'sine', .20), i * 80)); },
  wrong()      { playTone(200,  .30, 'sawtooth',  .15); setTimeout(() => playTone(150, .3, 'sawtooth', .10), 150); },
  timerTick()  { playTone(800,  .05, 'square',    .05); },
  timerAlarm() { [400,300].forEach((f, i) => setTimeout(() => playTone(f, .12, 'square', .20), i * 120)); },
  reveal()     { playTone(300,  .08, 'sine',      .10); setTimeout(() => playTone(600, .15, 'sine', .15), 80); },
  start()      { [261,329,392,523].forEach((f, i) => setTimeout(() => playTone(f, .2, 'triangle', .18), i * 100)); },
  winner()     { [523,523,523,523,415,523,659].forEach((f, i) => setTimeout(() => playTone(f, .2, 'triangle', .18), i * 120)); },
  notif()      { playTone(1000, .06, 'sine',      .12); setTimeout(() => playTone(1200, .1, 'sine', .10), 80); },
};

window.Audio = Audio;
