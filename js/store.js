// Хранение всего состояния приложения на телефоне (IndexedDB, запасной вариант — localStorage).
const DB_NAME = 'slova';
const STORE = 'kv';
const KEY = 'state';

export const DEFAULT_SETTINGS = {
  newPerDay: 12,
  direction: 'mixed',      // 'enru' | 'ruen' | 'mixed'
  autoNext: false,
  autoSpeak: true,
  accent: 'en-GB',         // 'en-GB' | 'en-US'
  rate: 0.9,
  voiceURI: '',
  partSize: 50,
  onlyEnRu: true,
  theme: 'system',         // 'light' | 'dark' | 'system'
  backupReminder: true,
};

export function emptyState() {
  return {
    version: 1,
    words: {},       // id -> слово
    packs: [],       // паки
    verbs: {},       // инфинитив -> прогресс
    daily: { date: '', newShown: 0 },
    settings: { ...DEFAULT_SETTINGS },
    lastBackup: 0,
    lastBackupNag: 0,
    createdAt: Date.now(),
  };
}

function openDB() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('no idb')); return; }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

let dbPromise = null;
function db() {
  if (!dbPromise) dbPromise = openDB().catch(() => null);
  return dbPromise;
}

export async function loadState() {
  let raw = null;
  const d = await db();
  if (d) {
    raw = await new Promise((resolve) => {
      try {
        const tx = d.transaction(STORE, 'readonly');
        const r = tx.objectStore(STORE).get(KEY);
        r.onsuccess = () => resolve(r.result || null);
        r.onerror = () => resolve(null);
      } catch (e) { resolve(null); }
    });
  }
  if (!raw) {
    try { raw = JSON.parse(localStorage.getItem('slova-state') || 'null'); } catch (e) { raw = null; }
  }
  return normalize(raw);
}

export function normalize(raw) {
  const base = emptyState();
  if (!raw || typeof raw !== 'object') return base;
  const s = { ...base, ...raw };
  s.settings = { ...DEFAULT_SETTINGS, ...(raw.settings || {}) };
  s.words = raw.words || {};
  s.packs = Array.isArray(raw.packs) ? raw.packs : [];
  s.verbs = raw.verbs || {};
  s.daily = raw.daily || { date: '', newShown: 0 };
  return s;
}

let saveTimer = null;
export function saveState(state) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => writeNow(state), 150);
}

export async function writeNow(state) {
  const d = await db();
  const data = JSON.parse(JSON.stringify(state));
  if (d) {
    try {
      await new Promise((resolve, reject) => {
        const tx = d.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(data, KEY);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      return;
    } catch (e) { /* падаем на localStorage */ }
  }
  try { localStorage.setItem('slova-state', JSON.stringify(data)); } catch (e) { /* ignore */ }
}

export async function askPersistence() {
  try {
    if (navigator.storage && navigator.storage.persist) await navigator.storage.persist();
  } catch (e) { /* ignore */ }
}

export function uid(prefix = 'id') {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
