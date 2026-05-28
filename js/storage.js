
if (!window.storage) {
  console.warn('window.storage not available — falling back to localStorage');
  window.storage = {
    async get(key)    { const v = localStorage.getItem(key); return v ? { key, value: v } : null; },
    async set(key, v) { localStorage.setItem(key, v); return { key, value: v }; },
    async delete(key) { localStorage.removeItem(key); return { key, deleted: true }; },
    async list(prefix = '') {
      return { keys: Object.keys(localStorage).filter(k => k.startsWith(prefix)) };
    },
  };
}

// --- Key helpers ---
const ROOM_KEY   = code => `wtt_room_${code}`;
const GLOBAL_KEY = 'wtt_active_rooms';

// --- CRUD ---
async function getRoom(code) {
  try {
    const r = await window.storage.get(ROOM_KEY(code));
    return r ? JSON.parse(r.value) : null;
  } catch (e) { return null; }
}

async function setRoom(code, data) {
  try {
    await window.storage.set(ROOM_KEY(code), JSON.stringify(data));
    return true;
  } catch (e) { return false; }
}

/** Fetch → mutate via fn(room) → save atomically */
async function patchRoom(code, fn) {
  const room = await getRoom(code);
  if (!room) return false;
  fn(room);
  return await setRoom(code, room);
}

// --- Room registry (for live-rooms counter on home screen) ---
async function registerRoom(code, name) {
  try {
    const existing = await window.storage.get(GLOBAL_KEY);
    const rooms    = existing ? JSON.parse(existing.value) : {};
    const now      = Date.now();
    // clean rooms older than 3 hours
    Object.keys(rooms).forEach(k => { if (now - rooms[k].ts > 10_800_000) delete rooms[k]; });
    rooms[code] = { name, ts: now, code };
    await window.storage.set(GLOBAL_KEY, JSON.stringify(rooms));
  } catch (e) {}
}

async function getLiveRoomCount() {
  try {
    const existing = await window.storage.get(GLOBAL_KEY);
    if (!existing) return 0;
    const rooms = JSON.parse(existing.value);
    const now   = Date.now();
    return Object.values(rooms).filter(r => now - r.ts < 10_800_000).length;
  } catch (e) { return 0; }
}
