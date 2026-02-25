import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getUserRegistrations, getUserBadges, getEventById } from '@/db/database';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { User, Award, Calendar, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();

  const registrations = useMemo(() => (user ? getUserRegistrations(user.id) : []), [user]);
  const badges = useMemo(() => (user ? getUserBadges(user.id) : []), [user]);

  const completedRegs = registrations.filter((r) => r.status === 'completed');
  const currentRegs = registrations.filter((r) => r.status !== 'completed');
  const skillLevel = Math.min(100, registrations.length * 15 + badges.length * 20);

  if (!user) return null;

  return (
    <div className="py-12">
      <div className="container max-w-5xl">
        <h1 className="mb-8 text-3xl font-bold text-foreground animate-fade-in">Dashboard</h1>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* User Info */}
          <div className="col-span-full rounded-xl border border-border bg-card p-6 shadow-card animate-fade-in lg:col-span-2">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                {user.first_name?.[0] || user.organization_name?.[0] || 'U'}
              </div>
              <div>
                <h2 className="text-lg font-bold text-card-foreground">
                  {user.role === 'organization' ? user.organization_name : `${user.first_name} ${user.last_name}`}
                </h2>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <Badge variant="secondary" className="mt-1 capitalize">{user.role}</Badge>
              </div>
            </div>
          </div>

          {/* Skill Level */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-card animate-fade-in" style={{ animationDelay: '0.05s' }}>
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4" /> Skill Level
            </div>
            <div className="mb-2 text-2xl font-bold text-card-foreground">{skillLevel}%</div>
            <Progress value={skillLevel} className="h-2" />
          </div>

          {/* Stats */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-card animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Award className="h-4 w-4" /> Badges Earned
            </div>
            <div className="text-2xl font-bold text-card-foreground">{badges.length}</div>
          </div>
        </div>

        {/* Current Events */}
        <div className="mt-8 animate-fade-in" style={{ animationDelay: '0.15s' }}>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
            <Calendar className="h-5 w-5 text-primary" /> Current Events
          </h2>
          {currentRegs.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground shadow-card">
              No current events. Browse the <a href="/events" className="font-medium text-primary hover:underline">Events</a> page to get started.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {currentRegs.map((reg) => {
                const event = getEventById(reg.event_id);
                return (
                  <div key={reg.id} className="rounded-xl border border-border bg-card p-5 shadow-card">
                    <h3 className="font-bold text-card-foreground">{event?.title || 'Unknown Event'}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{event?.organization_name}</p>
                    <Badge variant="secondary" className="mt-2 capitalize">{reg.status}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Past Events */}
        <div className="mt-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <h2 className="mb-4 text-lg font-bold text-foreground">Completed Events</h2>
          {completedRegs.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground shadow-card">
              No completed events yet.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {completedRegs.map((reg) => {
                const event = getEventById(reg.event_id);
                return (
                  <div key={reg.id} className="rounded-xl border border-border bg-card p-5 shadow-card">
                    <h3 className="font-bold text-card-foreground">{event?.title}</h3>
                    <Badge variant="secondary" className="mt-2">Completed ✓</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="mt-8 animate-fade-in" style={{ animationDelay: '0.25s' }}>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
            <Award className="h-5 w-5 text-primary" /> Earned Badges
          </h2>
          {badges.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground shadow-card">
              No badges earned yet. Complete events to earn verified skill badges.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              {badges.map((b) => (
                <div key={b.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-card">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-card-foreground">{b.skill_name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(b.issued_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
