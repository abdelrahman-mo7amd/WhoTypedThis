import { DB } from './db.js';
import { Auth } from './auth.js';

let unsubscribe= null;

export const Notifications = {
    start(uid) {
        if(unsubscribe) {
            unsubscribe();
        }
        if(!uid || uid.startWith('guest_')) {
            return;
        }

        unsubscribe = DB.listenNotifications(uid, notifs => {
            const unread = notifs.filter(n => !n.read).length;

            const badge = document.getElementById('notif-count');
            if (badge) {
                badge.textContent = unread;
                badge.style.display = unread > 0 ? 'inline-block' : 'none';
            }

            if (unread > 0) {
                window.Audio?.notif?.();
            }

            window.UI?.renderNotifications(notifs)

            const freshReq = notifs.find(n => !n.read && n.type === 'friend_request');
            if (freshReq) {
                window.UI?.toast(`👥 ${freshReq.message}`, 'good');
                DB.markNotificationRead(uid, freshReq.id);
            }
        });
    },

    stop () {
        if (unsubscribe) {
            unsubscribe();
            unsubscribe=null;
        }
    },

    async relead() {
        const uid = Auth.getCurrentUser()?.uid;
        if (!uid) {
            return;
        }

        const notifs = await DB.getNotifications(uid);
        window.UI?.renderNotifications(notifs)
    }
}

window.Notifications = Notifications;