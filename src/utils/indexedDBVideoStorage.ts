/**
 * IndexedDB storage utility for saving the active project video file
 * so that both the video player and subtitle captions persist across page refreshes.
 */

const DB_NAME = 'SFLOW_Studio_DB';
const DB_VERSION = 1;
const STORE_NAME = 'video_store';

export async function openVideoDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveVideoFileToDB(file: File): Promise<void> {
  try {
    const db = await openVideoDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(file, 'current_project_video');
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('Failed to store video file in IndexedDB:', e);
  }
}

export async function getVideoFileFromDB(): Promise<File | null> {
  try {
    const db = await openVideoDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get('current_project_video');
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn('Failed to retrieve video file from IndexedDB:', e);
    return null;
  }
}

export async function clearVideoFileFromDB(): Promise<void> {
  try {
    const db = await openVideoDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete('current_project_video');
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('Failed to clear video file from IndexedDB:', e);
  }
}
