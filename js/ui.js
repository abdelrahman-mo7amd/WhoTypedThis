
function showScreen(id) {
  sfxClick();
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function setConn(state) {
  const dot = document.getElementById('conn-dot');
  const lbl = document.getElementById('conn-label');
  if (state === 'online') { dot.className = 'conn-dot online'; lbl.textContent = 'online'; }
  else if (state === 'error') { dot.className = 'conn-dot error'; lbl.textContent = 'error'; }
  else { dot.className = 'conn-dot'; lbl.textContent = 'offline'; }
}

function renderLobbyPlayers(room) {
  document.getElementById('lobby-title').textContent = room.name + ' 🎮';
  document.getElementById('lobby-sub').textContent =
    `${room.players.length} player${room.players.length !== 1 ? 's' : ''} joined — waiting for host to start`;

  const list = document.getElementById('lobby-players');
  list.innerHTML = '';
  room.players.forEach((p, i) => {
    const el    = document.createElement('div');
    el.className = 'player-item';
    const isMe  = p.id === S.myId;
    el.innerHTML = `
      <div class="player-avatar" style="background:${p.color}22;font-size:22px;">${p.avatar}</div>
      <div class="player-name">${p.name}</div>
      ${i === 0 ? '<span class="player-badge badge-host">👑 HOST</span>' : ''}
      ${isMe     ? '<span class="player-badge badge-you">YOU</span>'     : ''}
    `;
    list.appendChild(el);
  });

  const startBtn = document.getElementById('start-btn');
  if (startBtn) {
    const can = room.players.length >= 2;
    startBtn.disabled    = !can;
    startBtn.textContent = can
      ? `🚀 Start Game — ${room.players.length} players ready!`
      : `Need ${2 - room.players.length} more player${2 - room.players.length !== 1 ? 's' : ''}`;
  }
}

function renderPromptWaiting(room) {
  const list = document.getElementById('prompt-waiting-list');
  list.innerHTML = '';
  room.players.forEach(p => {
    const done  = (room.promptsDone || []).includes(p.id);
    const el    = document.createElement('div');
    el.className = 'waiting-item' + (done ? ' done' : '');
    el.innerHTML = `
      <span class="wname">${p.avatar} ${p.id === S.myId ? 'You (' + p.name + ')' : p.name}</span>
      <div class="waiting-dot"></div>
    `;
    list.appendChild(el);
  });
}

function useHint(text) {
  const inp = document.getElementById('prompt-input');
  inp.value = text;
  updateCharCount();
  inp.focus();
}

function updateCharCount() {
  const v    = document.getElementById('prompt-input').value;
  const cc   = document.getElementById('char-count');
  const fill = document.getElementById('char-bar-fill');
  const pct  = Math.min(100, (v.length / 100) * 100);
  cc.textContent      = `${v.length} / 100`;
  fill.style.width    = pct + '%';
  fill.style.background =
    pct > 90 ? 'var(--red)' : pct > 70 ? 'var(--orange)' : 'var(--purple)';
}

function renderGuessRound(room) {
  const round  = room.currentRound;
  const prompt = room.prompts[round];
  if (!prompt) return;

  const about = room.players.find(p => p.id === prompt.aboutId);

  document.getElementById('guess-code-nav').textContent    = S.roomCode;
  document.getElementById('guess-round-num').textContent   = round + 1;
  document.getElementById('guess-round-total').textContent = room.prompts.length;
  document.getElementById('guess-about-label').textContent =
    `✍️ written about ${about ? about.name + ' ' + about.avatar : '???'}`;
  document.getElementById('guess-prompt-text').textContent = prompt.text;

  const dots = document.getElementById('round-dots');
  dots.innerHTML = '';
  room.prompts.forEach((_, i) => {
    const d    = document.createElement('div');
    d.className = 'round-dot' + (i === round ? ' active' : i < round ? ' done' : '');
    dots.appendChild(d);
  });

  const grid = document.getElementById('guess-options');
  grid.innerHTML = '';
  room.players.forEach(p => {
    const btn   = document.createElement('button');
    btn.className    = 'guess-btn';
    btn.dataset.pid  = p.id;
    btn.innerHTML    = `<span class="gavatar">${p.avatar}</span>${p.name}`;
    btn.onclick      = () => makeGuess(p.id, prompt.authorId);
    grid.appendChild(btn);
  });

  document.getElementById('next-btn-wrap').style.display    = 'none';
  document.getElementById('reveal-area').innerHTML          = '';
  document.getElementById('reaction-bar').style.display     = 'none';
  S.guessLocked = false;

  if (room.timerSec > 0) {
    document.getElementById('timer-wrap').style.display       = 'block';
    document.getElementById('timer-label-wrap').style.display = 'block';
    startTimer(room.timerSec);
  } else {
    document.getElementById('timer-wrap').style.display       = 'none';
    document.getElementById('timer-label-wrap').style.display = 'none';
  }
}

function renderReveal(correct, author) {
  const reveal = document.getElementById('reveal-area');
  reveal.innerHTML = `
    <div class="reveal-card ${correct ? 'correct-reveal' : 'wrong-reveal'}">
      <div class="reveal-verdict">${correct ? '✅ CORRECT!' : '❌ WRONG!'}</div>
      <div class="reveal-sub">${
        correct
          ? `Yep, that was ${author?.avatar || ''} ${author?.name || '?'}! +100 points 🎉`
          : `Nope! That was ${author?.avatar || ''} ${author?.name || '?'}. 0 points 😬`
      }</div>
    </div>
  `;

  const bar = document.getElementById('reaction-bar');
  bar.style.display = 'flex';
  bar.innerHTML = ['😂','🔥','💀','👀','🤡','😱'].map(e =>
    `<button class="reaction-btn" onclick="sendReaction('${e}')">${e}</button>`
  ).join('');
}

function sendReaction(emoji) {
  toast(emoji + ' reacted!');
  document.querySelectorAll('.reaction-btn').forEach(b => b.classList.remove('used'));
  event.target.classList.add('used');
}

async function renderNextBtn() {
  const room2 = await getRoom(S.roomCode);
  if (S.isHost) {
    document.getElementById('next-btn-wrap').style.display = 'block';
    document.getElementById('next-btn').style.display      = 'block';
    document.getElementById('next-btn').textContent        =
      (room2?.currentRound || 0) + 1 < (room2?.prompts?.length || 0)
        ? 'Next Round →' : 'See Results 🏆';
  } else {
    document.getElementById('next-btn-wrap').style.display = 'block';
    document.getElementById('next-btn').style.display      = 'none';
    document.getElementById('next-btn-wrap').innerHTML     =
      '<div class="notice">⏳ Waiting for host to advance...</div>';
  }
}

function renderFinalScores(room) {
  const sorted   = [...room.players].sort((a, b) => b.score - a.score);
  const maxScore = sorted[0]?.score || 1;
  const me       = sorted.find(p => p.id === S.myId);
  const myRank   = sorted.indexOf(me) + 1;

  const titles = [
    ['🏆 UNDEFEATED',  'You know your friends too well. Scary.'],
    ['🥈 ALMOST THERE','One round of luck stood between you and glory.'],
    ['🥉 BRONZE GANG', 'Participation trophy energy. We love you anyway.'],
    ['💀 HUMILIATED',  'Your friends are strangers to you. Rethink everything.'],
  ];
  const t = titles[Math.min(myRank - 1, 3)];
  document.getElementById('score-title').textContent    = t[0];
  document.getElementById('score-subtitle').textContent = t[1];

  const board = document.getElementById('final-scoreboard');
  board.innerHTML = '';
  sorted.forEach((p, i) => {
    const el        = document.createElement('div');
    el.className    = 'score-item';
    el.style.animationDelay = (i * 0.1) + 's';
    const rankClass = ['rank-1','rank-2','rank-3'][i] || '';
    const rankLabel = ['1ST','2ND','3RD'][i]         || (i + 1) + 'TH';
    el.innerHTML = `
      <div class="score-rank ${rankClass}">${rankLabel}</div>
      <div style="font-size:26px;">${p.avatar}</div>
      <div class="score-bar-wrap">
        <div class="score-name">${p.name}${p.id === S.myId ? ' (you)' : ''}</div>
        <div class="score-bar-bg">
          <div class="score-bar-fill" style="width:0%" data-w="${Math.round(p.score / maxScore * 100)}%"></div>
        </div>
      </div>
      <div class="score-pts">${p.score}</div>
    `;
    board.appendChild(el);
  });

  setTimeout(() => {
    document.querySelectorAll('.score-bar-fill').forEach(b => b.style.width = b.dataset.w);
  }, 200);
}

function renderRecap(room) {
  const recap = document.getElementById('recap-board');
  recap.innerHTML = '';
  room.prompts.forEach(pr => {
    const author = room.players.find(p => p.id === pr.authorId);
    const about  = room.players.find(p => p.id === pr.aboutId);
    const el     = document.createElement('div');
    el.className  = 'recap-card';
    el.innerHTML  = `
      <div class="recap-about">About ${about?.avatar || ''} ${about?.name || '?'}</div>
      <div class="recap-text">"${pr.text}"</div>
      <div class="recap-author">Written by ${author?.avatar || ''} ${author?.name || '?'}</div>
    `;
    recap.appendChild(el);
  });
}

function spawnConfetti() {
  const colors = ['#ffe44d','#4dffa0','#4da6ff','#b44dff','#ff4d6a','#ff8c4d'];
  const area   = document.getElementById('reveal-area');
  for (let i = 0; i < 12; i++) {
    const d = document.createElement('div');
    d.className  = 'confetti-dot';
    d.style.cssText = `
      left:${10 + Math.random() * 80}%;
      top:0;
      background:${colors[i % colors.length]};
      animation-delay:${Math.random() * 0.3}s;
    `;
    area.appendChild(d);
    setTimeout(() => d.remove(), 1200);
  }
}
