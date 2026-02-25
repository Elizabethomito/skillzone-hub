import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { users as usersApi } from '@/lib/api';
import { getPendingAttendance, getPendingRegistrations } from '@/db/attendance';
import { requestSync, onSyncMessage } from '@/lib/sw';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Award, Calendar, TrendingUp, RefreshCw, Clock } from 'lucide-react';
import type { UserSkill, RegistrationWithEvent } from '@/lib/types';

function statusColor(s: string) {
  if (s === 'confirmed') return 'text-green-600 bg-green-50 border-green-200';
  if (s === 'conflict_pending') return 'text-amber-600 bg-amber-50 border-amber-200';
  if (s === 'waitlisted') return 'text-blue-600 bg-blue-50 border-blue-200';
  return 'text-muted-foreground bg-muted';
}

export default function Dashboard() {
  const { user, token } = useAuth();
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationWithEvent[]>([]);
  const [pendingAttendance, setPendingAttendance] = useState(0);
  const [pendingRegs, setPendingRegs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const loadData = async () => {
    if (!token) return;
    try {
      const [s, r] = await Promise.all([
        usersApi.mySkills(token),
        usersApi.myRegistrations(token),
      ]);
      setSkills(s);
      setRegistrations(r);
    } catch {
      // offline — stale data stays
    }
  };

  const loadPending = async () => {
    const [att, regs] = await Promise.all([getPendingAttendance(), getPendingRegistrations()]);
    setPendingAttendance(att.length);
    setPendingRegs(regs.length);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadData(), loadPending()]).finally(() => setLoading(false));

    // Listen for SW sync-complete messages
    const unsub = onSyncMessage(() => {
      setSyncing(false);
      loadData();
      loadPending();
    });
    return unsub;
  }, [token]);

  const handleSync = async () => {
    setSyncing(true);
    await requestSync();
    // Give SW a moment, then refresh
    setTimeout(() => { loadData(); loadPending(); setSyncing(false); }, 2000);
  };

  if (!user) return null;

  const completedRegs = registrations.filter((r) => r.event_status === 'completed');
  const activeRegs = registrations.filter((r) => r.event_status !== 'completed');
  const skillLevel = Math.min(100, skills.length * 12 + completedRegs.length * 8);
  const totalPending = pendingAttendance + pendingRegs;

  return (
    <div className="py-12">
      <div className="container max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground animate-fade-in">Dashboard</h1>
          {totalPending > 0 && (
            <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              Sync {totalPending} pending
            </Button>
          )}
        </div>

        {/* Pending offline banner */}
        {totalPending > 0 && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 animate-fade-in">
            <Clock className="h-4 w-4 shrink-0" />
            <span>
              <strong>{totalPending} item{totalPending !== 1 ? 's' : ''}</strong> waiting to sync
              {pendingAttendance > 0 && ` — ${pendingAttendance} check-in${pendingAttendance !== 1 ? 's' : ''}`}
              {pendingRegs > 0 && ` — ${pendingRegs} registration${pendingRegs !== 1 ? 's' : ''}`}.
              Badges will appear after sync.
            </span>
          </div>
        )}

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-32 rounded-xl border border-border bg-card animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 animate-fade-in">
              {/* User Info */}
              <div className="col-span-full rounded-xl border border-border bg-card p-6 shadow-card lg:col-span-2">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                    {user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-card-foreground">{user.name}</h2>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <Badge variant="secondary" className="mt-1 capitalize">{user.role}</Badge>
                  </div>
                </div>
              </div>

              {/* Skill Level */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-card" style={{ animationDelay: '0.05s' }}>
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <TrendingUp className="h-4 w-4" /> Skill Level
                </div>
                <div className="mb-2 text-2xl font-bold text-card-foreground">{skillLevel}%</div>
                <Progress value={skillLevel} className="h-2" />
              </div>

              {/* Badges */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-card" style={{ animationDelay: '0.1s' }}>
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Award className="h-4 w-4" /> Badges Earned
                </div>
                <div className="text-2xl font-bold text-card-foreground">{skills.length}</div>
              </div>
            </div>

            {/* Active Events */}
            <div className="mt-8 animate-fade-in" style={{ animationDelay: '0.15s' }}>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
                <Calendar className="h-5 w-5 text-primary" /> Registered Events
              </h2>
              {activeRegs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground shadow-card">
                  No upcoming events.{' '}
                  <Link to="/events" className="font-medium text-primary hover:underline">Browse events</Link> to get started.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {activeRegs.map((reg) => (
                    <div key={reg.id} className="rounded-xl border border-border bg-card p-5 shadow-card">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-card-foreground leading-snug">{reg.event_title}</h3>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${statusColor(reg.status)}`}>
                          {reg.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{reg.location}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(reg.start_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Completed Events */}
            {completedRegs.length > 0 && (
              <div className="mt-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <h2 className="mb-4 text-lg font-bold text-foreground">Completed Events</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {completedRegs.map((reg) => (
                    <div key={reg.id} className="rounded-xl border border-border bg-card p-5 shadow-card">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-card-foreground">{reg.event_title}</h3>
                        <Badge variant="secondary">Completed ✓</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{reg.location}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skill Badges */}
            <div className="mt-8 animate-fade-in" style={{ animationDelay: '0.25s' }}>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
                <Award className="h-5 w-5 text-primary" /> Earned Badges
              </h2>
              {skills.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground shadow-card">
                  No badges yet. Attend events to earn verified skill badges.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-3">
                  {skills.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-card">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Award className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-card-foreground">{s.skill?.name ?? s.skill_id}</p>
                        <p className="text-xs text-muted-foreground">{new Date(s.awarded_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
