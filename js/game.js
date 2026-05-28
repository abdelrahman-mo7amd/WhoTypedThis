
async function startGame() {
  const room = await getRoom(S.roomCode);
  if (!room || room.players.length < 2) return toast('Need at least 2 players', 'bad');

  const n           = room.players.length;
  const assignments = {};
  room.players.forEach((p, i) => {
    assignments[p.id] = room.players[(i + 1) % n].id;
  });

  await patchRoom(S.roomCode, r => {
    r.phase        = 'prompting';
    r.assignments  = assignments;
    r.promptsDone  = [];
    r.prompts      = [];
    r.currentRound = 0;
    r.guessesDone  = [];
    r.roundGuesses = {};
    r.roundHistory = [];
    r.players.forEach(p => (p.score = 0));
  });

  sfxStart();
}


async function enterPrompting() {
  const room = await getRoom(S.roomCode);
  if (!room) return;

  const aboutId = room.assignments[S.myId];
  const about   = room.players.find(p => p.id === aboutId);

  document.getElementById('prompt-target-name').textContent =
    (about ? about.name : '???') + '  ' + (about ? about.avatar : '');
  document.getElementById('prompt-code-nav').textContent = S.roomCode;

  const inp = document.getElementById('prompt-input');
  inp.value   = '';
  inp.disabled = false;
  document.getElementById('submit-prompt-btn').disabled = false;
  updateCharCount();
  renderPromptWaiting(room);   // ui.js

  showScreen('screen-prompt');
  startPolling(onPromptPoll);
}

async function submitPrompt() {
  const text = document.getElementById('prompt-input').value.trim();
  if (text.length < 10)  return toast('Write a bit more — at least 10 chars 😅', 'bad');
  if (text.length > 100) return toast('Too long — max 100 chars', 'bad');

  const ok = await patchRoom(S.roomCode, r => {
    const aboutId = r.assignments[S.myId];
    if (!r.promptsDone) r.promptsDone = [];
    if (r.promptsDone.includes(S.myId)) return;
    r.prompts.push({ text, authorId: S.myId, aboutId });
    r.promptsDone.push(S.myId);
  });

  if (!ok) return toast('Submit failed — try again', 'bad');

  document.getElementById('prompt-input').disabled          = true;
  document.getElementById('submit-prompt-btn').disabled     = true;
  sfxSubmit();
  toast('Submitted! 🙈 No one will ever know...', 'good');
}

async function onPromptPoll() {
  const room = await getRoom(S.roomCode);
  if (!room) return;
  renderPromptWaiting(room); 

  if (
    S.isHost &&
    room.promptsDone &&
    room.promptsDone.length >= room.players.length &&
    room.phase === 'prompting'
  ) {
    await patchRoom(S.roomCode, r => {
      r.phase        = 'guessing';
      r.currentRound = 0;
      r.guessesDone  = [];
      r.roundGuesses = {};
    });
  }
  if (room.phase === 'guessing') { stopPolling(); enterGuessing(); }
}


async function enterGuessing() {
  const room = await getRoom(S.roomCode);
  if (!room) return;
  S.guessLocked = false;
  S.lastRound   = -1;
  renderGuessRound(room);   // ui.js
  showScreen('screen-guess');
  startPolling(onGuessPoll);
}

async function makeGuess(guessedId, authorId) {
  if (S.guessLocked) return;
  S.guessLocked = true;
  stopTimer();

  const correct = guessedId === authorId;
  sfxReveal();

  document.querySelectorAll('.guess-btn').forEach(btn => {
    btn.disabled = true;
    if (btn.dataset.pid === authorId)                   btn.classList.add('correct');
    else if (btn.dataset.pid === guessedId && !correct) btn.classList.add('wrong');
  });

  if (correct) { setTimeout(sfxCorrect, 100); spawnConfetti(); }
  else           setTimeout(sfxWrong, 100);

  const room   = await getRoom(S.roomCode);
  const author = room?.players.find(p => p.id === authorId);

  renderReveal(correct, author);   // ui.js

  await patchRoom(S.roomCode, r => {
    if (!r.roundGuesses) r.roundGuesses = {};
    r.roundGuesses[S.myId] = { guessedId, correct };
    if (!r.guessesDone) r.guessesDone = [];
    if (!r.guessesDone.includes(S.myId)) r.guessesDone.push(S.myId);
    if (correct) {
      const pi = r.players.findIndex(p => p.id === S.myId);
      if (pi !== -1) r.players[pi].score += 100;
    }
  });

  if (correct) toast('+100 points! 🎉', 'good');

  renderNextBtn(); 
}

