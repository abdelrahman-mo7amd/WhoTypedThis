import { DB } from './db.js';
import { Auth } from './auth.js';

const AVATARS = ['🐸','🦊','🐙','🦋','🦁','🐼','🐨','🦄','🦀','🐬','🦔','🐲','🦝','🦩','🐯','🦖'];
const COLORS = ['#ffe44d','#4dffa0','#4da6ff','#ff8c4d','#b44dff','#ff4dbf','#4dfff0','#ff4d6a'];

export let S = {
  myId: null,
  myName: '',
  roomCode: '',
  roomName: '',
  isHost: false,
  rounds: 3,
  timerSec: 20,
  timerInterval: null,
  guessLocked: false,
  lastRound: -1,
  unsubRoom: null,
};
window.GameState = S;

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export const Game = {
  async createRoom() {
    const nameInput = document.getElementById('create-name');
    const roomInput = document.getElementById('create-room');
    const name = nameInput?.value.trim();
    const roomName = roomInput?.value.trim();
    const rounds = parseInt(document.getElementById('create-rounds')?.value || 3);
    const timer = parseInt(document.getElementById('create-timer')?.value || 20);

    if (!name) {
      return window.UI?.toast('Enter your name 😅', 'bad');
    }
    if (!roomName) {
      return window.UI?.toast('Give the room a name', 'bad');
    }

    const user = Auth.getCurrentUser();
    const profile = Auth.getProfile();
    const code = genCode();
    const myId = user?.uid || 'p_' + Date.now();
    const avatar = profile?.avatar || AVATARS[Math.floor(Math.random() * AVATARS.length)];

    S.myId = myId;
    S.myName = name;
    S.roomCode = code;
    S.roomName = roomName;
    S.isHost = true;
    S.rounds = rounds;
    S.timerSec = timer;

    const roomData = {
      code: code,
      name: roomName,
      rounds: rounds,
      timerSec: timer,
      phase: 'lobby',
      players: [{ id: myId, name: name, avatar: avatar, color: COLORS[0], score: 0, uid: user?.uid || null }],
      prompts: [],
      currentRound: 0,
      promptsDone: [],
      guessesDone: [],
      roundGuesses: {},
      roundHistory: [],
    };

    try {
      await DB.createRoom(code, roomData);
      window.Audio?.start();
      Game._enterLobby();
    } catch (e) {
      window.UI?.toast('Failed to create room, check your connection', 'bad');
    }
  },

  async joinRoom(code) {
    const nameInput = document.getElementById('join-name');
    const codeInput = document.getElementById('join-code');
    const name = nameInput?.value.trim();
    const roomCode = (code || codeInput?.value.trim() || '').toUpperCase();

    if (!name) {
      return window.UI?.toast('Enter your name 😅', 'bad');
    }
    if (roomCode.length < 4) {
      return window.UI?.toast('Enter a valid room code', 'bad');
    }

    const room = await DB.getRoom(roomCode);
    if (!room) {
      return window.UI?.toast("Room not found, check the code 🤔", 'bad');
    }
    if (room.phase !== 'lobby') {
      return window.UI?.toast('Game already started, too late! 😬', 'bad');
    }

    const user = Auth.getCurrentUser();
    const profile = Auth.getProfile();
    const idx = room.players.length;
    const myId = user?.uid || 'p_' + Date.now();
    const avatar = profile?.avatar || AVATARS[idx % AVATARS.length];

    S.myId = myId;
    S.myName = name;
    S.roomCode = roomCode;
    S.roomName = room.name;
    S.isHost = false;
    S.rounds = room.rounds;
    S.timerSec = room.timerSec || 20;

    room.players.push({
      id: myId,
      name: name,
      avatar: avatar,
      color: COLORS[idx % COLORS.length],
      score: 0,
      uid: user?.uid || null,
    });

    try {
      await DB.updateRoom(roomCode, { players: room.players });
      window.Audio?.join();
      Game._enterLobby();
    } catch (e) {
      window.UI?.toast('Failed to join, try again', 'bad');
    }
  },

  async joinByCode(code) {
    if (!Auth.getCurrentUser()) {
      window.UI?.showScreen('screen-auth');
      return;
    }
    const nameInput = document.getElementById('join-name');
    const codeInput = document.getElementById('join-code');
    if (nameInput) {
      nameInput.value = Auth.getProfile()?.displayName || '';
    }
    if (codeInput) {
      codeInput.value = code;
    }
    window.UI?.showScreen('screen-join');
    if (nameInput?.value) {
      await Game.joinRoom(code);
    }
  },

  async inviteFriend(friendUid) {
    if (!S.roomCode) {
      return window.UI?.toast('Create a room first', 'bad');
    }
    const profile = Auth.getProfile();
    await DB.addNotification(friendUid, {
      type: 'room_invite',
      message: (profile?.displayName || 'Someone') + ' invited you to a room',
      fromUid: Auth.getCurrentUser()?.uid,
      roomCode: S.roomCode,
    });
    window.UI?.toast('Invite sent! 🎮', 'good');
  },

  _enterLobby() {
    window.UI?.showScreen('screen-lobby');
    document.getElementById('lobby-code-text').textContent = S.roomCode;
    document.getElementById('lobby-code-big').textContent = S.roomCode;
    document.getElementById('lobby-code-nav').innerHTML = '<span id="lobby-code-text">' + S.roomCode + '</span> 📋';

    const hostZone = document.getElementById('lobby-host-zone');
    const guestZone = document.getElementById('lobby-guest-zone');

    if (S.isHost) {
      hostZone.style.display = 'block';
      guestZone.style.display = 'none';
    } else {
      hostZone.style.display = 'none';
      guestZone.style.display = 'block';
    }

    Game._renderLobby();
    Game._startListening();
  },

  async _renderLobby(room) {
    if (!room) {
      room = await DB.getRoom(S.roomCode);
    }
    if (!room) {
      return;
    }

    document.getElementById('lobby-title').textContent = room.name + ' 🎮';

    let subText = room.players.length + ' player';
    if (room.players.length !== 1) {
      subText += 's';
    }
    subText += ' joined, waiting for host to start';
    document.getElementById('lobby-sub').textContent = subText;

    const list = document.getElementById('lobby-players');
    list.innerHTML = '';

    for (let i = 0; i < room.players.length; i++) {
      const p = room.players[i];
      const el = document.createElement('div');
      el.className = 'player-item';
      el.style.animationDelay = (i * .08) + 's';
      const isMe = p.id === S.myId;

      let nameHtml = esc(p.name);
      if (isMe) {
        nameHtml += ' <span style="color:var(--trans);font-size:12px">(you)</span>';
      }

      let badgeHtml = '';
      if (i === 0) {
        badgeHtml = '<span class="player-badge">HOST 👑</span>';
      }

      el.innerHTML = '<div class="player-avatar">' + p.avatar + '</div><div class="player-name">' + nameHtml + '</div>' + badgeHtml;
      list.appendChild(el);
    }

    const startBtn = document.getElementById('start-btn');
    if (startBtn && S.isHost) {
      const can = room.players.length >= 2;
      startBtn.disabled = !can;
      if (can) {
        startBtn.textContent = 'Start Game 🚀';
      } else {
        startBtn.textContent = 'Need 2+ players to start';
      }
    }

    const profile = Auth.getProfile();
    if (S.isHost && profile?.friends?.length) {
      const invList = document.getElementById('invite-friends-list');
      const placeholder = document.getElementById('invite-placeholder');
      if (placeholder) {
        placeholder.style.display = 'none';
      }
      const friendIds = profile.friends.slice(0, 8);
      const friendProfiles = await Promise.all(friendIds.map(id => DB.getUser(id)));
      if (invList) {
        let invHtml = '';
        for (let i = 0; i < friendProfiles.length; i++) {
          const f = friendProfiles[i];
          if (!f) {
            continue;
          }
          invHtml += '<button class="hint-pill" onclick="Game.inviteFriend(\'' + f.uid + '\')" title="Invite ' + esc(f.displayName) + '">';
          invHtml += (f.avatar || '🐸') + ' ' + esc(f.displayName);
          invHtml += '</button>';
        }
        invList.innerHTML = invHtml;
      }
    }
  },

  async startGame() {
    if (!S.isHost) {
      return;
    }
    const room = await DB.getRoom(S.roomCode);
    if (!room || room.players.length < 2) {
      return window.UI?.toast('Need at least 2 players', 'bad');
    }

    const players = room.players;
    const prompts = [];

    for (let r = 0; r < room.rounds; r++) {
      for (let i = 0; i < players.length; i++) {
        const aboutIdx = (i + 1 + r) % players.length;
        prompts.push({
          authorId: players[i].id,
          aboutId: players[aboutIdx].id,
          text: null,
          round: r,
        });
      }
    }

    await DB.updateRoom(S.roomCode, {
      phase: 'prompting',
      prompts: prompts,
      currentRound: 0,
      promptsDone: [],
      guessesDone: [],
      roundGuesses: {},
      roundHistory: [],
    });
    window.Audio?.start();
  },

  _startListening() {
    if (S.unsubRoom) {
      S.unsubRoom();
    }
    S.unsubRoom = DB.listenRoom(S.roomCode, room => Game._onRoomUpdate(room));
  },

  _stopListening() {
    if (S.unsubRoom) {
      S.unsubRoom();
      S.unsubRoom = null;
    }
  },

  _onRoomUpdate(room) {
    const currentScreen = document.querySelector('.screen.active')?.id;

    if (room.phase === 'prompting' && currentScreen !== 'screen-prompt') {
      Game._enterPrompt(room);
    } else if (room.phase === 'guessing') {
      if (currentScreen !== 'screen-guess') {
        Game._enterGuess(room);
      } else if (room.currentRound !== S.lastRound) {
        S.lastRound = room.currentRound;
        S.guessLocked = false;
        Game._renderGuessRound(room);
      }
    } else if (room.phase === 'final' && currentScreen !== 'screen-final') {
      Game._enterFinal(room);
    } else if (room.phase === 'lobby' && currentScreen !== 'screen-lobby') {
      Game._enterLobby();
    } else if (currentScreen === 'screen-lobby') {
      Game._renderLobby(room);
    } else if (currentScreen === 'screen-prompt') {
      Game._renderPromptWaiting(room);
    }
  },

  _enterPrompt(room) {
    window.UI?.showScreen('screen-prompt');
    const navCode = document.getElementById('prompt-code-nav');
    if (navCode) {
      navCode.textContent = S.roomCode;
    }

    const myPrompt = room.prompts.find(p => p.authorId === S.myId && !p.text);
    if (myPrompt) {
      const about = room.players.find(p => p.id === myPrompt.aboutId);
      if (about) {
        document.getElementById('prompt-target-name').textContent = about.avatar + ' ' + about.name;
      } else {
        document.getElementById('prompt-target-name').textContent = '?';
      }
    }

    const submitBtn = document.getElementById('submit-prompt-btn');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Anonymously';
    }
    document.getElementById('prompt-input').value = '';
    window.UI?.updateCharCount();
    Game._renderPromptWaiting(room);
  },

  _renderPromptWaiting(room) {
    const waitList = document.getElementById('prompt-waiting-list');
    if (!waitList) {
      return;
    }

    const submitted = new Set(room.promptsDone || []);
    let html = '';

    for (let i = 0; i < room.players.length; i++) {
      const p = room.players[i];
      const done = submitted.has(p.id);
      let cls = 'waiting-item';
      if (done) {
        cls += ' done';
      }
      html += '<div class="' + cls + '">';
      html += '<span class="wname">' + p.avatar + ' ' + esc(p.name) + '</span>';
      html += '<div class="waiting-dot"></div>';
      html += '</div>';
    }

    waitList.innerHTML = html;

    if (S.isHost && room.promptsDone?.length >= room.players.length) {
      DB.updateRoom(S.roomCode, {
        phase: 'guessing',
        currentRound: 0,
        guessesDone: [],
        roundGuesses: {},
      });
    }
  },

  async submitPrompt() {
    const text = document.getElementById('prompt-input')?.value.trim();

    if (!text || text.length < 10) {
      return window.UI?.toast('Write at least 10 characters!', 'bad');
    }
    if (text.length > 100) {
      return window.UI?.toast('Too long, max 100 characters', 'bad');
    }

    const btn = document.getElementById('submit-prompt-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Submitted checkmark';
    }

    window.Audio?.submit();

    const room = await DB.getRoom(S.roomCode);
    if (!room) {
      return;
    }

    const idx = room.prompts.findIndex(p => p.authorId === S.myId && !p.text);
    if (idx === -1) {
      return window.UI?.toast('Already submitted!', '');
    }

    room.prompts[idx].text = text;
    const done = [...(room.promptsDone || [])];
    if (!done.includes(S.myId)) {
      done.push(S.myId);
    }

    await DB.updateRoom(S.roomCode, { prompts: room.prompts, promptsDone: done });
    window.UI?.toast('Submitted anonymously 👻', 'good');
  },

  _enterGuess(room) {
    window.UI?.showScreen('screen-guess');
    const navCode = document.getElementById('guess-code-nav');
    if (navCode) {
      navCode.textContent = S.roomCode;
    }
    S.lastRound = room.currentRound;
    S.guessLocked = false;
    Game._renderGuessRound(room);
  },

  _renderGuessRound(room) {
    const round = room.currentRound;
    const prompts = room.prompts || [];
    const prompt = prompts[round];
    if (!prompt) {
      return;
    }

    const about = room.players.find(p => p.id === prompt.aboutId);
    const totalRounds = prompts.length;

    document.getElementById('guess-round-num').textContent = round + 1;
    document.getElementById('guess-round-total').textContent = totalRounds;

    const aboutLbl = document.getElementById('guess-about-label');
    if (aboutLbl) {
      aboutLbl.textContent = 'written about ' + (about?.avatar || '') + ' ' + (about?.name || '?');
    }

    document.getElementById('guess-prompt-text').textContent = prompt.text || '...';

    const dotsEl = document.getElementById('round-dots');
    if (dotsEl) {
      let dotsHtml = '';
      for (let i = 0; i < prompts.length; i++) {
        let dotClass = 'round-dot';
        if (i < round) {
          dotClass += ' done';
        } else if (i === round) {
          dotClass += ' active';
        }
        dotsHtml += '<div class="' + dotClass + '"></div>';
      }
      dotsEl.innerHTML = dotsHtml;
    }

    const guessGrid = document.getElementById('guess-options');
    if (guessGrid) {
      let guessHtml = '';
      for (let i = 0; i < room.players.length; i++) {
        const p = room.players[i];
        let disabledAttr = '';
        if (S.guessLocked) {
          disabledAttr = 'disabled';
        }
        let nameLabel = esc(p.name);
        if (p.id === S.myId) {
          nameLabel += ' (you)';
        }
        guessHtml += '<button class="guess-btn" onclick="Game._makeGuess(\'' + p.id + '\', \'' + prompt.authorId + '\')" ' + disabledAttr + '>';
        guessHtml += '<span class="gavatar">' + p.avatar + '</span>';
        guessHtml += '<span>' + nameLabel + '</span>';
        guessHtml += '</button>';
      }
      guessGrid.innerHTML = guessHtml;
    }

    document.getElementById('reveal-area').innerHTML = '';
    document.getElementById('reaction-bar').style.display = 'none';
    document.getElementById('next-btn-wrap').style.display = 'none';

    if (room.timerSec > 0) {
      Game._startTimer(room.timerSec, prompt.authorId);
    } else {
      document.getElementById('timer-wrap').style.display = 'none';
      document.getElementById('timer-label-wrap').style.display = 'none';
    }
  },

  async _makeGuess(guessedId, actualAuthorId) {
    if (S.guessLocked) {
      return;
    }
    S.guessLocked = true;
    Game._stopTimer();

    const correct = guessedId === actualAuthorId;
    const pts = correct ? 100 : 0;

    if (correct) {
      window.Audio?.correct();
    } else {
      window.Audio?.wrong();
    }

    document.querySelectorAll('.guess-btn').forEach(btn => {
      btn.disabled = true;
      const onclickVal = btn.getAttribute('onclick') || '';
      const match = onclickVal.match(/'([^']+)'/);
      const id = match ? match[1] : null;
      if (id === actualAuthorId) {
        btn.classList.add('correct');
      } else if (id === guessedId) {
        btn.classList.add('wrong');
      }
    });

    const roomData = await DB.getRoom(S.roomCode);
    const author = roomData?.players?.find(p => p.id === actualAuthorId);
    const area = document.getElementById('reveal-area');

    if (area) {
      let revealClass = 'reveal-card';
      if (correct) {
        revealClass += ' correct-reveal';
      } else {
        revealClass += ' wrong-reveal';
      }

      let verdictText = '';
      if (correct) {
        verdictText = 'checkmark CORRECT!';
      } else {
        verdictText = 'x WRONG';
      }

      let subText = 'Written by ' + (author?.avatar || '') + ' ' + esc(author?.name || '?');
      if (correct) {
        subText += ' +' + pts + ' pts 🎉';
      } else {
        subText += ' 0 pts';
      }

      area.innerHTML = '<div class="' + revealClass + '"><div class="reveal-verdict">' + verdictText + '</div><div class="reveal-sub">' + subText + '</div></div>';

      if (correct) {
        Game._spawnConfetti(area);
      }
    }

    const reactionBar = document.getElementById('reaction-bar');
    if (reactionBar) {
      reactionBar.style.display = 'flex';
      const emojis = ['😂', '🔥', '💀', '👀', '🫡', '🤣'];
      let reactionHtml = '';
      for (let i = 0; i < emojis.length; i++) {
        const e = emojis[i];
        reactionHtml += '<button class="reaction-btn" onclick="Game._sendReaction(\'' + e + '\', this)">' + e + '</button>';
      }
      reactionBar.innerHTML = reactionHtml;
    }

    const room = await DB.getRoom(S.roomCode);
    if (!room) {
      return;
    }

    const roundGuesses = Object.assign({}, room.roundGuesses || {});
    roundGuesses[S.myId] = { guessedId: guessedId, correct: correct, pts: pts };

    const guessesDone = [...(room.guessesDone || [])];
    if (!guessesDone.includes(S.myId)) {
      guessesDone.push(S.myId);
    }

    const players = room.players.map(p => {
      if (p.id === S.myId) {
        const updated = Object.assign({}, p);
        updated.score = (p.score || 0) + pts;
        return updated;
      }
      return p;
    });

    await DB.updateRoom(S.roomCode, {
      roundGuesses: roundGuesses,
      guessesDone: guessesDone,
      players: players,
    });

    const nextWrap = document.getElementById('next-btn-wrap');
    const nextBtn = document.getElementById('next-btn');

    if (nextWrap) {
      nextWrap.style.display = 'block';
    }

    if (S.isHost) {
      if (nextBtn) {
        nextBtn.style.display = 'block';
        if ((room.currentRound + 1) < room.prompts.length) {
          nextBtn.textContent = 'Next Round to';
        } else {
          nextBtn.textContent = 'See Results 🏆';
        }
      }
    } else {
      if (nextWrap) {
        nextWrap.innerHTML = '<div class="notice">⏳ Waiting for host to advance...</div>';
      }
    }
  },

  _sendReaction(emoji, btn) {
    window.UI?.toast(emoji + ' reacted!');
    document.querySelectorAll('.reaction-btn').forEach(b => b.classList.remove('used'));
    btn.classList.add('used');
  },

  async nextRound() {
    if (!S.isHost) {
      return;
    }
    Game._stopTimer();
    const room = await DB.getRoom(S.roomCode);
    const next = (room?.currentRound || 0) + 1;

    if (next >= (room?.prompts?.length || 0)) {
      await DB.updateRoom(S.roomCode, { phase: 'final', roundGuesses: {} });
    } else {
      await DB.updateRoom(S.roomCode, {
        currentRound: next,
        roundGuesses: {},
        guessesDone: [],
      });
    }
  },

  _startTimer(sec, authorId) {
    Game._stopTimer();
    let left = sec;
    const bar = document.getElementById('timer-bar');
    const lbl = document.getElementById('guess-timer-num');
    const wrap = document.getElementById('timer-label-wrap');

    if (bar) {
      bar.style.width = '100%';
      bar.classList.remove('hurry');
    }
    if (wrap) {
      wrap.classList.remove('timer-hurry');
    }

    S.timerInterval = setInterval(() => {
      left--;
      if (lbl) {
        lbl.textContent = left;
      }
      if (bar) {
        bar.style.width = (left / sec * 100) + '%';
      }

      if (left <= 5 && left > 0) {
        if (bar) {
          bar.classList.add('hurry');
        }
        if (wrap) {
          wrap.classList.add('timer-hurry');
        }
        window.Audio?.timerTick();
      }

      if (left <= 0) {
        Game._stopTimer();
        window.Audio?.timerAlarm();
        if (!S.guessLocked) {
          window.UI?.toast("Time's up! ⏰", 'bad');
          Game._makeGuess('__nobody__', authorId);
        }
      }
    }, 1000);
  },

  _stopTimer() {
    if (S.timerInterval) {
      clearInterval(S.timerInterval);
      S.timerInterval = null;
    }
  },

  async _enterFinal(room) {
    Game._stopTimer();
    if (!room) {
      room = await DB.getRoom(S.roomCode);
    }
    if (!room) {
      return;
    }

    window.Audio?.winner();
    window.UI?.showScreen('screen-final');

    const sorted = [...room.players].sort((a, b) => b.score - a.score);
    const maxScore = sorted[0]?.score || 1;
    const myRank = sorted.findIndex(p => p.id === S.myId) + 1;

    const titles = [
      ['🏆 UNDEFEATED', 'You know your friends too well. Scary.'],
      ['🥈 ALMOST THERE', 'One round of luck stood between you and glory.'],
      ['🥉 BRONZE GANG', 'Participation trophy energy. We love you anyway.'],
      ['💀 HUMILIATED', 'Your friends are strangers to you. Rethink everything.'],
    ];

    const t = titles[Math.min(myRank - 1, 3)];
    document.getElementById('score-title').textContent = t[0];
    document.getElementById('score-subtitle').textContent = t[1];

    const board = document.getElementById('final-scoreboard');
    board.innerHTML = '';

    for (let i = 0; i < sorted.length; i++) {
      const p = sorted[i];
      const el = document.createElement('div');
      el.className = 'score-item';
      el.style.animationDelay = (i * .1) + 's';

      let rankClass = '';
      if (i === 0) {
        rankClass = 'rank-1';
      } else if (i === 1) {
        rankClass = 'rank-2';
      } else if (i === 2) {
        rankClass = 'rank-3';
      }

      let rankLabel = (i + 1) + 'TH';
      if (i === 0) {
        rankLabel = '1ST';
      } else if (i === 1) {
        rankLabel = '2ND';
      } else if (i === 2) {
        rankLabel = '3RD';
      }

      let nameLabel = esc(p.name);
      if (p.id === S.myId) {
        nameLabel += ' (you)';
      }

      const widthPct = Math.round(p.score / maxScore * 100);

      el.innerHTML = '<div class="score-rank ' + rankClass + '">' + rankLabel + '</div>'
        + '<div style="font-size:26px">' + p.avatar + '</div>'
        + '<div class="score-bar-wrap">'
        + '<div class="score-name">' + nameLabel + '</div>'
        + '<div class="score-bar-bg">'
        + '<div class="score-bar-fill" style="width:0%" data-w="' + widthPct + '%"></div>'
        + '</div>'
        + '</div>'
        + '<div class="score-pts">' + p.score + '</div>';

      board.appendChild(el);
    }

    setTimeout(() => {
      document.querySelectorAll('.score-bar-fill').forEach(b => {
        b.style.width = b.dataset.w;
      });
    }, 200);

    const recap = document.getElementById('recap-board');
    let recapHtml = '';

    for (let i = 0; i < room.prompts.length; i++) {
      const pr = room.prompts[i];
      const author = room.players.find(p => p.id === pr.authorId);
      const about = room.players.find(p => p.id === pr.aboutId);

      recapHtml += '<div class="recap-card">';
      recapHtml += '<div class="recap-about">About ' + (about?.avatar || '') + ' ' + esc(about?.name || '?') + '</div>';
      recapHtml += '<div class="recap-text">"' + esc(pr.text || '...') + '"</div>';
      recapHtml += '<div class="recap-author">Written by ' + (author?.avatar || '') + ' ' + esc(author?.name || '?') + '</div>';
      recapHtml += '</div>';
    }

    recap.innerHTML = recapHtml;

    const uid = Auth.getCurrentUser()?.uid;
    const me = sorted.find(p => p.id === S.myId);

    if (uid && me) {
      const correct = Object.values(room.roundGuesses || {}).filter(g => g?.correct).length;
      await DB.incrementUserStats(uid, { points: me.score || 0, correct: correct, games: 1 });
      await DB.saveGameResult(uid, {
        roomName: room.name,
        roomCode: room.code,
        points: me.score || 0,
        rank: myRank,
        playerCount: room.players.length,
        correctGuesses: correct,
      });
    }
  },

  async playAgain() {
    if (S.isHost) {
      const currentRoom = await DB.getRoom(S.roomCode);
      const resetPlayers = (currentRoom?.players || []).map(p => {
        const copy = Object.assign({}, p);
        copy.score = 0;
        return copy;
      });

      await DB.updateRoom(S.roomCode, {
        phase: 'lobby',
        prompts: [],
        promptsDone: [],
        currentRound: 0,
        guessesDone: [],
        roundGuesses: {},
        roundHistory: [],
        players: resetPlayers,
      });
      Game._enterLobby();
    } else {
      window.UI?.toast('Waiting for host to restart...', 'good');
    }
  },

  goHome() {
    Game._stopTimer();
    Game._stopListening();
    S.myId = null;
    S.myName = '';
    S.roomCode = '';
    S.roomName = '';
    S.isHost = false;
    S.rounds = 3;
    S.timerSec = 20;
    S.timerInterval = null;
    S.guessLocked = false;
    S.lastRound = -1;
    S.unsubRoom = null;
    window.UI?.showScreen('screen-home');
  },

  _spawnConfetti(area) {
    const colors = ['#ffe44d', '#4dffa0', '#4da6ff', '#b44dff', '#ff4d6a', '#ff8c4d'];
    for (let i = 0; i < 16; i++) {
      const d = document.createElement('div');
      d.className = 'confetti-dot';
      const leftPct = 10 + Math.random() * 80;
      const color = colors[i % colors.length];
      const delay = Math.random() * .4;
      d.style.cssText = 'left:' + leftPct + '%;top:0;background:' + color + ';animation-delay:' + delay + 's;';
      area.appendChild(d);
      setTimeout(() => d.remove(), 1400);
    }
  },
};

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

window.Game = Game;
