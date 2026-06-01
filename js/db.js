import { db } from './firebase.js';
import {
  doc,
  collection,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  increment,
  arrayUnion,
  serverTimestamp,
  deleteDoc,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

export const DB = {

  async createRoom(code, data) {
    const ref = doc(db, 'rooms', code);
    data.createdAt = serverTimestamp();
    data.updatedAt = serverTimestamp();
    await setDoc(ref, data);
    return true;
  },

  async getRoom(code) {
    const snap = await getDoc(doc(db, 'rooms', code));
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  },

  async updateRoom(code, data) {
    data.updatedAt = serverTimestamp();
    await updateDoc(doc(db, 'rooms', code), data);
  },

  async patchRoom(code, patchFn) {
    const room = await DB.getRoom(code);
    if (!room) {
      return false;
    }
    patchFn(room);
    await DB.updateRoom(code, room);
    return true;
  },

  listenRoom(code, callback) {
    return onSnapshot(doc(db, 'rooms', code), snap => {
      if (snap.exists()) {
        callback(snap.data());
      }
    });
  },

  async deleteRoom(code) {
    await deleteDoc(doc(db, 'rooms', code));
  },

  async getUser(uid) {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  },

  async updateUser(uid, data) {
    await updateDoc(doc(db, 'users', uid), data);
  },

  async incrementUserStats(uid, opts) {
    const points = opts.points || 0;
    const correct = opts.correct || 0;
    const games = opts.games || 0;

    if (!uid || uid.startsWith('guest_')) {
      return;
    }

    const weekKey = weekStart();
    await updateDoc(doc(db, 'users', uid), {
      totalPoints: increment(points),
      correctGuesses: increment(correct),
      gamesPlayed: increment(games),
      weeklyPoints: increment(points),
      weekStart: weekKey,
      lastPlayed: serverTimestamp(),
    });
  },

  async saveGameResult(uid, gameData) {
    if (!uid || uid.startsWith('guest_')) {
      return;
    }
    const ref = doc(collection(db, 'users', uid, 'games'));
    gameData.playedAt = serverTimestamp();
    await setDoc(ref, gameData);
  },

  async getRecentGames(uid, count) {
    if (!count) {
      count = 5;
    }
    if (!uid || uid.startsWith('guest_')) {
      return [];
    }
    const q = query(
      collection(db, 'users', uid, 'games'),
      orderBy('playedAt', 'desc'),
      limit(count)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  },

  async getLeaderboard(type, count) {
    if (!type) {
      type = 'alltime';
    }
    if (!count) {
      count = 20;
    }

    let field = 'totalPoints';
    if (type === 'weekly') {
      field = 'weeklyPoints';
    } else if (type === 'games') {
      field = 'gamesPlayed';
    }

    const q = query(
      collection(db, 'users'),
      where(field, '>', 0),
      orderBy(field, 'desc'),
      limit(count)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  },

  async sendFriendRequest(fromUid, toUid) {
    const ref = doc(db, 'friendRequests', fromUid + '_' + toUid);
    await setDoc(ref, {
      from: fromUid,
      to: toUid,
      status: 'pending',
      createdAt: serverTimestamp(),
    });
  },

  async acceptFriendRequest(fromUid, toUid) {
    await updateDoc(doc(db, 'users', toUid), { friends: arrayUnion(fromUid) });
    await updateDoc(doc(db, 'users', fromUid), { friends: arrayUnion(toUid) });
    await updateDoc(doc(db, 'friendRequests', fromUid + '_' + toUid), { status: 'accepted' });
    await DB.addNotification(fromUid, {
      type: 'friend_accepted',
      message: 'accepted your friend request',
      fromUid: toUid,
    });
  },

  async rejectFriendRequest(fromUid, toUid) {
    await deleteDoc(doc(db, 'friendRequests', fromUid + '_' + toUid));
  },

  async removeFriend(uid1, uid2) {
    const u1 = await DB.getUser(uid1);
    const u2 = await DB.getUser(uid2);
    const f1 = (u1?.friends || []).filter(id => id !== uid2);
    const f2 = (u2?.friends || []).filter(id => id !== uid1);
    await updateDoc(doc(db, 'users', uid1), { friends: f1 });
    await updateDoc(doc(db, 'users', uid2), { friends: f2 });
  },

  async getPendingRequests(uid) {
    const q = query(
      collection(db, 'friendRequests'),
      where('to', '==', uid),
      where('status', '==', 'pending')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  },

  async getSentRequests(uid) {
    const q = query(
      collection(db, 'friendRequests'),
      where('from', '==', uid),
      where('status', '==', 'pending')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  },

  async searchUsers(term) {
    const q = query(
      collection(db, 'users'),
      where('displayName', '>=', term),
      where('displayName', '<=', term + '\uf8ff'),
      limit(10)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  },

  async addNotification(uid, data) {
    if (!uid || uid.startsWith('guest_')) {
      return;
    }
    const ref = doc(collection(db, 'users', uid, 'notifications'));
    data.read = false;
    data.createdAt = serverTimestamp();
    await setDoc(ref, data);
  },

  async getNotifications(uid, count) {
    if (!count) {
      count = 20;
    }
    if (!uid || uid.startsWith('guest_')) {
      return [];
    }
    const q = query(
      collection(db, 'users', uid, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(count)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data();
      data.id = d.id;
      return data;
    });
  },

  async markNotificationRead(uid, notifId) {
    await updateDoc(doc(db, 'users', uid, 'notifications', notifId), { read: true });
  },

  listenNotifications(uid, callback) {
    if (!uid || uid.startsWith('guest_')) {
      return () => {};
    }
    const q = query(
      collection(db, 'users', uid, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    return onSnapshot(q, snap => {
      const notifs = snap.docs.map(d => {
        const data = d.data();
        data.id = d.id;
        return data;
      });
      callback(notifs);
    });
  },

  async getLiveRoomCount() {
    const q = query(
      collection(db, 'rooms'),
      where('phase', 'in', ['lobby', 'prompting', 'guessing']),
      limit(100)
    );
    try {
      const snap = await getDocs(q);
      return snap.size;
    } catch (e) {
      return 0;
    }
  },
};

function weekStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString();
}

window.DB = DB;
