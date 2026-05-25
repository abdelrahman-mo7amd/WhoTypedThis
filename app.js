// Audio Engine (Web audio api)

const Audio = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
function getCtx() {
    if(!audioCtx) {
        audioCtx = new Audio(); 
        return audioCtx;
    }
}

function playTone(freq, dur, type='sine', vol=0.2) {
    try {
        const ctx=getCtx(), osc=ctx.createOscillator(), g=ctx.createGain();
        osc.type=type; 
        osc.frequency.value=freq;
        g.gain.setValueAtTime(vol, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+dur);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime+dur);
    } catch (e) {}
}


function sfxClick(){ playTone(600,.08,'square',.1); }
function sfxJoin(){ playTone(880,.15,'sine',.15); setTimeout(()=>playTone(1100,.2,'sine',.12),100); }
function sfxSubmit(){ playTone(440,.1,'sine',.15); setTimeout(()=>playTone(660,.2,'sine',.12),100); }
function sfxCorrect(){
  [523,659,784,1047].forEach((f,i)=>setTimeout(()=>playTone(f,.15,'sine',.2),i*80));
}
function sfxWrong(){ playTone(200,.3,'sawtooth',.15); setTimeout(()=>playTone(150,.3,'sawtooth',.1),150); }
function sfxTimerTick(){ playTone(800,.05,'square',.05); }
function sfxTimerAlarm(){ [400,300].forEach((f,i)=>setTimeout(()=>playTone(f,.12,'square',.2),i*120)); }
function sfxReveal(){ playTone(300,.08,'sine',.1); setTimeout(()=>playTone(600,.15,'sine',.15),80); }
function sfxStart(){
  [261,329,392,523].forEach((f,i)=>setTimeout(()=>playTone(f,.2,'triangle',.18),i*100));
}
function sfxWinner(){
  const notes=[523,523,523,523,415,523,659];
  notes.forEach((f,i)=>setTimeout(()=>playTone(f,.2,'triangle',.18),i*120));
}


// STORAGE / Multiplayer Engine

const ROOM_KEY = code => `wtt_room_${code}`;
const GLOBAL_KEY = 'wtt_active_rooms';

async function getRoom(code){
  try {
    const r = await window.Storage.get(ROOM_KEY(code));
    return r ? JSON.parse(r.value) : null;

  } catch (e) { return null;}
}

