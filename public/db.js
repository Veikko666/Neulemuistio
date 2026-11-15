// Pieni IndexedDB-kääre: projektit, tiedostot (kuvat, PDF:t), välineet ja lankavarasto tallennetaan laitteelle.
const DB_NAME = 'neulemuistio';
const DB_VERSION = 3;
let dbPromise;

function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains('projects')) d.createObjectStore('projects', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('files')) d.createObjectStore('files', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('tools')) d.createObjectStore('tools', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('yarns')) d.createObjectStore('yarns', { keyPath: 'id' });
      };
      req.onsuccess = () => {
        const d = req.result;
        // Jos sovellus päivittyy toisessa välilehdessä, vapautetaan tietokanta päivitystä varten.
        d.onversionchange = () => d.close();
        resolve(d);
      };
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

async function run(store, mode, fn) {
  const d = await open();
  return new Promise((resolve, reject) => {
    const t = d.transaction(store, mode);
    const req = fn(t.objectStore(store));
    t.oncomplete = () => resolve(req ? req.result : undefined);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export const db = {
  all: (store) => run(store, 'readonly', (s) => s.getAll()),
  get: (store, id) => run(store, 'readonly', (s) => s.get(id)),
  put: (store, value) => run(store, 'readwrite', (s) => s.put(value)),
  del: (store, id) => run(store, 'readwrite', (s) => s.delete(id)),
};
