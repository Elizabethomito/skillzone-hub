/**
 * HostDashboard — /host
 *
 * Lets a company user:
 *  - See all events they host
 *  - Change event status (upcoming → active → completed)
 *  - Generate a check-in QR code
 *  - View registrations and resolve conflicts (confirm / waitlist)
 */

import { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/context/AuthContext';
import { events as eventsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { QrCode, ChevronDown, ChevronUp, RefreshCw, CheckCircle, Clock, AlertTriangle, Copy, Check } from 'lucide-react';
import type { Event, RegistrationWithStudent, CheckInCodeResponse } from '@/lib/types';

function statusBadgeClass(s: string) {
  if (s === 'active') return 'bg-green-100 text-green-700 border-green-200';
  if (s === 'completed') return 'bg-muted text-muted-foreground';
  return 'bg-blue-100 text-blue-700 border-blue-200';
}

function regStatusIcon(s: string) {
  if (s === 'confirmed') return <CheckCircle className="h-4 w-4 text-green-500" />;
  if (s === 'conflict_pending') return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  return <Clock className="h-4 w-4 text-blue-500" />;
}

interface EventPanelProps {
  event: Event;
  token: string;
  onRefresh: () => void;
}

function EventPanel({ event, token, onRefresh }: EventPanelProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [regs, setRegs] = useState<RegistrationWithStudent[]>([]);
  const [qrData, setQrData] = useState<CheckInCodeResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [loadingRegs, setLoadingRegs] = useState(false);
  const [loadingQr, setLoadingQr] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadRegistrations = useCallback(async () => {
    setLoadingRegs(true);
    try {
      const data = await eventsApi.registrations(event.id, token);
      setRegs(data);
    } catch (err: any) {
      toast({ title: err.message || 'Failed to load registrations', variant: 'destructive' });
    } finally {
      setLoadingRegs(false);
    }
  }, [event.id, token]);

  useEffect(() => {
    if (open) loadRegistrations();
  }, [open]);

  const handleStatusChange = async (newStatus: 'upcoming' | 'active' | 'completed') => {
    setUpdatingStatus(true);
    try {
      await eventsApi.updateStatus(event.id, { status: newStatus }, token);
      toast({ title: `Event marked as ${newStatus}` });
      onRefresh();
    } catch (err: any) {
      toast({ title: err.message || 'Failed to update status', variant: 'destructive' });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleGenerateQr = async () => {
    setLoadingQr(true);
    try {
      const data = await eventsApi.checkinCode(event.id, token);
      setQrData(data);
    } catch (err: any) {
      toast({ title: err.message || 'Failed to generate QR', variant: 'destructive' });
    } finally {
      setLoadingQr(false);
    }
  };

  const handleResolve = async (regId: string, action: 'confirm' | 'waitlist') => {
    try {
      await eventsApi.resolveConflict(event.id, regId, { action }, token);
      toast({ title: action === 'confirm' ? 'Registration confirmed' : 'Added to waitlist' });
      loadRegistrations();
    } catch (err: any) {
      toast({ title: err.message || 'Failed to resolve', variant: 'destructive' });
    }
  };

  const copyToken = () => {
    if (!qrData) return;
    const payload = JSON.stringify({ token: qrData.token });
    navigator.clipboard.writeText(payload);
    setCopied(true);
    toast({ title: 'QR payload copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };

  const conflicts = regs.filter((r) => r.status === 'conflict_pending');

  return (
    <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4 p-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-card-foreground truncate">{event.title}</h3>
            <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${statusBadgeClass(event.status)}`}>
              {event.status}
            </span>
            {conflicts.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                <AlertTriangle className="h-3 w-3" /> {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {new Date(event.start_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            {event.capacity != null && ` · ${event.slots_remaining ?? event.capacity}/${event.capacity} slots`}
          </p>
        </div>

        {/* Quick status controls */}
        <div className="flex items-center gap-2 shrink-0">
          {event.status === 'upcoming' && (
            <Button size="sm" variant="outline" onClick={() => handleStatusChange('active')} disabled={updatingStatus}>
              Activate
            </Button>
          )}
          {event.status === 'active' && (
            <>
              <Button size="sm" variant="outline" onClick={handleGenerateQr} disabled={loadingQr} className="gap-1.5">
                <QrCode className="h-3.5 w-3.5" />
                {loadingQr ? '…' : 'QR Code'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleStatusChange('completed')} disabled={updatingStatus}>
                End
              </Button>
            </>
          )}
          <Button size="icon" variant="ghost" onClick={() => setOpen((o) => !o)}>
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* QR Code display */}
      {qrData && (
        <div className="border-t border-border bg-muted/30 p-5">
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            {/* QR image — project this on screen */}
            <div className="shrink-0 rounded-xl border-4 border-white bg-white p-2 shadow-lg">
              <QRCodeSVG
                value={JSON.stringify({ token: qrData.token })}
                size={180}
                level="M"
              />
            </div>

            {/* Info panel */}
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Check-in QR Code</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Display on the projector. Students open their app → Events →
                  <strong> Scan QR Check-in</strong> and point their camera here.
                  Valid for{' '}
                  <strong>{Math.round(qrData.expires_in_seconds / 3600)} hours</strong>{' '}
                  (scan window). Badges sync later — no expiry on the sync step.
                </p>
              </div>

              {/* Raw payload for copy/paste demo */}
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">QR payload (for manual curl demo)</p>
                <code className="block rounded-lg border border-border bg-background p-2.5 text-xs font-mono break-all text-foreground leading-relaxed">
                  {`{"token":"${qrData.token.slice(0, 48)}…"}`}
                </code>
              </div>

              <Button size="sm" variant="outline" onClick={copyToken} className="gap-2">
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied!' : 'Copy full payload'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Registrations panel */}
      {open && (
        <div className="border-t border-border p-5">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">Registrations ({regs.length})</h4>
            <Button size="sm" variant="ghost" onClick={loadRegistrations} disabled={loadingRegs} className="h-7 gap-1 text-xs">
              <RefreshCw className={`h-3 w-3 ${loadingRegs ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>

          {loadingRegs ? (
            <div className="space-y-2">
              {[1, 2].map((i) => <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />)}
            </div>
          ) : regs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No registrations yet.</p>
          ) : (
            <div className="space-y-2">
              {regs.map((reg) => (
                <div key={reg.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {regStatusIcon(reg.status)}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{reg.student_name}</p>
                      <p className="text-xs text-muted-foreground">{reg.student_email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${
                      reg.status === 'confirmed' ? 'border-green-200 bg-green-50 text-green-700' :
                      reg.status === 'conflict_pending' ? 'border-amber-200 bg-amber-50 text-amber-700' :
                      'border-blue-200 bg-blue-50 text-blue-700'
                    }`}>
                      {reg.status.replace('_', ' ')}
                    </span>
                    {reg.status === 'conflict_pending' && (
                      <>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleResolve(reg.id, 'confirm')}>
                          Confirm
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => handleResolve(reg.id, 'waitlist')}>
                          Waitlist
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function HostDashboard() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEvents = useCallback(async () => {
    if (!token) return;
    try {
      const all = await eventsApi.list(token);
      // Filter to events this host owns
      setMyEvents(all.filter((e) => e.host_id === user?.id));
    } catch (err: any) {
      toast({ title: err.message || 'Failed to load events', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [token, user?.id]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  if (!user || user.role !== 'company') {
    return (
      <div className="py-12">
        <div className="container">
          <p className="text-muted-foreground">Host dashboard is only available to company accounts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12">
      <div className="container max-w-4xl">
        <div className="mb-8 flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Host <span className="text-gradient-blue">Dashboard</span>
            </h1>
            <p className="mt-1 text-muted-foreground">Manage events, generate check-in QRs, and resolve conflicts.</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadEvents} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl border border-border bg-card animate-pulse" />)}
          </div>
        ) : myEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-16 text-center text-muted-foreground">
            No events found for your account.
            <br />
            <span className="text-sm">Events seeded by the backend will appear here once you log in as the host.</span>
          </div>
        ) : (
          <div className="space-y-4">
            {myEvents.map((event) => (
              <EventPanel key={event.id} event={event} token={token!} onRefresh={loadEvents} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
