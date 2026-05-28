
let S = {
  myId:          null,
  myName:        '',
  roomCode:      '',
  roomName:      '',
  isHost:        false,
  rounds:        3,
  timerSec:      20,
  timerInterval: null,
  guessLocked:   false,
  storageKey:    null,
  polling:       null,
  lastRound:     -1,
};

function startPolling(cb) {
  stopPolling();
  S.polling = setInterval(cb, 1200);
}
function stopPolling() {
  if (S.polling) { clearInterval(S.polling); S.polling = null; }
}

(async () => {
  try {
    await window.storage.set('wtt_ping', '1');
    setConn('online');
    const count = await getLiveRoomCount();
    document.getElementById('live-rooms-count').textContent =
      count > 0
        ? `${count} live room${count !== 1 ? 's' : ''} right now 🔴`
        : 'Be the first to play today!';
  } catch (e) {
    setConn('error');
    document.getElementById('live-rooms-count').textContent =
      'Storage unavailable — tab-local mode';
  }
})();