async function setRoom(code, data){
  try {
    await window.Storage.set(ROOM_KEY(code), JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

async function patchRoom(code, fn) {
  const room = await getRoom(code);
  if(!room) return false;
  fn(room);
  return await setRoom(code, room);
}

async function registerRoom(code, name) {
  try {
    const existing = await window.Storage.get(GLOBAL_KEY);
    const rooms = existing ? JSON.parse(existing.value) : {} ;
    const now = Date.now();
    Object.keys(rooms).forEach(k=> {if (now - rooms[k].ts > 10800000) delete rooms[k]; });
    rooms[code] = {name, ts:now, code};
    await window.storage.set(GLOBAL_KEY, JSON.stringify(rooms));
  } catch (e) {}
}

async function getLiveRoomCount() {
  try {
    const existing = await window.storage.get(GLOBAL_KEY);
    if(!existing) return 0;
    const rooms = JSON.parse(existing.value);
    const now = Date.now();
    return Object.values(rooms).filter(r=>now-r.ts<10800000).length;
  } catch (e) { return 0; }
}

// STATE

const AVATARS = ['🐸','🦊','🐙','🦋','🦁','🐼','🐨','🦄','🦀','🐬','🦔','🐲','🦝','🦩','🐯','🦖'];
const COLORS  = ['#ffe44d','#4dffa0','#4da6ff','#ff8c4d','#b44dff','#ff4dbf','#4dfff0','#ff4d6a'];

let S = {
  myId: null, myName: '', roomCode: '', roomName: '',
  isHost: false, rounds: 3, timerSec: 20,
  timerInterval: null, guessLocked: false, storageKey: null,
  polling: null, lastRound: -1,
};

// SCREENS

function showScreen(id) {
  sfxClick();
  document.querySelectorAll('.screen').forEach(s=> s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// CONNECTION
function setConn(state){
  const dot = document.getElementById('conn-dot');
  const lbl = document.getElementById('conn-label');
  if (state === 'online') { dot.className='conn-dot online'; lbl.textContent='online';} 
  else if (state==='error'){dot.className='conn-dot error'; lbl.textContent = 'error';}
  else { dot.className='conn-dot'; lbl.textContent='offline';}
}

(async()=>{
  try {
    await window.storage.set('wtt_ping', '1');
    setConn('online');
    const count = await getLiveRoomCount();
    document.getElementById('live-rooms-count').textContent = count > 0 ? `${count} live room${count!==1?'s':''} right now 🔴`: 'Be the first to play today!';
  } catch (e) {
    setConn('error');
    document.getElementById('live-rooms-count').textContent = 'Storage unavailable - tab-local mode';
  }
})();

// HOME / CREATE / JOIN

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({length:6}, ()=> chars[Math.floor(Math.random()*chars.length)]).join('');
}

async function createRoom(){
  const name = document.getElementById('create-name').value.trim();
  const roomName = document.getElementById('create-room').value.trim();
  const rounds = parseInt(document.getElementById('create-rounds').value);
  const timer = parseInt(document.getElementById('create-timer').value);
  if (!name) return toast ('Enter your name 😅','bad');
  if (!roomName) return toast('Give the room a name', 'bad');

  const code = genCode();
  const myId = 'p_'+Date.now()+'_'+Math.random().toString(36).slice(2,6);
  const avatar = AVATARS[Math.floor(Math.random()*AVATARS.length)];
  const color = COLORS[0];

  S.myId = myId;
  S.myName = name;
  S.roomCode = code;
  S.roomName = roomName;
  S.isHost = true;
  S.rounds = rounds;
  S.timerSec = timer;

  const roomData = {
    code, name: roomName, rounds, timerSec:timer,
    phase:'lobby',
    players: [{id:myId, name, avatar, color, score:0}],
    prompts: [], currentRound:0,
    assignments:{}, promptsDone: [], guessesDone:[],
    roundGuesses:{}, roundHistory: [],
    createdAt: Date.now(),
  };

  const ok = await setRoom(code, roomData);
  if(!ok) return toast('Failed to create room - check connection', 'bad');

  await registerRoom(code, roomName);
  sfxStart(),
  enterLobby();
}

async function joinRoom() {
  const name = document.getElementById('join-name').value.trim();
  const code = document.getElementById('join-code').value.trim().toUpperCase();
  if(!name) return toast('Enter your name 😅', 'bad');
  if(code.length < 4) return toast('Enter a valid room code', 'bad');

  const room = await getRoom(code);
  if(!room) return toast("Room not found - check the code 🤔", 'bad');
  if(room.phase !== 'lobby') return toast('Game already started - too late! 😬', 'bad');

  const idx = room.players.length;
  const myId = 'p_'+Date.now()+'_'+Math.random().toString(36).slice(2,6);
  const avatar = AVATARS[idx % AVATARS.length];
  const color = COLORS[idx % COLORS.length];

  S.myId = myId;
  S.myName = name;
  S.roomCode = code;
  S.roomName = room.name;
  S.isHost = false;
  S.rounds = room.rounds;
  S.timerSec = room.timerSec || 20;

  room.players.push({id:myId, name, avatar, color, score:0});
  const ok = await setRoom(code, room);
  if(!ok) return toast("Failed to join - try again", 'bad');

  sfxJoin();
  enterLobby();
}

// LOBBY

function enterLobby(){
  showScreen('screen-lobby');
  const code = S.roomCode;
  document.getElementById('lobby-code-text').textContent = code;
  document.getElementById('lobby-code-big').textContent = code;
  document.getElementById('lobby-code-nav').textContent = code+' 📋';

  if(S.isHost){
    document.getElementById('lobby-host-zone').style.display = 'block';
    document.getElementById('lobby-guest-zone').style.display = 'none';
  }
  else {
    document.getElementById('lobby-host-zone').style.display = 'none';
    document.getElementById('lobby-guest-zone').style.display = 'block';
  }

  renderLobby();
  startPolling(onLobbyPoll);
}

async function renderLobby(){
  const room = await getRoom(s.roomCode);
  if(!room) return;
  document.getElementById('lobby-title').textContent = room.name+' 🎮';
  document.getElementById('lobby-sub').textContent = `${room.players.length} player${room.players.length!==1?'s':''} joined — waiting for host to start`;

  const list = document.getElementById('lobby-players');
  list.innerHTML = '';
  room.players.forEach((p,i) => {
    const el = document.createElement('div');
    el.className = 'player-item';
    const isMe = p.id === S.myId;
    el.innerHTML = `
    <div class="player-avatar" style="background:${p.color}22; font-size:22px;">${p.avatar}</div>
    <div class="player-name">${p.name}</div>
    ${i===0?'<span class="player-badge badge-host">👑 HOST</span>':''}
    ${isMe? '<span class="player-badge - badge-you">YOU</span>':''}
    `;

    list.appendChild(el);
  });

  const startBtn = document.getElementById('start-btn');
  if(startBtn){
    const can = room.players.length >= 2;
    startBtn.disabled=!can;
    startBtn.textContent = can
      ? `🚀 Start Game - ${room.players.length} players ready!`
      : `Need ${2-room.players.length} more player${2-room.players.length!==1?'s':''}`;
  }
}

async function onLobbyPoll(){
  const room = await getRoom(S.roomCode);
  if(!room) return;
  renderLobby();
  if(room.phase ==='prompting') {stopPolling(); enterPrompting(); }
}

async function startGame() {
  const room = await getRoom(S.roomCode);
  if(!room || room.players.length <2) return toast("Need at least 2 players", "bad");

  const n = room.players.length;
  const assignments = {};
  room.players.forEach((p,i)=> {
    assignments[p.id] = room.players[(i+1)%n].id;
  });

  await patchRoom(S.roomCode, r=>{
    r.phase = 'prompting';
    r.assignments = assignments;
    r.promptsDone = [];
    r.prompts = [];
    r.currentRound = 0;
    r.guessesDone = [];
    r.roundGuesses = {};
    r.roundHistory = [];
    r.players.forEach(p=>p.score=0);
  });

  sfxStart();
}

// Prompting Phase

async function enterPrompting(){
  const room = await getRoom(S.roomCode);
  if(!room) return;

  const aboutId = room.assignments[S.myId];
  const about = room.players.find(p=>p.id===aboutId);

  document.getElementById('prompt-target-name').textContent = (about?about.name:'???') + '  ' + (about?about.avatar:'');
  document.getElementById('prompt-code-nav').textContent = S.roomCode;

  const inp = document.getElementById('prompt-input');
  inp.value = '';
  inp.disabled = false;
  document.getElementById('submit-prompt-btn').disabled = false;
  updateCharCount();
  renderPromptWaiting(room);

  showScreen('screen-prompt');
  startPolling(onPromptPoll);
}

function useHint(text) {
  const inp = document.getElementById('prompt-input');
  inp.value = text;
  updateCharCount();
  inp.focus();
}

function updateCharCount(){
  const v = document.getElementById('prompt-input').value;
  const cc = document.getElementById('char-count');
  const fill = document.getElementById('char-bar-fill');
  const pct = Math.min(100, v.length/100*100);
  cc.textContent = `${v.length} / 100`;
  fill.style.width = pct+'%';
  fill.style.background = pct>90?'var(--red)':pct>70?'var(--orange)':'var(--purple)';
}

function renderPromptWaiting(room) {
  const list = document.getElementById('prompt-waiting-list');
  list.innerHTML = '';
  room.players.forEach(p=> {
    const done = (room.promptsDone || []).includes(p.id);
    const el = document.createElement('div');
    el.className = 'waiting-item'+(done?' done':'');
    el.innerHTML = `
    <span class="wname">${p.avatar} ${p.id===S.myId?'You ('+p.name+')':p.name}</span>
    <div class="waiting-dot"></div>
    `;

    list.appendChild(el);
  });
}


async function submitPrompt() {
  const text = document.getElementById('prompt-input').value.trim();
  if(text.length < 10) return toast('Write a bit more - at least 10 chars 😅', 'bad');
  if(text.length>100) return toast('Too long - max 100 chars', 'bad');
  

  const ok = await patchRoom(S.roomCode, r=> {
    const aboutId = r.assignments[S.id];
    if(!r.promptsDone) {
      r.promptsDone = [];
    }

    if (r.promptsDone.includes(S.myId)) {
      return
    }

    r.prompts.push({text, authorId:S.myId, aboutId});
    r.promptsDone.push(S.myId);
  });

  if(!ok) {
    return toast("Submit failed - try again", "bad");
  }

  document.getElementsById('prompt-input').disabled = true;
  document.getElementById('submit-prompt-btn').disabled = true;
  sfxSubmit();
  toast('Submited! 🙈 No one will ever know...', "good");
}

async function onPromptPoll(){
  const room = await getRoom(s.roomCode);
  if(!room) {
    return;
  }

  if(S.isHost && room.promptsDone && room.promptsDone.length >= room.players.length && room.phase ==='prompting') {
    await patchRoom(S.roomCode, r=> {
      r.phase = 'guessing';
      r.currentRound = 0;
      r.guressesDone = [];
      r.roundGuesses={};
    });
  }
  if(room.phase==='guessing'){
    stopPolling();
    enterGuessing();
  }
}


// Guessing

async function enterGuessing() {
  const room = await getRoom(s.roomCode);
  if(!room ) {
    return
  }

  S.guessLocked = false;
  S.lastRound = -1;
  renderGuessRound(room);
  showScreen('screen-guess');
  startPolling(onGuessPoll);
}

function renderGuessRound(room) {
  const round = room.currentRound;
  const prompt = room.prompts[round];
  if(!prompt) {
    return;
  }

  const about = room.players.find(p=>p.id===prompt.aboutId);

  document.getElementById('guess-code-nav').textContent = S.roomCode;
  document.getElementById('guess-round-num').textContent = round+1;
  document.getElementById('guess-round-total').textContent = room.prompts.length;
  document.getElementById('guess-about-label').textContent=`✍️ written about ${about?about.name+' '+about.avatar:'???'}`;
  document.getElementById('guess-prompt-text').textContent = prompt.text;


  const dots = document.getElementById('round-dots');
  dots.innerHTML = "";
  room.prompts.forEach((_,i)=>{
    const d = document.createElement('div');
    d.className = 'round-dot' + (i===round? ' active':i<round?" done": '');
    dots.appendChild(d);
  });

  const grid = document.getElementById('guess-options');
  grid.innerHTML = '';
  room.players.forEach(p=>{
    const btn = document.createElement('button');
    btn.className = 'guess-btn';
    btn.dataset.pid = p.id;
    btn.innerHTML = `<span class="gavatar">${p.avatar}</span>${p.name}`;
    btn.onclick = ()=>makeGuess(p.id, prompt.authorId);
    grid.appendChild(btn);
  });

  document.getElementById('next-btn-wrap').style.display = 'none';
  document.getElementById("reveal-area").innerHTML = "";
  document.getElementById('reaction-bar').style.display = 'none';
  S.guessLocked = false;

  if (room.timerSec > 0) {
    document.getElementById('timer-wrap').style.display= 'block';
    document.getElementById('timer-label-wrap').style.display = 'block';
    startTimer(room.timerSec);
  }

  else {
    document.getElementById('timer-wrap').style.display = 'none';
    document.getElementById('timer-label-wrap').style.display = 'none';
  }
}

async function makeGuess(guessedId, authorId){
  if(S.guessLocked) {
    return;
  }

  S.guessLocked = true;
  stopTimer();

  const correct = guessedId === authorId;
  sfxReveal();

  document.querySelectorAll('.guess-btn').forEach(btn=>{
    btn.disbaled = true;
    if (btn.dataset.pid===authorId) {
      btn.classList.add('correct');
    } else if (btn.dataset.pid===guessedId && !correct) {
        btn.classList.add('wrong');
      }
  });

  if(correct) {
    setTimeout(sfxCorrect, 100);
    spawnConfetti();
  }
  else setTimeout(sfxWrong, 100);

  const room = await getRoom(S.roomCode);
  const author = room?.players.find(p=>p.id===authorId);
  const reveal = document.getElementById('reveal-area');
  reveal.innerHTML = `
    <div class="reveal-card ${correct?'correct-reveal':'wrong-reveal'}">
      <div class="reveal-verdict">${correct?"✅ CORRECT!": "❌ WRONG!"}</div>
      <div class="reveal-sub">${correct
        ?`Yep, that was ${author?.avatar||''} ${author?.name||'?'}! +100 points 🎉`
        :`Nope! That was ${author?.avatar||''} ${author?.name||'?'}. 0 points 😬`
      }</div>
    </div>
  `;

  const bar = document.getElementById('reaction-bar');
  bar.style.display = 'flex';
  bar.innerHTML = ['😂','🔥','💀','👀','🤡','😱'].map(e=> `<button class="reaction-btn" onclick="sendReaction('${e}')">${e}</button>`).join('');

  
  await patchRoom(S.roomCode, r=>{
    if(!r.roundGuesses) r.roundGuesses={};
    r.roundGuesses[S.myId]={guessedId,correct};
    if(!r.guessesDone) r.guessesDone=[];
    if(!r.guessesDone.includes(S.myId)) r.guessesDone.push(S.myId);
    if(correct){
      const pi=r.players.findIndex(p=>p.id===S.myId);
      if(pi!==-1) r.players[pi].score+=100;
    }
  });

  if(correct) toast('+100 points! 🎉','good');

  if(S.isHost){
    document.getElementById('next-btn-wrap').style.display = 'block';
    const room2 = await getRoom(S.roomCode);
    document.getElementById('next-btn').textContent =
      (room2?.currentRound||0)+1 < (room2?.prompts?.length||0)
        ? 'Next Round →' : 'See Results 🏆';
  } else {
    document.getElementById('next-btn-wrap').style.display = 'block';
    document.getElementById('next-btn').style.display = 'none';
    document.getElementById('next-btn-wrap').innerHTML = '<div class="notice">⏳ Waiting for host to advance...</div>';
  }
}

function sendReaction(emoji){
  toast(emoji+' reacted!');
  document.querySelectorAll('.reaction-btn').forEach(b=>b.classList.remove('used'));
  event.target.classList.add('used');
}

async function onGuessPoll(){
  const room = await getRoom(S.roomCode);
  if (!room) {
    return;
  }

  if(room.phase==='final'){
    stopPolling();
    enterFinal();
    return;
  }

  if(room.currentRound !== S.lastRound && room.phase === 'guessing'){
    S.lastRound = room.currentRound;
    S.guessLocked=false;
    renderGuessRound(room);
  }
}

async function nextRound() {
  if(!S.isHost) {
    return
  }

  const room = await getRoom(S.roomCode);
  const next = (room?.currentRound||0)+1;
  if(next >= (room?.prompts?.length||0)){
    await patchRoom(S.roomCode, r=>{
      r.phase='final';
      r.roundGuesses={};
    });
  } else {
    await patchRoom(S.roomCode, r=>{
      r.currentRound = next;
      r.roundGuesses = {};
      r.guessesDone=[];
    });
  }
}


// Timer

function startTimer(sec){
  stopTimer();
  let left = sec;
  const bar = document.getElementById('timer-bar');
  const lbl = document.getElementById('guess-timer-num');
  const wrap = document.getElementById('timer-label-wrap');

  bar.style.width = '100%';
  bar.classList.remove('hurry');
  wrap.classList.remove('timer-hurry');

  S.timerInterval = setInterval(()=>{
    left--;
    if(lbl) {
      lbl.textContent = left;
    }

    if(bar) {
      bar.style.width = (left/sec*100)+"%";
    }

    if(left <= 5 && left > 0) {
      bar?.classList.add('hurry');
      wrap?.classList.add('timer-hurry');
      sfxTimerTick();
    }
    if(left <=0){
      stopTimer();
      sfxTimerAlarm();
      if(!S.guessLocked){
        toast("⏰ Time's up!", "bad");
        getRoom(S.roomCode).then(room=>{
          if(room) {
            makeGuess('__nobody__', room.prompts[room.currentRound]?.authorId);
          }
        });
      }
    }
  },1000);
}

function stopTimer(){
  if(S.timerInterval) {
    clearInterval(S.timerInterval);
    S.timerInterval=null;
  }
}


// CONFETTI

function spawnConfetti(){
  const colors=['#ffe44d', '#4dffa0', '#4da6ff', '#b44dff', '#ff4d6a','#ff8c4d'];
  const area = document.getElementById('reveal-area');
  for(let i = 0 ; i <12; i++){
    const d = document.createElement('div');
    d.className = 'confetti-dot';
    d.style.cssText = `
    left: ${10+Math.random()*80}%;
    top:0;
    background:${colors[i%colors.length]};
    animation-delay: ${Math.random()*0.3}s;
    `;
    area.appendChild(d);
    setTimeout(()=> d.remove(), 1200);
  }
}

// FINAL SCORES
