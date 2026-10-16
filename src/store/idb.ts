/** A very small promise wrapper around one IndexedDB database with a few key-value stores. */
const DB_NAME = 'tabib';
const STORES = ['users', 'vaults', 'files', 'session', 'attempts', 'outbox'] as const;
export type StoreName = (typeof STORES)[number];

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in globalThis)) return reject(new Error('storage-unavailable'));
      // Some in-app browsers never answer an open request; give up after 3 s so the app still loads.
      // If the answer comes later after all, later calls use it.
      const timer = setTimeout(() => reject(new Error('storage-unavailable')), 3000);
      const req = indexedDB.open(DB_NAME, 2); // 2 adds the outbox for the owner's customer list
      req.onupgradeneeded = () => {
        for (const s of STORES) if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s);
      };
      req.onsuccess = () => {
        clearTimeout(timer);
        dbPromise = Promise.resolve(req.result);
        resolve(req.result);
      };
      req.onerror = () => reject(new Error('storage-unavailable'));
      req.onblocked = () => reject(new Error('storage-unavailable'));
    });
    // A failed or timed-out open is remembered for this visit, so later reads fail at once instead of waiting again.
    dbPromise.catch(() => {});
  }
  return dbPromise;
}

function run<T>(store: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const req = fn(tx.objectStore(store));
        tx.oncomplete = () => resolve(req.result as T);
        tx.onerror = () => reject(tx.error ?? new Error('storage-error'));
        tx.onabort = () => reject(tx.error ?? new Error('storage-error'));
      }),
  );
}

export const idb = {
  get: <T>(store: StoreName, key: string) => run<T | undefined>(store, 'readonly', (s) => s.get(key)),
  put: (store: StoreName, key: string, value: unknown) => run<IDBValidKey>(store, 'readwrite', (s) => s.put(value, key)),
  del: (store: StoreName, key: string) => run<undefined>(store, 'readwrite', (s) => s.delete(key)),
  keys: (store: StoreName) => run<IDBValidKey[]>(store, 'readonly', (s) => s.getAllKeys()),
  /** Deletes several entries in one transaction: either all of them go or none does. */
  removeAll: (entries: [StoreName, string][]) =>
    open().then(
      (db) =>
        new Promise<void>((resolve, reject) => {
          if (!entries.length) return resolve();
          const tx = db.transaction([...new Set(entries.map(([s]) => s))], 'readwrite');
          for (const [store, key] of entries) tx.objectStore(store).delete(key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error ?? new Error('storage-error'));
          tx.onabort = () => reject(tx.error ?? new Error('storage-error'));
        }),
    ),
};
