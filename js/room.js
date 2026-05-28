
async function createRoom() {
  const name     = document.getElementById('create-name').value.trim();
  const roomName = document.getElementById('create-room').value.trim();
  const rounds   = parseInt(document.getElementById('create-rounds').value);
  const timer    = parseInt(document.getElementById('create-timer').value);

  if (!name)     return toast('Enter your name 😅', 'bad');
  if (!roomName) return toast('Give the room a name', 'bad');

  const code   = genCode();
  const myId   = 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
  const color  = COLORS[0];

  S.myId = myId; S.myName = name; S.roomCode = code; S.roomName = roomName;
  S.isHost = true; S.rounds = rounds; S.timerSec = timer;

  const roomData = {
    code,
    name: roomName,
    rounds,
    timerSec: timer,
    phase: 'lobby',
    players: [{ id: myId, name, avatar, color, score: 0 }],
    prompts: [],
    currentRound: 0,
    assignments: {},
    promptsDone: [],
    guessesDone: [],
    roundGuesses: {},
    roundHistory: [],
    createdAt: Date.now(),
  };

  const ok = await setRoom(code, roomData);
  if (!ok) return toast('Failed to create room — check connection', 'bad');

  await registerRoom(code, roomName);
  sfxStart();
  enterLobby();
}

async function joinRoom() {
  const name = document.getElementById('join-name').value.trim();
  const code = document.getElementById('join-code').value.trim().toUpperCase();

  if (!name)         return toast('Enter your name 😅', 'bad');
  if (code.length < 4) return toast('Enter a valid room code', 'bad');

  const room = await getRoom(code);
  if (!room)                    return toast('Room not found — check the code 🤔', 'bad');
  if (room.phase !== 'lobby')   return toast('Game already started — too late! 😬', 'bad');

  const idx    = room.players.length;
  const myId   = 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  const avatar = AVATARS[idx % AVATARS.length];
  const color  = COLORS[idx % COLORS.length];

  S.myId = myId; S.myName = name; S.roomCode = code; S.roomName = room.name;
  S.isHost = false; S.rounds = room.rounds; S.timerSec = room.timerSec || 20;

  room.players.push({ id: myId, name, avatar, color, score: 0 });
  const ok = await setRoom(code, room);
  if (!ok) return toast('Failed to join — try again', 'bad');

  sfxJoin();
  enterLobby();
}

function enterLobby() {
  showScreen('screen-lobby');
  const code = S.roomCode;
  document.getElementById('lobby-code-text').textContent = code;
  document.getElementById('lobby-code-big').textContent  = code;
  document.getElementById('lobby-code-nav').textContent  = code + ' 📋';

  if (S.isHost) {
    document.getElementById('lobby-host-zone').style.display = 'block';
    document.getElementById('lobby-guest-zone').style.display = 'none';
  } else {
    document.getElementById('lobby-host-zone').style.display = 'none';
    document.getElementById('lobby-guest-zone').style.display = 'block';
  }

  renderLobby();
  startPolling(onLobbyPoll);
}

async function renderLobby() {
  const room = await getRoom(S.roomCode);
  if (!room) return;
  renderLobbyPlayers(room);
}

async function onLobbyPoll() {
  const room = await getRoom(S.roomCode);
  if (!room) return;
  renderLobby();
  if (room.phase === 'prompting') { stopPolling(); enterPrompting(); }
}
