import { Auth } from './auth.js';
import { DB } from './db.js';
import { UI } from './ui.js'; 
import { Notifications } from './notifications.js';
import { Leaderboard } from './leaderboard.js';
import { Friends } from './friends.js'; 
import { Game } from './game.js';

const AVATARS = ['🐸','🦊','🐙','🦋','🦁','🐼','🐨','🦄','🦀','🐬','🦔','🐲','🦝','🦩','🐯','🦖'];

window.addEventListener('user-ready', async ({detail: {user, profile}}) => {
    UI.setconn('online');

    const bell = document.getElementById('notif-bell');
    if(bell) {
        bell.style.display = user.isGuest ? 'none' : 'flex';
    }

    Notifications.start(user.uid);

    const homeAvatar = document.getElementById('home-avatar');
    const homeUsername = document.getElementById('home-username');
    const homeStats = document.getElementById('home-stats');
    if (homeAvatar) {
        homeAvatar.textContent = profile.avatar || "🐸";
    }

    if (homeUsername) {
        homeUsername.textContent = profile.displayName || user.displayName || 'Player';
    }

    if (homeStats){
        homeStats.textContent = `${profile.gamesPlayed || 0} games · ${profile.totalPoints || 0} pts`;
    }

    const createName = document.getElementById('create-name');
    const joinName = document.getElementById('join-name');
    if (createName && !createName.value) {
        createName.value = profile.displayName || '';
    }

    if (joinName && !joinName.value) {
        joinName.value = profile.displayName || '';
    }

    try {
        const count = await DB.getLiveRoomCount();
        const el = document.getElementById('live-rooms-count');
        if (el) {
            el.textContent = count > 0 ? `${count} live room${count!==1?'s':''} right now 🔴`: "Be the first to play today!";
        }
    } catch (_) {
    }

    const params = new URLSearchParams(location.search);
    const joinCode = params.get('join');
    if (joinCode) {
        history.replaceState({}, '', location.pathname);
        const joinNameEl = document.getElementById('join-name');
        const joinCodeEl = document.getElementById('join-code');
        if (joinNameEl) {
            joinNameEl.value = profile.displayName || '';
        }

        if(joinCodeEl) {
            joinCodeEl.value = joinCode.toUpperCase();
        }

        UI.showScreen('screen-join');
        return;
    }

    UI.showScreen('screen-home');
});

window.addEventListener('user-signed-out', () => {
        Notifications.stop();
        const bell = document.getElementById('notif-bell');
        if (bell) {
            bell.style.display = 'none';
            UI.showScreen('screen-auth');
        }
});

window.addEventListener('user-ready', async ({detail : {user,profile} }) => {
    const bigAvatar= document.getElementById("profile-big-avatar");
    const name = document.getElementById('profile-display-name');
    const email = document.getElementById('profile-email');
    if (bigAvatar) {
        bigAvatar.textContent = profile.avatar || '🐸';
    }

    if (name ) {
        name.textContent = profile.displayName || 'Player';
    }

    if (email) {
        email.textContent = user.isGuest ? 'Guest session' : (profile.email || '');
    }

    UI.renderProfileStats(profile);
    UI.renderAvatarPicker(profile.avatar || '🐸', async (av) => {
        if (user.isGuest) {
            profile.avatar = av;
            return;
        }

        try{
            await DB.updateUser(user.uid, {avatar:av});
            profile.avatar=av;
            if (bigAvatar) {
                bigAvatar.textContent = av;
            }
            const homeAv = document.getElementById('home-avatar');
            if (homeAv) {
                homeAv.textContent = av;
            }
            UI.toast('Avatar updated! ' + av, 'good');
        } catch (_) {
            UI.toast('Failed to update avatar', 'bad');
        }
    });

    if (!user.isGuest) {
        const games = await DB.getRecentGames(user.uid);
        UI.renderRecentGames(games);
    }
});

document.getElementById('screen-friends')?.addEventListener('animationend', () => {
    const uid = Auth.getCurrentUser()?.uid;
    if (!uid) return;
    Friends.showTab('friends');
    DB.getPendingRequests(uid).then(reqs => {
        const badge = document.getElementById('red-badge');
        if (badge) {
            badge.style.display = reqs.length> 0?'inline-block': 'none';
        }
    });
});


document.getElementById('screen-leaderboard').addEventListener('animationend', () => {
    Leaderboard.load('alltime');
});

UI.switchAuthTab('login');

const params = new URLSearchParams(location.search);
if (params.get('join')) {
    console.log("Invite link detected - waiting for auth...");
}