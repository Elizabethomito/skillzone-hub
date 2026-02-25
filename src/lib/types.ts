// ─── Enumerations ────────────────────────────────────────────────────────────

export type UserRole = 'student' | 'company';

export type EventStatus = 'upcoming' | 'active' | 'completed';

/** Server-side attendance state for a single check-in record. */
export type AttendanceStatus = 'pending' | 'verified' | 'rejected';

/**
 * Slot-allocation outcome for a registration.
 * A student gets conflict_pending when they register and no slots remain.
 * The host resolves it via the dashboard.
 */
export type RegistrationStatus = 'confirmed' | 'conflict_pending' | 'waitlisted';

// ─── Domain Models ───────────────────────────────────────────────────────────

export interface User {
  id: string;         // UUID v4
  email: string;
  name: string;
  role: UserRole;
  created_at: string; // ISO 8601
  updated_at: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

/**
 * capacity and slots_remaining are absent (undefined) when the event has no
 * slot limit. A value of 0 for slots_remaining means the event is full.
 */
export interface Event {
  id: string;
  host_id: string;
  title: string;
  description: string;
  location: string;
  start_time: string;    // ISO 8601
  end_time: string;
  status: EventStatus;
  capacity?: number;
  slots_remaining?: number;
  created_at: string;
  updated_at: string;
  skills?: Skill[];
}

export interface Registration {
  id: string;
  event_id: string;
  student_id: string;
  registered_at: string;
  status: RegistrationStatus;
}

export interface Attendance {
  id: string;
  event_id: string;
  student_id: string;
  payload: string;
  status: AttendanceStatus;
  created_at: string;
  updated_at: string;
}

export interface UserSkill {
  id: string;
  user_id: string;
  skill_id: string;
  event_id: string;
  awarded_at: string;
  skill?: Skill;
}

// ─── Request / Response DTOs ─────────────────────────────────────────────────

export interface RegisterRequest {
  email: string;
  password: string; // minimum 8 characters
  name: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface CreateEventRequest {
  title: string;
  description: string;
  location: string;
  start_time: string;
  end_time: string;
  skill_ids: string[];
  capacity?: number;
}

export interface UpdateEventStatusRequest {
  status: EventStatus;
}

export interface ResolveConflictRequest {
  action: 'confirm' | 'waitlist';
}

/**
 * One pending check-in record from IndexedDB, ready to sync.
 * payload is the raw JSON string captured from the host's QR code.
 */
export interface AttendanceSyncRecord {
  local_id: string;
  event_id: string;
  payload: string; // stringified CheckInPayload
}

export interface SyncAttendanceRequest {
  records: AttendanceSyncRecord[];
}

export interface SyncResult {
  local_id: string;
  status: AttendanceStatus;
  message?: string;
}

export interface SyncAttendanceResponse {
  results: SyncResult[];
}

/**
 * The JSON the PWA stores in IndexedDB after a QR scan, sent as
 * AttendanceSyncRecord.payload (JSON-stringified).
 */
export interface CheckInPayload {
  token: string; // signed HS256 JWT from GET /api/events/{id}/checkin-code
}

export interface CheckInCodeResponse {
  event_id: string;
  token: string;
  expires_in_seconds: number;
}

// ─── Extended shapes (from JOIN queries) ─────────────────────────────────────

/** Returned by GET /api/events/{id}/registrations (host dashboard). */
export interface RegistrationWithStudent extends Registration {
  student_name: string;
  student_email: string;
}

/** Returned by GET /api/users/me/registrations (student dashboard). */
export interface RegistrationWithEvent extends Registration {
  event_title: string;
  start_time: string;
  end_time: string;
  event_status: EventStatus;
  location: string;
}
