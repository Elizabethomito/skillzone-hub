/**
 * CheckIn page — /checkin/:eventId
 *
 * Two input modes:
 *  1. Camera scanner  — uses jsqr to decode frames from the device camera.
 *     The QR encodes JSON:  {"token":"<jwt>"}
 *  2. Paste fallback  — accepts the raw JSON string or bare JWT for the
 *     curl / desktop demo workflow.
 *
 * When offline: stores the record in IndexedDB + queues Background Sync.
 * When online:  calls POST /api/sync/attendance immediately.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
import { useAuth } from '@/context/AuthContext';
import { queueAttendance } from '@/db/attendance';
import { sync as syncApi } from '@/lib/api';
import { requestSync } from '@/lib/sw';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { QrCode, Wifi, WifiOff, ArrowLeft, Camera, CameraOff, KeyRound } from 'lucide-react';

type Mode = 'camera' | 'paste';

/** Parses the raw QR text. Accepts JSON envelope or bare JWT. */
function parseToken(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  try {
    const obj = JSON.parse(s);
    if (typeof obj.token === 'string') return obj.token;
  } catch { /* not JSON */ }
  // Bare JWT: three base64url segments
  if (/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(s)) return s;
  return null;
}

export default function CheckIn() {
  const { eventId } = useParams<{ eventId: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [mode, setMode] = useState<Mode>('camera');
  const [rawInput, setRawInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [doneMessage, setDoneMessage] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const scanningRef = useRef(false);

  // Track online/offline
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // ── Camera lifecycle ────────────────────────────────────────────────────────

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const handleCheckin = useCallback(async (checkinToken: string) => {
    if (!eventId || !token || loading) return;
    stopCamera();

    const record = {
      local_id: crypto.randomUUID(),
      event_id: eventId,
      payload: JSON.stringify({ token: checkinToken }),
    };

    setLoading(true);
    try {
      if (isOnline) {
        const res = await syncApi.attendance({ records: [record] }, token);
        const result = res.results[0];
        if (result.status === 'verified') {
          setDoneMessage('Checked in ✓ — badges will appear on your dashboard.');
        } else {
          setDoneMessage(`Check-in ${result.status}: ${result.message ?? ''}`);
        }
      } else {
        await queueAttendance(record);
        await requestSync();
        setDoneMessage('Checked in ✓ — badges will appear when you reconnect.');
      }
      setDone(true);
    } catch (err: any) {
      toast({ title: err.message || 'Check-in failed', variant: 'destructive' });
      // Re-open camera so they can retry
      if (mode === 'camera') startCamera();
    } finally {
      setLoading(false);
    }
  }, [eventId, token, isOnline, loading, mode]);

  const tick = useCallback(() => {
    if (!scanningRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });
    if (code?.data) {
      const t = parseToken(code.data);
      if (t) { handleCheckin(t); return; }
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [handleCheckin]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      scanningRef.current = true;
      rafRef.current = requestAnimationFrame(tick);
    } catch (err: any) {
      setCameraError(err?.message ?? 'Camera not available');
    }
  }, [tick]);

  // Start camera when in camera mode and not done
  useEffect(() => {
    if (mode === 'camera' && !done) {
      startCamera();
    } else {
      stopCamera();
    }
    return stopCamera;
  }, [mode, done]);

  // ── Paste submit ────────────────────────────────────────────────────────────

  const handlePasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = parseToken(rawInput);
    if (!t) {
      toast({ title: 'Invalid QR data', description: 'Paste the JSON payload or raw JWT.', variant: 'destructive' });
      return;
    }
    await handleCheckin(t);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-[80vh] items-center justify-center py-12">
      <div className="w-full max-w-md animate-scale-in">
        <button
          onClick={() => navigate('/events')}
          className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Events
        </button>

        <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-border p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <QrCode className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-card-foreground">Event Check-In</h1>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {isOnline
                    ? <><Wifi className="h-3 w-3 text-green-500" /> Online — syncs now</>
                    : <><WifiOff className="h-3 w-3 text-amber-500" /> Offline — syncs later</>}
                </div>
              </div>
            </div>

            {/* Mode toggle */}
            {!done && (
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => setMode('camera')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${mode === 'camera' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'}`}
                >
                  <Camera className="h-3.5 w-3.5" /> Camera
                </button>
                <button
                  onClick={() => setMode('paste')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${mode === 'paste' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'}`}
                >
                  <KeyRound className="h-3.5 w-3.5" /> Paste
                </button>
              </div>
            )}
          </div>

          <div className="p-5">
            {done ? (
              /* ── Success state ── */
              <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
                <div className="mb-3 text-4xl">✓</div>
                <p className="font-semibold text-green-700">{doneMessage}</p>
                <Button variant="outline" className="mt-6" onClick={() => navigate('/dashboard')}>
                  Go to Dashboard
                </Button>
              </div>
            ) : mode === 'camera' ? (
              /* ── Camera mode ── */
              <div className="space-y-3">
                {cameraError ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-center space-y-3">
                    <CameraOff className="mx-auto h-8 w-8 text-amber-500" />
                    <p className="text-sm font-medium text-amber-700">{cameraError}</p>
                    <p className="text-xs text-amber-600">
                      Allow camera permission, or switch to <strong>Paste</strong> mode to enter the token manually.
                    </p>
                    <Button size="sm" variant="outline" onClick={startCamera}>Retry Camera</Button>
                  </div>
                ) : (
                  <>
                    <div className="relative overflow-hidden rounded-xl bg-black aspect-square">
                      <video
                        ref={videoRef}
                        className="h-full w-full object-cover"
                        playsInline
                        muted
                      />
                      {/* Scan guide overlay */}
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="h-48 w-48 rounded-2xl border-4 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
                      </div>
                      {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                          <div className="text-white text-sm font-medium animate-pulse">Checking in…</div>
                        </div>
                      )}
                    </div>
                    {/* Hidden canvas used for jsQR */}
                    <canvas ref={canvasRef} className="hidden" />
                    <p className="text-center text-xs text-muted-foreground">
                      Point your camera at the QR code on the projector screen.
                    </p>
                  </>
                )}
              </div>
            ) : (
              /* ── Paste mode ── */
              <form onSubmit={handlePasteSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="qr-input">QR code content</Label>
                  <Textarea
                    id="qr-input"
                    value={rawInput}
                    onChange={(e) => setRawInput(e.target.value)}
                    placeholder={'Paste the QR text, e.g.\n{"token":"eyJhbGci..."}\n\nor the raw JWT string'}
                    className="mt-1.5 h-32 font-mono text-sm"
                    required
                  />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Copy the QR payload from the host's screen and paste it here.
                    The app saves it locally and syncs automatically.
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
    </div>
  );
}
