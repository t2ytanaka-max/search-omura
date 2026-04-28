import { openDB } from 'idb';

const DB_NAME = 'SearchAppDB';
const DB_VERSION = 1;

export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Store for coordinate logs: { lat, lng, timestamp, trackId }
      if (!db.objectStoreNames.contains('logs')) {
        const store = db.createObjectStore('logs', { keyPath: 'timestamp' });
        store.createIndex('trackId', 'trackId');
      }
      
      // Store for track metadata or pending syncs
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'id' });
      }
    },
  });
};

export const saveLog = async (log) => {
  const db = await initDB();
  return db.put('logs', log);
};

export const getLogsByTrackId = async (trackId) => {
  const db = await initDB();
  return db.getAllFromIndex('logs', 'trackId', trackId);
};

export const getAllLogs = async () => {
  const db = await initDB();
  return db.getAll('logs');
};

export const deleteLogsUntil = async (timestamp) => {
  const db = await initDB();
  const tx = db.transaction('logs', 'readwrite');
  const store = tx.objectStore('logs');
  let cursor = await store.openCursor();
  
  while (cursor) {
    if (cursor.key <= timestamp) {
      await cursor.delete();
    }
    cursor = await cursor.continue();
  }
  await tx.done;
};
