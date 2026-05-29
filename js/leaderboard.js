// js/leaderboard.js — Leaderboard display
import { DB } from './db.js';
import { Auth } from './auth.js';

export const Leaderboard = {
  async load(type = 'alltime', btnEl) {
    document.querySelectorAll('.lb-tab').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');

    const list = document.getElementById('leaderboard-list');
    if (!list) return;
    list.innerHTML = '<div class="loading-spinner"></div>';

    try {
      const entries = await DB.getLeaderboard(type);
      const myUid   = Auth.getCurrentUser()?.uid;

      if (!entries.length) {
        list.innerHTML = '<div class="notice">No scores yet — be the first! 🏆</div>';
        return;
      }

      list.innerHTML = entries.map((e, i) => {
        const rank      = i + 1;
        const rankClass = rank === 1 ? 'r1' : rank === 2 ? 'r2' : rank === 3 ? 'r3' : '';
        const rankLabel = rank === 1 ? '1ST 🥇' : rank === 2 ? '2ND 🥈' : rank === 3 ? '3RD 🥉' : `${rank}TH`;
        const field     = type === 'weekly' ? e.weeklyPoints
                        : type === 'games'  ? e.gamesPlayed
                        : e.totalPoints;
        const isMe = e.uid === myUid;
        return `
          <div class="lb-item" style="animation-delay:${i * .05}s">
            <div class="lb-rank ${rankClass}">${rankLabel}</div>
            <div style="font-size:26px">${e.avatar || '🐸'}</div>
            <div class="lb-name">
              ${esc(e.displayName)}
              ${isMe ? '<span class="lb-you">You</span>' : ''}
            </div>
            <div class="lb-score">${field || 0}</div>
          </div>
        `;
      }).join('');
    } catch (e) {
      list.innerHTML = '<div class="notice" style="color:var(--red)">Failed to load leaderboard</div>';
    }
  },
};

function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

window.Leaderboard = Leaderboard;
