// Local-first data layer — uses localStorage, structured for backend sync

export interface User {
  id: string;
  role: 'user' | 'organization';
  first_name: string;
  last_name: string;
  organization_name: string;
  email: string;
  password_hash: string;
  created_at: string;
}

export interface SkillEvent {
  id: string;
  title: string;
  description: string;
  organization_id: string;
  organization_name: string;
  skill_category: string;
  created_at: string;
}

export interface Registration {
  id: string;
  user_id: string;
  event_id: string;
  status: 'applied' | 'confirmed' | 'completed';
  verified: boolean;
}

export interface Badge {
  id: string;
  user_id: string;
  skill_name: string;
  event_id: string;
  issued_at: string;
}

// Storage helpers
function getTable<T>(name: string): T[] {
  try {
    const data = localStorage.getItem(`skillzone_${name}`);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setTable<T>(name: string, data: T[]): void {
  localStorage.setItem(`skillzone_${name}`, JSON.stringify(data));
}

function generateId(): string {
  return crypto.randomUUID();
}

// Password hashing using Web Crypto API
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── User Operations ──

export async function createUser(data: {
  role: 'user' | 'organization';
  first_name: string;
  last_name: string;
  organization_name: string;
  email: string;
  password: string;
}): Promise<User> {
  const users = getTable<User>('users');
  if (users.find((u) => u.email === data.email)) {
    throw new Error('Email already registered');
  }
  const user: User = {
    id: generateId(),
    role: data.role,
    first_name: data.first_name,
    last_name: data.last_name,
    organization_name: data.organization_name,
    email: data.email,
    password_hash: await hashPassword(data.password),
    created_at: new Date().toISOString(),
  };
  users.push(user);
  setTable('users', users);
  return user;
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<User | null> {
  const users = getTable<User>('users');
  const hash = await hashPassword(password);
  return users.find((u) => u.email === email && u.password_hash === hash) || null;
}

export function getUserById(id: string): User | null {
  return getTable<User>('users').find((u) => u.id === id) || null;
}

export function updateUser(id: string, data: Partial<Pick<User, 'first_name' | 'last_name' | 'organization_name' | 'email'>>): User | null {
  const users = getTable<User>('users');
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  users[idx] = { ...users[idx], ...data };
  setTable('users', users);
  return users[idx];
}

export function deleteUser(id: string): void {
  setTable('users', getTable<User>('users').filter((u) => u.id !== id));
  setTable('registrations', getTable<Registration>('registrations').filter((r) => r.user_id !== id));
  setTable('badges', getTable<Badge>('badges').filter((b) => b.user_id !== id));
}

// ── Event Operations ──

export function getEvents(): SkillEvent[] {
  return getTable<SkillEvent>('events');
}

export function getEventById(id: string): SkillEvent | null {
  return getTable<SkillEvent>('events').find((e) => e.id === id) || null;
}

// ── Registration Operations ──

export function registerForEvent(userId: string, eventId: string): Registration {
  const regs = getTable<Registration>('registrations');
  const existing = regs.find((r) => r.user_id === userId && r.event_id === eventId);
  if (existing) throw new Error('Already registered for this event');
  const reg: Registration = {
    id: generateId(),
    user_id: userId,
    event_id: eventId,
    status: 'applied',
    verified: false,
  };
  regs.push(reg);
  setTable('registrations', regs);
  return reg;
}

export function getUserRegistrations(userId: string): Registration[] {
  return getTable<Registration>('registrations').filter((r) => r.user_id === userId);
}

// ── Badge Operations ──

export function getUserBadges(userId: string): Badge[] {
  return getTable<Badge>('badges').filter((b) => b.user_id === userId);
}

// ── Session ──

export function setSession(userId: string): void {
  localStorage.setItem('skillzone_session', userId);
}

export function getSession(): string | null {
  return localStorage.getItem('skillzone_session');
}

export function clearSession(): void {
  localStorage.removeItem('skillzone_session');
}

// ── Seed Data ──

export function seedIfEmpty(): void {
  if (getTable<SkillEvent>('events').length > 0) return;

  const events: SkillEvent[] = [
    {
      id: generateId(),
      title: 'Full-Stack Web Development Bootcamp',
      description: 'Intensive 4-week program covering React, Node.js, and database design. Gain practical skills through hands-on projects.',
      organization_id: 'org-1',
      organization_name: 'TechBridge Academy',
      skill_category: 'Software Development',
      created_at: new Date().toISOString(),
    },
    {
      id: generateId(),
      title: 'Healthcare Data Analytics Workshop',
      description: 'Learn to analyze patient data, build dashboards, and make data-driven decisions in healthcare settings.',
      organization_id: 'org-2',
      organization_name: 'MedTech Solutions',
      skill_category: 'Data Analytics',
      created_at: new Date().toISOString(),
    },
    {
      id: generateId(),
      title: 'Cloud Engineering Internship',
      description: '3-month internship focused on AWS and Azure infrastructure, DevOps practices, and cloud architecture.',
      organization_id: 'org-3',
      organization_name: 'CloudNine Systems',
      skill_category: 'Cloud Computing',
      created_at: new Date().toISOString(),
    },
    {
      id: generateId(),
      title: 'UX/UI Design Sprint',
      description: 'Weekend design sprint covering user research, wireframing, prototyping, and usability testing.',
      organization_id: 'org-4',
      organization_name: 'DesignForward Studio',
      skill_category: 'Design',
      created_at: new Date().toISOString(),
    },
    {
      id: generateId(),
      title: 'Cybersecurity Fundamentals Certification',
      description: 'Comprehensive program covering network security, ethical hacking, and security compliance frameworks.',
      organization_id: 'org-5',
      organization_name: 'SecureNet Institute',
      skill_category: 'Cybersecurity',
      created_at: new Date().toISOString(),
    },
    {
      id: generateId(),
      title: 'Digital Marketing & SEO Masterclass',
      description: 'Master search engine optimization, social media marketing, and content strategy for modern businesses.',
      organization_id: 'org-6',
      organization_name: 'GrowthLab Agency',
      skill_category: 'Marketing',
      created_at: new Date().toISOString(),
    },
  ];
  setTable('events', events);
}
