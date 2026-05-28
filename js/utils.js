
const AVATARS = ['🐸','🦊','🐙','🦋','🦁','🐼','🐨','🦄','🦀','🐬','🦔','🐲','🦝','🦩','🐯','🦖'];
const COLORS  = ['#ffe44d','#4dffa0','#4da6ff','#ff8c4d','#b44dff','#ff4dbf','#4dfff0','#ff4d6a'];
function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

function copyCode() {
  navigator.clipboard.writeText(S.roomCode)
    .then(()  => toast('Room code copied! 📋', 'good'))
    .catch(()  => toast('Code: ' + S.roomCode,  'good'));
}

let toastTimer = null;

/**
 * Show a brief toast message.
 * @param {string} msg
 * @param {'good'|'bad'|''} type
 */
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show' +
    (type === 'good' ? ' toast-good' : type === 'bad' ? ' toast-bad' : '');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}
