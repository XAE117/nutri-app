/**
 * IndexedDB-based offline queue for photo captures.
 * When offline, photos are stored locally and synced on reconnect.
 */

const DB_NAME = "nutrilens-offline";
const STORE_NAME = "photo-queue";
const DB_VERSION = 1;

interface QueuedPhoto {
  id?: number;
  blob: Blob;
  timestamp: number;
  mealType?: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queuePhoto(
  blob: Blob,
  mealType?: string
): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  store.add({
    blob,
    timestamp: Date.now(),
    mealType,
  } as QueuedPhoto);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getQueuedPhotos(): Promise<QueuedPhoto[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function removeFromQueue(id: number): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.delete(id);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getQueueSize(): Promise<number> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const request = store.count();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Sync all queued photos. Called on reconnect.
 */
export async function syncQueue(
  uploadFn: (blob: Blob, mealType?: string) => Promise<boolean>
): Promise<number> {
  const photos = await getQueuedPhotos();
  let synced = 0;

  for (const photo of photos) {
    try {
      const success = await uploadFn(photo.blob, photo.mealType);
      if (success && photo.id) {
        await removeFromQueue(photo.id);
        synced++;
      }
    } catch {
      // Stop on first failure — network may be flaky
      break;
    }
  }

  return synced;
}
