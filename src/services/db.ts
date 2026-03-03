import { Track } from '../types';

const DB_NAME = 'GlassPlayerDB';
const TRACKS_STORE = 'tracks';
const HISTORY_STORE = 'history';
const STATS_STORE = 'stats';
const DB_VERSION = 2;

export async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(TRACKS_STORE)) {
        db.createObjectStore(TRACKS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(HISTORY_STORE)) {
        db.createObjectStore(HISTORY_STORE, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STATS_STORE)) {
        db.createObjectStore(STATS_STORE, { keyPath: 'id' });
      }
    };
  });
}

export async function saveTrack(track: Track): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TRACKS_STORE, 'readwrite');
    const store = transaction.objectStore(TRACKS_STORE);
    const request = store.put(track);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getAllTracks(): Promise<Track[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TRACKS_STORE, 'readonly');
    const store = transaction.objectStore(TRACKS_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteTrack(id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TRACKS_STORE, 'readwrite');
    const store = transaction.objectStore(TRACKS_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function updateTrackInDB(track: Track): Promise<void> {
  return saveTrack(track);
}

export async function savePlayHistory(trackId: string, timestamp: number): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(HISTORY_STORE, 'readwrite');
    const store = transaction.objectStore(HISTORY_STORE);
    const request = store.add({ trackId, timestamp });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getPlayHistory(): Promise<{trackId: string, timestamp: number}[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(HISTORY_STORE, 'readonly');
    const store = transaction.objectStore(HISTORY_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function updateTotalListeningTime(seconds: number): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STATS_STORE, 'readwrite');
    const store = transaction.objectStore(STATS_STORE);
    
    const getRequest = store.get('total_time');
    getRequest.onsuccess = () => {
      const current = getRequest.result ? getRequest.result.value : 0;
      const putRequest = store.put({ id: 'total_time', value: current + seconds });
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function getTotalListeningTime(): Promise<number> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STATS_STORE, 'readonly');
    const store = transaction.objectStore(STATS_STORE);
    const request = store.get('total_time');
    request.onsuccess = () => resolve(request.result ? request.result.value : 0);
    request.onerror = () => reject(request.error);
  });
}
