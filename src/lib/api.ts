import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  User,
  Event,
  UserSkill,
  RegistrationWithEvent,
  RegistrationWithStudent,
  SyncAttendanceRequest,
  SyncAttendanceResponse,
  CheckInCodeResponse,
  UpdateEventStatusRequest,
  ResolveConflictRequest,
  Registration,
  CreateEventRequest,
} from './types';

const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

// ─── Low-level fetch wrapper ─────────────────────────────────────────────────

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      msg = body.error ?? body.message ?? msg;
    } catch {
      // ignore parse error
    }
    throw new ApiError(res.status, msg);
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// ─── Token storage helpers ────────────────────────────────────────────────────

const TOKEN_KEY = 'skillzone_jwt';

export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function loadToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export const auth = {
  register: (body: RegisterRequest) =>
    request<LoginResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (body: LoginRequest) =>
    request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = {
  me: (token: string) => request<User>('/api/users/me', {}, token),

  mySkills: (token: string) => request<UserSkill[]>('/api/users/me/skills', {}, token),

  myRegistrations: (token: string) =>
    request<RegistrationWithEvent[]>('/api/users/me/registrations', {}, token),
};

// ─── Events ───────────────────────────────────────────────────────────────────

export const events = {
  list: (token: string) => request<Event[]>('/api/events', {}, token),

  get: (id: string, token: string) => request<Event>(`/api/events/${id}`, {}, token),

  create: (body: CreateEventRequest, token: string) =>
    request<Event>('/api/events', { method: 'POST', body: JSON.stringify(body) }, token),

  updateStatus: (id: string, body: UpdateEventStatusRequest, token: string) =>
    request<Event>(`/api/events/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }, token),

  register: (id: string, token: string) =>
    request<Registration>(`/api/events/${id}/register`, { method: 'POST' }, token),

  checkinCode: (id: string, token: string) =>
    request<CheckInCodeResponse>(`/api/events/${id}/checkin-code`, {}, token),

  registrations: (id: string, token: string) =>
    request<RegistrationWithStudent[]>(`/api/events/${id}/registrations`, {}, token),

  resolveConflict: (
    eventId: string,
    registrationId: string,
    body: ResolveConflictRequest,
    token: string,
  ) =>
    request<Registration>(
      `/api/events/${eventId}/registrations/${registrationId}`,
      { method: 'PATCH', body: JSON.stringify(body) },
      token,
    ),
};

// ─── Sync ─────────────────────────────────────────────────────────────────────

export const sync = {
  attendance: (body: SyncAttendanceRequest, token: string) =>
    request<SyncAttendanceResponse>('/api/sync/attendance', {
      method: 'POST',
      body: JSON.stringify(body),
    }, token),
};

export { ApiError };
