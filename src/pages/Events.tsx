import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { events as eventsApi } from '@/lib/api';
import { queueRegistration, getPendingRegistrations } from '@/db/attendance';
import { requestSync } from '@/lib/sw';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Calendar, MapPin, Users, Wifi, WifiOff, QrCode } from 'lucide-react';
import type { Event, RegistrationWithEvent } from '@/lib/types';

function statusColor(s: string) {
  if (s === 'active') return 'bg-green-500/10 text-green-600 border-green-200';
  if (s === 'completed') return 'bg-muted text-muted-foreground';
  return 'bg-blue-500/10 text-blue-600 border-blue-200';
}

export default function Events() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [eventList, setEventList] = useState<Event[]>([]);
  const [myRegs, setMyRegs] = useState<RegistrationWithEvent[]>([]);
  const [pendingLocalIds, setPendingLocalIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Track online/offline
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // Load events + registrations
  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const [evs, regs] = await Promise.all([
        eventsApi.list(token),
        user?.role === 'student' ? eventsApi['list'](token).then(() => import('@/lib/api').then(m => m.users.myRegistrations(token))) : Promise.resolve([]),
      ]);
      setEventList(evs);
      setMyRegs(regs as RegistrationWithEvent[]);
    } catch {
      // Offline — show cached data or empty
    } finally {
      setLoading(false);
    }
  }, [token, user?.role]);

  // Also load actual registrations for students
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    const load = async () => {
      try {
        const evs = await eventsApi.list(token);
        setEventList(evs);
        if (user?.role === 'student') {
          const { users: usersApi } = await import('@/lib/api');
          const regs = await usersApi.myRegistrations(token);
          setMyRegs(regs);
        }
      } catch {
        // stay with empty / stale
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, user?.role]);

  // Load pending offline registrations from IndexedDB
  useEffect(() => {
    getPendingRegistrations().then((pending) => {
      setPendingLocalIds(new Set(pending.map((p) => p.event_id)));
    });
  }, []);

  const isRegistered = (eventId: string) =>
    myRegs.some((r) => r.event_id === eventId) || pendingLocalIds.has(eventId);

  const handleApply = async (event: Event) => {
    if (!token || !user) return;

    if (!isOnline) {
      // Queue offline
      try {
        await queueRegistration(event.id);
        setPendingLocalIds((prev) => new Set([...prev, event.id]));
        await requestSync();
        toast({
          title: 'Queued offline ✓',
          description: `Registration for "${event.title}" will sync when you reconnect.`,
        });
      } catch (err: any) {
        toast({ title: err.message || 'Failed to queue', variant: 'destructive' });
      }
      return;
    }

    try {
      await eventsApi.register(event.id, token);
      // Refresh registrations
      const { users: usersApi } = await import('@/lib/api');
      const regs = await usersApi.myRegistrations(token);
      setMyRegs(regs);
      toast({ title: 'Registered ✓', description: event.title });
    } catch (err: any) {
      if (err.status === 409) {
        toast({ title: 'Already registered', variant: 'default' });
      } else {
        toast({ title: err.message || 'Registration failed', variant: 'destructive' });
      }
    }
  };

  const handleCheckinScan = (event: Event) => {
    navigate(`/checkin/${event.id}`);
  };

  if (loading) {
    return (
      <div className="py-12">
        <div className="container">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 rounded-xl border border-border bg-card animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12">
      <div className="container">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground md:text-4xl animate-fade-in">
              Available <span className="text-gradient-blue">Events</span>
            </h1>
            <p className="mt-2 text-muted-foreground animate-fade-in">
              Browse and register for events, internships, and workshops.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isOnline
              ? <><Wifi className="h-4 w-4 text-green-500" /> Online</>
              : <><WifiOff className="h-4 w-4 text-amber-500" /> Offline</>}
          </div>
        </div>

        {eventList.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-16 text-center text-muted-foreground">
            {isOnline ? 'No events available yet.' : 'Cannot load events — you are offline.'}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {eventList.map((event, i) => {
              const registered = isRegistered(event.id);
              const isPending = pendingLocalIds.has(event.id) && !myRegs.some((r) => r.event_id === event.id);
              const regStatus = myRegs.find((r) => r.event_id === event.id)?.status;
              const isFull = event.slots_remaining === 0;

              return (
                <div
                  key={event.id}
                  className="flex flex-col rounded-xl border border-border bg-card p-6 shadow-card transition-all hover:shadow-card-hover animate-fade-in"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  {/* Status badge */}
                  <div className="mb-3 flex items-center justify-between">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${statusColor(event.status)}`}>
                      {event.status}
                    </span>
                    {event.skills && event.skills.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {event.skills.length} badge{event.skills.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>

                  <h3 className="mb-2 text-lg font-bold text-card-foreground leading-snug">{event.title}</h3>
                  <p className="mb-4 flex-1 text-sm leading-relaxed text-muted-foreground line-clamp-3">{event.description}</p>

                  {/* Meta */}
                  <div className="mb-4 space-y-1.5 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{event.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      {new Date(event.start_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {event.capacity != null && (
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 shrink-0" />
                        {isFull ? (
                          <span className="text-amber-600 font-medium">Full</span>
                        ) : (
                          <span>{event.slots_remaining} / {event.capacity} slots remaining</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Skills */}
                  {event.skills && event.skills.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-1">
                      {event.skills.map((s) => (
                        <span key={s.id} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{s.name}</span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    {user?.role === 'student' && (
                      <>
                        {registered ? (
                          <Button variant="secondary" className="w-full" disabled>
                            {isPending ? '⏳ Queued offline' : regStatus ? `${regStatus.replace('_', ' ')} ✓` : 'Registered ✓'}
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleApply(event)}
                            disabled={isFull && isOnline}
                            className="w-full"
                          >
                            {isFull && isOnline ? 'Full — Apply anyway' : !isOnline ? '📥 Apply (offline)' : 'Apply / Register'}
                          </Button>
                        )}
                        {event.status === 'active' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full gap-2"
                            onClick={() => handleCheckinScan(event)}
                          >
                            <QrCode className="h-4 w-4" />
                            Scan QR Check-in
                          </Button>
                        )}
                      </>
                    )}
                    {user?.role === 'company' && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => navigate(`/host/events/${event.id}`)}
                      >
                        Manage Event
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
