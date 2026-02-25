/**
 * IndexedDB store for offline-pending records.
 *
 * Stores:
 *   attendance_pending   – AttendanceSyncRecord rows waiting to sync
 *   registration_pending – {local_id, event_id} rows waiting to sync
 *
 * Works in both the browser (real IDB) and tests (fake-indexeddb/auto).
 */

import type { AttendanceSyncRecord } from '@/lib/types';

const DB_NAME = 'skillzone-idb';
const DB_VERSION = 1;

// ─── DB open ──────────────────────────────────────────────────────────────────

let _dbPromise: Promise<IDBDatabase> | null = null;

export function openDB(): Promise<IDBDatabase> {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('attendance_pending')) {
        db.createObjectStore('attendance_pending', { keyPath: 'local_id' });
      }
      if (!db.objectStoreNames.contains('registration_pending')) {
        db.createObjectStore('registration_pending', { keyPath: 'local_id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
}

/** Reset the cached promise (needed between tests). */
export function _resetDBCache(): void {
  _dbPromise = null;
}

// ─── Generic helpers ──────────────────────────────────────────────────────────

async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  return new Promise<T[]>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

async function put<T>(storeName: string, value: T): Promise<void> {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function remove(storeName: string, key: string): Promise<void> {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export const queueAttendance = (record: AttendanceSyncRecord): Promise<void> =>
  put('attendance_pending', record);

export const getPendingAttendance = (): Promise<AttendanceSyncRecord[]> =>
  getAll<AttendanceSyncRecord>('attendance_pending');

export const removeAttendance = (localId: string): Promise<void> =>
  remove('attendance_pending', localId);

// ─── Pending registrations ────────────────────────────────────────────────────

export interface PendingRegistration {
  local_id: string;
  event_id: string;
  queued_at: string;
}

export async function queueRegistration(eventId: string): Promise<PendingRegistration> {
  const record: PendingRegistration = {
    local_id: crypto.randomUUID(),
    event_id: eventId,
    queued_at: new Date().toISOString(),
  };
  await put('registration_pending', record);
  return record;
}

export const getPendingRegistrations = (): Promise<PendingRegistration[]> =>
  getAll<PendingRegistration>('registration_pending');

export const removePendingRegistration = (localId: string): Promise<void> =>
  remove('registration_pending', localId);
