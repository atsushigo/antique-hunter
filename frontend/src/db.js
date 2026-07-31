import { openDB } from 'idb';

const DB_NAME = 'antique-hunter';
const DB_VERSION = 1;

let dbPromise = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('appraisals')) {
          const store = db.createObjectStore('appraisals', {
            keyPath: 'localId',
            autoIncrement: true,
          });
          store.createIndex('status', 'status');
          store.createIndex('createdAt', 'createdAt');
        }
      },
    });
  }
  return dbPromise;
}

export async function enqueueAppraisal(entry) {
  const db = await getDb();
  return db.add('appraisals', {
    status: 'pending',
    createdAt: new Date().toISOString(),
    ...entry,
  });
}

export async function listAppraisals() {
  const db = await getDb();
  return db.getAllFromIndex('appraisals', 'createdAt');
}

export async function updateAppraisal(localId, patch) {
  const db = await getDb();
  const existing = await db.get('appraisals', localId);
  if (!existing) return null;
  const merged = { ...existing, ...patch };
  await db.put('appraisals', merged);
  return merged;
}

export async function pendingAppraisals() {
  const db = await getDb();
  return db.getAllFromIndex('appraisals', 'status', IDBKeyRange.only('pending'));
}
