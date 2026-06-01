const AVATARS = ['🐸','🦊','🐙','🦋','🦁','🐼','🐨','🦄','🦀','🐬','🦔','🐲','🦝','🦩','🐯','🦖'];

let toastTimer = null;

export const UI = {

  showScreen(id) {
    window.Audio?.click();
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('active');
    }
  },

  toast(msg, type) {
    if (!type) {
      type = '';
    }
    const el = document.getElementById('toast');
    if (!el) {
      return;
    }
    el.textContent = msg;

    let className = 'toast show';
    if (type === 'good') {
      className += ' toast-good';
    } else if (type === 'bad') {
      className += ' toast-bad';
    }
    el.className = className;

    if (toastTimer) {
      clearTimeout(toastTimer);
    }
    toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
  },

  setConn(state) {
    const dot = document.getElementById('conn-dot');
    const lbl = document.getElementById('conn-label');
    if (!dot) {
      return;
    }
    if (state === 'online') {
      dot.className = 'conn-dot online';
      lbl.textContent = 'online';
    } else if (state === 'error') {
      dot.className = 'conn-dot error';
      lbl.textContent = 'error';
    } else {
      dot.className = 'conn-dot';
      lbl.textContent = 'offline';
    }
  },

  switchAuthTab(tab) {
    const tabs = ['login', 'register', 'guest'];
    for (let i = 0; i < tabs.length; i++) {
      const t = tabs[i];
      const panel = document.getElementById('auth-' + t);
      const btn = document.getElementById('tab-' + t);
      if (panel) {
        if (t === tab) {
          panel.style.display = 'block';
        } else {
          panel.style.display = 'none';
        }
      }
      if (btn) {
        if (t === tab) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      }
    }
  },

  updateCharCount() {
    const input = document.getElementById('prompt-input');
    const val = input ? input.value : '';
    const count = val.length;
    const fill = document.getElementById('char-bar-fill');
    const lbl = document.getElementById('char-count');
    if (fill) {
      fill.style.width = (count / 100 * 100) + '%';
    }
    if (lbl) {
      lbl.textContent = count + ' / 100';
    }
  },

  useHint(text) {
    const inp = document.getElementById('prompt-input');
    if (inp) {
      inp.value = text;
      UI.updateCharCount();
    }
    window.Audio?.click();
  },

  copyCode() {
    const code = window.GameState?.roomCode;
    if (!code) {
      return;
    }
    navigator.clipboard.writeText(code)
      .then(() => UI.toast('Room code copied! 📋', 'good'))
      .catch(() => UI.toast('Code: ' + code, 'good'));
  },

  shareInviteLink() {
    const code = window.GameState?.roomCode;
    if (!code) {
      return;
    }
    const url = location.origin + location.pathname + '?join=' + code;
    if (navigator.share) {
      navigator.share({
        title: 'Join my WhoTypedThis? room!',
        text: 'Use code ' + code + ' or click to join:',
        url: url
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url)
        .then(() => UI.toast('Invite link copied! 🔗', 'good'))
        .catch(() => UI.toast(url, 'good'));
    }
  },

  async shareScreenshot() {
    UI.toast('Preparing share...', '');
    try {
      const scores = document.getElementById('final-scoreboard');
      if (!scores) {
        return;
      }
      const items = scores.querySelectorAll('.score-item');
      let text = '🏆 WhoTypedThis? Results:\n';

      items.forEach(item => {
        const rank = item.querySelector('.score-rank')?.textContent?.trim() || '';
        const name = item.querySelector('.score-name')?.textContent?.trim() || '';
        const pts = item.querySelector('.score-pts')?.textContent?.trim() || '';
        text += rank + ' ' + name + ' - ' + pts + ' pts\n';
      });

      text += '\nPlay at: ' + location.origin + location.pathname;

      if (navigator.share) {
        await navigator.share({ title: 'WhoTypedThis? Results', text: text });
      } else {
        await navigator.clipboard.writeText(text);
        UI.toast('Results copied to clipboard! 📋', 'good');
      }
    } catch (e) {
      UI.toast('Could not share, try copying the URL', 'bad');
    }
  },

  renderAvatarPicker(currentAvatar, onPick) {
    const grid = document.getElementById('avatar-grid');
    if (!grid) {
      return;
    }
    grid.innerHTML = '';

    for (let i = 0; i < AVATARS.length; i++) {
      const av = AVATARS[i];
      const btn = document.createElement('button');

      if (av === currentAvatar) {
        btn.className = 'avatar-opt active';
      } else {
        btn.className = 'avatar-opt';
      }

      btn.textContent = av;
      btn.onclick = function() {
        grid.querySelectorAll('.avatar-opt').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        onPick(av);
      };
      grid.appendChild(btn);
    }
  },

  renderProfileStats(profile) {
    const grid = document.getElementById('profile-stats-grid');
    if (!grid) {
      return;
    }

    let accuracy = 0;
    if (profile.gamesPlayed > 0) {
      accuracy = Math.round((profile.correctGuesses / Math.max(profile.gamesPlayed, 1)) * 100);
    }

    const stats = [
      { val: profile.totalPoints || 0, label: 'Total Pts' },
      { val: profile.gamesPlayed || 0, label: 'Games' },
      { val: accuracy + '%', label: 'Accuracy' },
    ];

    let html = '';
    for (let i = 0; i < stats.length; i++) {
      const s = stats[i];
      html += '<div class="stat-box">';
      html += '<span class="stat-val">' + s.val + '</span>';
      html += '<span class="stat-label">' + s.label + '</span>';
      html += '</div>';
    }
    grid.innerHTML = html;
  },

  renderRecentGames(games) {
    const list = document.getElementById('recent-games-list');
    if (!list) {
      return;
    }

    if (!games.length) {
      list.innerHTML = '<div style="color:var(--trans);font-size:13px;text-align:center;padding:16px">No games yet, go play!</div>';
      return;
    }

    let html = '';
    for (let i = 0; i < games.length; i++) {
      const g = games[i];
      let rankText = '';
      if (g.rank) {
        rankText = '#' + g.rank + ' of ' + g.playerCount;
      }
      const dateObj = g.playedAt?.toDate?.() || new Date(g.playedAt || 0);
      html += '<div class="recent-game">';
      html += '<div class="recent-game-info">';
      html += '<div class="recent-game-name">' + (g.roomName || 'Game') + '</div>';
      html += '<div class="recent-game-sub">' + rankText + ' ' + timeAgo(dateObj) + '</div>';
      html += '</div>';
      html += '<div class="recent-game-pts">+' + (g.points || 0) + '</div>';
      html += '</div>';
    }
    list.innerHTML = html;
  },

  toggleNotifPanel() {
    const panel = document.getElementById('notif-panel');
    if (!panel) {
      return;
    }
    if (panel.style.display === 'none') {
      panel.style.display = 'block';
    } else {
      panel.style.display = 'none';
    }
  },

  renderNotifications(notifs) {
    const list = document.getElementById('notif-list');
    if (!list) {
      return;
    }

    if (!notifs.length) {
      list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--trans)">No notifications yet</div>';
      return;
    }

    const unread = notifs.filter(n => !n.read).length;
    const badge = document.getElementById('notif-count');
    if (badge) {
      badge.textContent = unread;
      if (unread > 0) {
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    }

    let html = '';
    for (let i = 0; i < notifs.length; i++) {
      const n = notifs[i];
      const dateObj = n.createdAt?.toDate?.() || new Date();
      let unreadClass = '';
      if (!n.read) {
        unreadClass = 'unread';
      }

      let actionHtml = '';
      if (n.type === 'friend_request') {
        actionHtml += '<div class="notif-action">';
        actionHtml += '<button class="btn btn-green btn-sm" onclick="Friends.acceptRequest(\'' + n.fromUid + '\')">Accept</button>';
        actionHtml += '<button class="btn btn-ghost btn-sm" onclick="Friends.rejectRequest(\'' + n.fromUid + '\')">Ignore</button>';
        actionHtml += '</div>';
      }
      if (n.type === 'room_invite') {
        actionHtml += '<div class="notif-action">';
        actionHtml += '<button class="btn btn-primary btn-sm" onclick="Game.joinByCode(\'' + n.roomCode + '\')">Join Room</button>';
        actionHtml += '</div>';
      }

      html += '<div class="notif-item ' + unreadClass + '" data-id="' + n.id + '">';
      html += '<div>' + notifIcon(n.type) + ' ' + (n.message || '') + '</div>';
      html += '<div class="notif-time">' + timeAgo(dateObj) + '</div>';
      html += actionHtml;
      html += '</div>';
    }
    list.innerHTML = html;
  },
};

function notifIcon(type) {
  if (type === 'friend_request') {
    return '👥';
  } else if (type === 'friend_accepted') {
    return '🤝';
  } else if (type === 'room_invite') {
    return '🎮';
  } else if (type === 'achievement') {
    return '🏆';
  }
  return '🔔';
}

function timeAgo(date) {
  if (!date) {
    return '';
  }
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) {
    return 'just now';
  }
  if (min < 60) {
    return min + 'm ago';
  }
  const hr = Math.floor(min / 60);
  if (hr < 24) {
    return hr + 'h ago';
  }
  return Math.floor(hr / 24) + 'd ago';
}

window.UI = UI;
