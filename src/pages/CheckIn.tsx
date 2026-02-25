/**
 * CheckIn page — /checkin/:eventId
 *
 * Lets a student paste/enter the check-in token from the host's QR code.
 * When offline: stores the record in IndexedDB and queues a Background Sync.
 * When online:  syncs immediately.
 *
 * The QR code displayed by the host encodes JSON:  {"token":"<jwt>"}
 * A real PWA would use the device camera to decode it; here we accept a
 * text paste as well so the demo works without a camera library dependency.
 */

import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { queueAttendance } from '@/db/attendance';
import { sync as syncApi } from '@/lib/api';
import { requestSync } from '@/lib/sw';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { QrCode, Wifi, WifiOff, ArrowLeft } from 'lucide-react';

export default function CheckIn() {
  const { eventId } = useParams<{ eventId: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [rawInput, setRawInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [doneMessage, setDoneMessage] = useState('');
  const isOnline = navigator.onLine;

  /** Parse the raw input from the QR code text area.
   *  Accepts either the raw JWT string or a JSON object {"token":"..."} */
  function parseToken(raw: string): string | null {
    const s = raw.trim();
    if (!s) return null;
    // Try JSON envelope
    try {
      const obj = JSON.parse(s);
      if (typeof obj.token === 'string') return obj.token;
    } catch {
      // not JSON — treat as raw JWT
    }
    // Must look like a JWT (three base64url segments)
    if (/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(s)) return s;
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId || !token) return;

    const checkinToken = parseToken(rawInput);
    if (!checkinToken) {
      toast({ title: 'Invalid QR data', description: 'Paste the full QR text or JWT token.', variant: 'destructive' });
      return;
    }

    const record = {
      local_id: crypto.randomUUID(),
      event_id: eventId,
      payload: JSON.stringify({ token: checkinToken }),
    };

    setLoading(true);
    try {
      if (isOnline) {
        // Sync immediately
        const res = await syncApi.attendance({ records: [record] }, token);
        const result = res.results[0];
        if (result.status === 'verified') {
          setDoneMessage('Checked in ✓ — badges will appear on your dashboard.');
        } else {
          setDoneMessage(`Check-in ${result.status}: ${result.message ?? ''}`);
        }
      } else {
        // Queue for background sync
        await queueAttendance(record);
        await requestSync();
        setDoneMessage('Checked in ✓ — badges will appear when you reconnect.');
      }
      setDone(true);
    } catch (err: any) {
      toast({ title: err.message || 'Check-in failed', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center py-12">
      <div className="w-full max-w-md animate-scale-in">
        <button
          onClick={() => navigate('/events')}
          className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Events
        </button>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <QrCode className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-card-foreground">Event Check-In</h1>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                {isOnline
                  ? <><Wifi className="h-3 w-3 text-green-500" /> Online — will sync now</>
                  : <><WifiOff className="h-3 w-3 text-amber-500" /> Offline — will sync later</>}
              </div>
            </div>
          </div>

          {done ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
              <div className="mb-3 text-4xl">✓</div>
              <p className="font-semibold text-green-700">{doneMessage}</p>
              <Button
                variant="outline"
                className="mt-6"
                onClick={() => navigate('/dashboard')}
              >
                Go to Dashboard
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="qr-input">QR Code content</Label>
                <Textarea
                  id="qr-input"
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  placeholder={`Paste the QR text here, e.g.\n{"token":"eyJhbGci..."}\n\nor the raw JWT string`}
                  className="mt-1.5 h-36 font-mono text-sm"
                  required
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Scan the QR code shown by the host and paste its contents here.
                  The app stores it locally and syncs your attendance automatically.
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={loading || !rawInput.trim()}>
                {loading ? 'Checking in…' : isOnline ? 'Check In Now' : 'Save Check-In (offline)'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
