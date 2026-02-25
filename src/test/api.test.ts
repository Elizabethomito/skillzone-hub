/**
 * Tests for the typed API client (src/lib/api.ts).
 * We mock globalThis.fetch so no real server is needed.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { auth, users, events, sync, ApiError, saveToken, loadToken, removeToken } from '@/lib/api';

// ─── Fetch mock helpers ───────────────────────────────────────────────────────

function mockFetch(status: number, body: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: async () => body,
  } as Response);
}

function mockFetchFail(body: unknown, status = 400) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
    ok: false,
    status,
    statusText: 'Bad Request',
    json: async () => body,
  } as Response);
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());

// ─── Token storage ────────────────────────────────────────────────────────────

describe('token storage', () => {
  beforeEach(() => localStorage.clear());

  it('saves and loads a token', () => {
    saveToken('abc');
    expect(loadToken()).toBe('abc');
  });

  it('removes a token', () => {
    saveToken('abc');
    removeToken();
    expect(loadToken()).toBeNull();
  });
});

// ─── auth.login ───────────────────────────────────────────────────────────────

describe('auth.login', () => {
  it('sends POST /api/auth/login with credentials', async () => {
    const spy = mockFetch(200, { token: 'jwt', user: { id: '1', name: 'Test', role: 'student', email: 'a@b.com', created_at: '', updated_at: '' } });
    const res = await auth.login({ email: 'a@b.com', password: 'pass1234' });
    expect(res.token).toBe('jwt');
    const call = spy.mock.calls[0];
    expect(call[0]).toContain('/api/auth/login');
    expect((call[1] as RequestInit).method).toBe('POST');
    const sent = JSON.parse((call[1] as RequestInit).body as string);
    expect(sent).toEqual({ email: 'a@b.com', password: 'pass1234' });
  });

  it('throws ApiError on 401', async () => {
    mockFetchFail({ error: 'invalid credentials' }, 401);
    await expect(auth.login({ email: 'x@x.com', password: 'wrong' })).rejects.toBeInstanceOf(ApiError);
  });
});

// ─── auth.register ────────────────────────────────────────────────────────────

describe('auth.register', () => {
  it('sends POST /api/auth/register with role=student', async () => {
    const spy = mockFetch(200, { token: 'jwt', user: { id: '2', name: 'New', role: 'student', email: 'n@b.com', created_at: '', updated_at: '' } });
    await auth.register({ email: 'n@b.com', password: 'pass1234', name: 'New', role: 'student' });
    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.role).toBe('student');
  });
});

// ─── users.mySkills ───────────────────────────────────────────────────────────

describe('users.mySkills', () => {
  it('attaches Authorization header', async () => {
    const spy = mockFetch(200, []);
    await users.mySkills('my-token');
    const headers = (spy.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer my-token');
  });
});

// ─── events.list ─────────────────────────────────────────────────────────────

describe('events.list', () => {
  it('returns parsed Event array', async () => {
    const evs = [{ id: 'e1', title: 'Test Event', status: 'upcoming' }];
    mockFetch(200, evs);
    const res = await events.list('tok');
    expect(res).toEqual(evs);
  });
});

// ─── events.register ─────────────────────────────────────────────────────────

describe('events.register', () => {
  it('sends POST to /api/events/{id}/register', async () => {
    const spy = mockFetch(200, { id: 'r1', status: 'confirmed' });
    await events.register('event-abc', 'tok');
    expect(spy.mock.calls[0][0]).toContain('/api/events/event-abc/register');
    expect((spy.mock.calls[0][1] as RequestInit).method).toBe('POST');
  });
});

// ─── events.checkinCode ──────────────────────────────────────────────────────

describe('events.checkinCode', () => {
  it('calls GET /api/events/{id}/checkin-code and returns token', async () => {
    mockFetch(200, { event_id: 'e1', token: 'jwt-checkin', expires_in_seconds: 21600 });
    const res = await events.checkinCode('e1', 'tok');
    expect(res.token).toBe('jwt-checkin');
    expect(res.expires_in_seconds).toBe(21600);
  });
});

// ─── events.resolveConflict ──────────────────────────────────────────────────

describe('events.resolveConflict', () => {
  it('sends PATCH with action confirm', async () => {
    const spy = mockFetch(200, { id: 'r1', status: 'confirmed' });
    await events.resolveConflict('ev1', 'reg1', { action: 'confirm' }, 'tok');
    const call = spy.mock.calls[0];
    expect(call[0]).toContain('/api/events/ev1/registrations/reg1');
    expect((call[1] as RequestInit).method).toBe('PATCH');
    const body = JSON.parse((call[1] as RequestInit).body as string);
    expect(body.action).toBe('confirm');
  });
});

// ─── sync.attendance ──────────────────────────────────────────────────────────

describe('sync.attendance', () => {
  it('sends records and returns results', async () => {
    const results = [{ local_id: 'local-1', status: 'verified' }];
    const spy = mockFetch(200, { results });
    const res = await sync.attendance(
      { records: [{ local_id: 'local-1', event_id: 'e1', payload: '{"token":"jwt"}' }] },
      'tok',
    );
    expect(res.results[0].status).toBe('verified');
    expect(spy.mock.calls[0][0]).toContain('/api/sync/attendance');
  });
});

// ─── ApiError ────────────────────────────────────────────────────────────────

describe('ApiError', () => {
  it('carries status code', async () => {
    mockFetchFail({ error: 'not found' }, 404);
    try {
      await events.list('tok');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).status).toBe(404);
      expect((e as ApiError).message).toBe('not found');
    }
  });
});
