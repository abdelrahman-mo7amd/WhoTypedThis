const AVATARS = ['🐸','🦊','🐙','🦋','🦁','🐼','🐨','🦄','🦀','🐬','🦔','🐲','🦝','🦩','🐯','🦖'];

let toastTimer = null;
export const UI = {
    showScreen(id) {
        window.Audio?.click();
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id)?.classList.add('active');
    },

    toast(msg, type=""){
        const el = document.getElementById('toast');
        if (!el) return;
        el.textContent = msg;
        el.className = 'toast show' + (type === 'good' ? ' toast-good' : type === 'bad' ? ' toast-bad' : '');
        if (toastTimer) {
            clearTimeout(toastTimer);
        }

        toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
    },

    secConn(state) {
        const dot = document.getElementById('conn-dot');
        const lbl = document.getElementById('conn-label');
        if (!dot) return;
        if (state==='online') {
            dot.className = 'conn-dot online';
            lbl.textContent = 'online';
        } else if (state==='error') {
            dot.className = 'conn-dot error';
            lbl.textContent='error';
        } else {
            dot.className = 'conn-dot';
            lbl.textContent = 'offline';
        }
    },

    switchAuthTab(tab) {
        ['login', 'register', 'guest'].forEach(t => {
            document.getElementById(`auth-${t}`)?.style && (document.getElementById(`auth-${t}`).style.display = t === tab ? 'block' : 'none');
            document.getElementById(`tab-${t}`)?.classList.toggle('active', t === tab);
        });
    },

    updateCharCount() {
        const val = document.getElementById('prompt-input').value || '';
        const count = val.length;
        const fill = document.getElementById('char-bar-fill');
        const lbl = document.getElementById('char-count');
        if (fill) {
            fill.style.width = (count / 100 * 100) + '%';
        }

        if (lbl) {
            lbl.textContent = `${count} / 100`;
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
            return
        }
        navigator.clipboard.writeText(code)
            .then(()=> UI.toast('Room code copied! 📋', 'good'))
            .catch(()=> UI.toast('Code: ' + code, 'good'));
    },

    shareInviteLink(){
        const code = window.GameState?.roomCode;
        if (!code) {
            return;
        }

        const url = `${location.origin}${location.pathname}?join=${code}`;
        if (navigator.share) {
            navigator.share({title: 'Join my WhoTypedThis? room!' , text: `Use code (${code}) or click the link to join: `, url}).catch(()=>{});
        } else {
            navigator.clipboard.writeText(url).then(() => UI.toast('Invite link copied! 🔗', 'good')).catch(() => UI.toast(url, 'good'))
        }
    },

    async shareScreenshot() {
        UI.toast('Preparing share...', '');
        try {
            const scores = document.getElementById('final-scoreboard');
            if(!scores) {
                return
            }
            const items = scores.querySelectorAll('.score-item');
            let text = '🏆 WhoTypedThis? Results:\n';
            items.forEach(item => {
                const rank = item.querySelector('.score-rank').textContent?.trim() || '';
                const name = item.querySelector('.score-name').textContent?.trim() || '';
                const pts = item.querySelector('.score-pts').textContent?.trim() || '';
                text += `${rank} ${name} - ${pts} pts\n`;
            });

            text+= `\nPlat at: ${location.origin}${location.pathname}`;
            if (navigator.share) {
                await navigator.share({title: "WhoTypedThis? Results", text});
            } else {
                await navigator.clipboard.writeText(text);
                UI.toast("Results copied to clipboard! 📋", "good");
            }
        } catch (e) {
            UI.toast("Could not share - try copying the URL", 'bad');
        }
    },

    renderAvatarPicker(currentAvatar, onPick) {
        const grid = document.getElementById('avatar-grid');
        if (!grid) return;
        grid.innerHTML = '';
        AVATARS.forEach(av => {
            const btn = document.createElement('button');
            btn.className='avatar-opt' + (av === currentAvatar ? 'active' : "");
            btn.textContent = av;
            btn.onclick=() => {
                grid.querySelectorAll('.avatar-opt').forEach(b => b.classList.remove("acive"));
                btn.classList.add('active');
                onPick(av);
            };
            grid.appendChild(btn);
        });
    },

    renderProfileStats(profile) {
        const grid = document.getElementById('profile-stats-grid');
        if (!grid) {
            return;
        }

        const accuracy = profile.gamesPlayed > 0 ? Math.round((profile.correctGuess / Math.max(profile.gamesPlayed, 1)) * 100) : 0;
        const stats = [
            { val: profile.totalPoints || 0, label: 'Total Pts' },
            { val: profile.gamesPlayed || 0, label: 'Games' },
            { val: (accuracy) + '%', label: "Accuracy"},
        ];
        grid.innerHTML = stats.map(s => `
                <div class="stat-box">
                    <span class="stat-val">${s.val}</span>
                    <span class="stat-label">${s.label}</span>
                </div>
            `).join('');
    },

    renderRecentGames(games) {
        const list = document.getElementById('recent-games-list');
        if (!list) {
            return;
        }

        if (!games.length) {
            list.innerHTML = '<div style="color:var(--trans);font-size: 13px;text-align:center;padding:16px;">No games yet = Go play! </div>';
            return;
        }

        list.innerHTML = games.map(g => `
                <div class="recent-game">
                    <div class="recent-game-info">
                        <div class="recent-game-name">${g.roomName || "Game"}</div>
                        <div class="recent-game-sub">${g.rank ? `#${g.rank} of ${g.playerCount}` : ''} · ${timeAgo(g.playedAt?.toDate?.() || new Date(g.playedAt || 0))}</div>
                    </div>
                    <div class="recent-game-pts"?+${g.points || 0}</div>
                </div>
            `).join('');
    },

    toggleNotifPanel(){
        const panel = document.getElementById('notif-panel');
        if (!panel) {
            return
        }
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    },


    renderNotifications(notifs){
        const list = document.getElementById('notif-list');
        if (!list) {
            return;
        }

        if (!notifs.length) {
            list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--trans);">No notifications yet</div>';
            return;
        }
        const unread = notifs.filter(n => !n.read).length;
        const badge = document.getElementById('notif-count');
        if (badge) {
            badge.textContent = unread;
            badge.style.display = unread > 0 ? 'inline-block' : 'none';
        }
        list.innerHTML = notifs.map(n => `
        <div class="notif-item ${n.read ? '' : 'unread'}" data-id="${n.id}">
            <div>${notifIcon(n.type)} ${n.message || ''}</div>
            <div class="notif-time">${timeAgo(n.createdAt?.toDate?.() || new Date())}</div>
            ${n.type === 'friend_request' ? `
            <div class="notif-action">
                <button class="btn btn-green btn-sm" onclick="Friends.acceptRequest('${n.fromUid}')">Accept</button>
                <button class="btn btn-ghost btn-sm"  onclick="Friends.rejectRequest('${n.fromUid}')">Ignore</button>
            </div>
            ` : ''}
            ${n.type === 'room_invite' ? `
            <div class="notif-action">
                <button class="btn btn-primary btn-sm" onclick="Game.joinByCode('${n.roomCode}')">Join Room</button>
            </div>
            ` : ''}
        </div>
        `).join('');
    },
};

function notifIcon (type) {
    const map = {
        friend_request: '👥',
        friend_accepted: '🤝',
        room_invite: '🎮',
        achievement: '🏆',
    };
    return map[type] || '🔔';
}

function timeAgo(date) {
    if (!date) {
        return '';
    }

    const diff = Date.now() - date.getTime();
    const min = Math.floor(diff/60000);
    if (min < 1) {
        return 'just now';
    }

    if (min < 60) {
        return `${min}m ago`;
    }

    const hr = Math.floor(min/60);
    if (hr<24) {
        return `${hr}h ago`;
    };

    return `${Math.floor(hr/24)}d ago`;
}

window.UI = UI;