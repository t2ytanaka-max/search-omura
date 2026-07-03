import { openDB } from 'idb';

const DB_NAME = 'mountain_search_db';
const DB_VERSION = 1;

let dbPromise = null;

export const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // 送信待ちキュー
        if (!db.objectStoreNames.contains('queue')) {
          db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
        }
        // 本部からのメッセージ受信履歴
        if (!db.objectStoreNames.contains('messages')) {
          db.createObjectStore('messages', { keyPath: 'id' });
        }
        // 地図タイルキャッシュ
        if (!db.objectStoreNames.contains('tiles')) {
          db.createObjectStore('tiles', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
};

// --- キュー操作 (送信待ち用) ---
export const addToQueue = async (dataStr) => {
  const db = await getDB();
  return db.put('queue', {
    data: dataStr,
    timestamp: Date.now()
  });
};

export const getQueue = async () => {
  const db = await getDB();
  return db.getAll('queue');
};

export const removeFromQueue = async (id) => {
  const db = await getDB();
  return db.delete('queue', id);
};

// --- 本部メッセージ操作 ---
export const addMessage = async (msg) => {
  const db = await getDB();
  return db.put('messages', {
    id: msg.id,
    text: msg.text,
    timestamp: msg.timestamp || Date.now(),
    read: msg.read || false
  });
};

export const getMessages = async () => {
  const db = await getDB();
  const msgs = await db.getAll('messages');
  return msgs.sort((a, b) => b.timestamp - a.timestamp); // 降順
};

export const markMessageAsRead = async (id) => {
  const db = await getDB();
  const tx = db.transaction('messages', 'readwrite');
  const store = tx.objectStore('messages');
  const msg = await store.get(id);
  if (msg) {
    msg.read = true;
    await store.put(msg);
  }
  await tx.done;
};

// --- 地図タイルキャッシュ操作 ---
export const cacheTile = async (tileId, blob) => {
  const db = await getDB();
  return db.put('tiles', {
    id: tileId,
    blob: blob,
    timestamp: Date.now()
  });
};

export const getCachedTile = async (tileId) => {
  const db = await getDB();
  return db.get('tiles', tileId);
};

export const clearTileCache = async () => {
  const db = await getDB();
  return db.clear('tiles');
};

export const getCachedTilesCount = async () => {
  const db = await getDB();
  const tx = db.transaction('tiles', 'readonly');
  const store = tx.objectStore('tiles');
  const count = await store.count();
  await tx.done;
  return count;
};
