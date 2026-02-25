/**
 * Tests for the IndexedDB attendance/registration store.
 * Uses fake-indexeddb so no real browser is needed.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';

// Import _resetDBCache so each test starts with a fresh DB connection
import {
  queueAttendance,
  getPendingAttendance,
  removeAttendance,
  queueRegistration,
  getPendingRegistrations,
  removePendingRegistration,
  openDB,
  _resetDBCache,
} from '@/db/attendance';

// Reset IDB between tests: reset the module cache, then clear both stores
beforeEach(async () => {
  _resetDBCache();
  // Opening with a fresh IDBFactory instance (fake-indexeddb/auto resets on each import call)
  // Instead: just clear the stores through openDB (schema is created on first open)
  const db = await openDB();
  await new Promise<void>((res, rej) => {
    const tx = db.transaction(['attendance_pending', 'registration_pending'], 'readwrite');
    tx.objectStore('attendance_pending').clear();
    tx.objectStore('registration_pending').clear();
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
});

// ─── Attendance ───────────────────────────────────────────────────────────────

describe('queueAttendance / getPendingAttendance', () => {
  it('stores and retrieves a record', async () => {
    const record = {
      local_id: 'local-001',
      event_id: 'event-abc',
      payload: '{"token":"jwt-abc"}',
    };
    await queueAttendance(record);
    const pending = await getPendingAttendance();
    expect(pending).toHaveLength(1);
    expect(pending[0]).toEqual(record);
  });

  it('is idempotent — second put with same local_id overwrites', async () => {
    const record = { local_id: 'dup', event_id: 'ev1', payload: '{"token":"a"}' };
    await queueAttendance(record);
    await queueAttendance({ ...record, payload: '{"token":"b"}' });
    const pending = await getPendingAttendance();
    expect(pending).toHaveLength(1);
    expect(pending[0].payload).toBe('{"token":"b"}');
  });
});

describe('removeAttendance', () => {
  it('deletes a record by local_id', async () => {
    await queueAttendance({ local_id: 'rm-001', event_id: 'ev1', payload: '{}' });
    await removeAttendance('rm-001');
    const pending = await getPendingAttendance();
    expect(pending).toHaveLength(0);
  });

  it('does not throw when deleting a non-existent key', async () => {
    await expect(removeAttendance('ghost-id')).resolves.toBeUndefined();
  });
});

// ─── Registration ─────────────────────────────────────────────────────────────

describe('queueRegistration / getPendingRegistrations', () => {
  it('stores a registration with a generated local_id', async () => {
    const reg = await queueRegistration('event-xyz');
    expect(reg.event_id).toBe('event-xyz');
    expect(reg.local_id).toMatch(/^[0-9a-f-]{36}$/); // UUID format
    const pending = await getPendingRegistrations();
    expect(pending).toHaveLength(1);
  });

  it('queues multiple registrations independently', async () => {
    await queueRegistration('event-1');
    await queueRegistration('event-2');
    const pending = await getPendingRegistrations();
    expect(pending).toHaveLength(2);
    const eventIds = pending.map((p) => p.event_id);
    expect(eventIds).toContain('event-1');
    expect(eventIds).toContain('event-2');
  });
});

describe('removePendingRegistration', () => {
  it('removes by local_id', async () => {
    const reg = await queueRegistration('event-del');
    await removePendingRegistration(reg.local_id);
    const pending = await getPendingRegistrations();
    expect(pending).toHaveLength(0);
  });
});

// ─── CheckInPayload parsing (inline, mirrors CheckIn.tsx logic) ───────────────

describe('CheckInPayload token parsing', () => {
  function parseToken(raw: string): string | null {
    const s = raw.trim();
    if (!s) return null;
    try {
      const obj = JSON.parse(s);
      if (typeof obj.token === 'string') return obj.token;
    } catch { /* not JSON */ }
    if (/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(s)) return s;
    return null;
  }

  it('extracts token from JSON envelope', () => {
    const jwt = 'eyJhbGci.payload.sig';
    expect(parseToken(JSON.stringify({ token: jwt }))).toBe(jwt);
  });

  it('accepts a bare JWT string', () => {
    expect(parseToken('header.payload.sig')).toBe('header.payload.sig');
  });

  it('returns null for empty input', () => {
    expect(parseToken('')).toBeNull();
    expect(parseToken('   ')).toBeNull();
  });

  it('returns null for random text', () => {
    expect(parseToken('not-a-token')).toBeNull();
  });
});