async function onGuessPoll() {
  const room = await getRoom(S.roomCode);
  if (!room) return;
  if (room.phase === 'final') { stopPolling(); enterFinal(); return; }
  if (room.currentRound !== S.lastRound && room.phase === 'guessing') {
    S.lastRound   = room.currentRound;
    S.guessLocked = false;
    renderGuessRound(room); 
  }
}

async function nextRound() {
  if (!S.isHost) return;
  stopTimer();
  const room = await getRoom(S.roomCode);
  const next  = (room?.currentRound || 0) + 1;
  if (next >= (room?.prompts?.length || 0)) {
    await patchRoom(S.roomCode, r => { r.phase = 'final'; r.roundGuesses = {}; });
  } else {
    await patchRoom(S.roomCode, r => { r.currentRound = next; r.roundGuesses = {}; r.guessesDone = []; });
  }
}


function startTimer(sec) {
  stopTimer();
  let left = sec;
  const bar  = document.getElementById('timer-bar');
  const lbl  = document.getElementById('guess-timer-num');
  const wrap = document.getElementById('timer-label-wrap');

  bar.style.width = '100%';
  bar.classList.remove('hurry');
  wrap.classList.remove('timer-hurry');

  S.timerInterval = setInterval(() => {
    left--;
    if (lbl) lbl.textContent = left;
    if (bar) bar.style.width = ((left / sec) * 100) + '%';

    if (left <= 5 && left > 0) {
      bar?.classList.add('hurry');
      wrap?.classList.add('timer-hurry');
      sfxTimerTick();
    }

    if (left <= 0) {
      stopTimer();
      sfxTimerAlarm();
      if (!S.guessLocked) {
        toast("⏰ Time's up!", 'bad');
        getRoom(S.roomCode).then(room => {
          if (room) makeGuess('__nobody__', room.prompts[room.currentRound]?.authorId);
        });
      }
    }
  }, 1000);
}

function stopTimer() {
  if (S.timerInterval) { clearInterval(S.timerInterval); S.timerInterval = null; }
}


async function enterFinal() {
  stopPolling(); stopTimer();
  const room = await getRoom(S.roomCode);
  if (!room) return;

  renderFinalScores(room);   // ui.js
  renderRecap(room);         // ui.js
  sfxWinner();
  showScreen('screen-final');
}


async function playAgain() {
  if (S.isHost) {
    await patchRoom(S.roomCode, r => {
      r.phase        = 'lobby';
      r.prompts      = [];
      r.promptsDone  = [];
      r.currentRound = 0;
      r.guessesDone  = [];
      r.roundGuesses = {};
      r.roundHistory = [];
      r.players.forEach(p => (p.score = 0));
    });
    enterLobby();
  } else {
    toast('Waiting for host to restart...', 'good');
    startPolling(async () => {
      const r = await getRoom(S.roomCode);
      if (r?.phase === 'lobby') { stopPolling(); enterLobby(); }
    });
  }
}

function goHome() {
  stopPolling(); stopTimer();
  S = {
    myId: null, myName: '', roomCode: '', roomName: '',
    isHost: false, rounds: 3, timerSec: 20,
    timerInterval: null, guessLocked: false, storageKey: null,
    polling: null, lastRound: -1,
  };
  showScreen('screen-home');
}
