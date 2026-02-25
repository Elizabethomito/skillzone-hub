/**
 * Service Worker helpers.
 * The SW itself is registered in index.html on the 'load' event.
 * This module provides:
 *  - sendTokenToSW()  — push JWT into SW so it can auth background sync requests
 *  - requestSync()    — trigger Background Sync tags (or fallback manual trigger)
 *  - onSyncMessage()  — subscribe to SYNC_COMPLETE messages from the SW
 */

const SYNC_ATTENDANCE = 'sync-attendance';
const SYNC_REGISTRATIONS = 'sync-registrations';

// Respond to the SW asking for the JWT token (GET_TOKEN message)
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'GET_TOKEN') {
      const token = localStorage.getItem('skillzone_jwt');
      event.ports[0]?.postMessage({ token });
    }
  });
}

/** Push the JWT into the SW cache so it can attach it to sync requests. */
export function sendTokenToSW(token: string | null): void {
  navigator.serviceWorker?.controller?.postMessage({ type: 'SET_TOKEN', token });
}

/** Request background sync tags. Falls back to an immediate trigger message. */
export async function requestSync(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  const reg = await navigator.serviceWorker.ready;

  if ('sync' in reg) {
    try {
      await (reg as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } }).sync.register(SYNC_ATTENDANCE);
      await (reg as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } }).sync.register(SYNC_REGISTRATIONS);
      return;
    } catch {
      // Background Sync not permitted — fall through to manual trigger
    }
  }

  // Fallback: tell the SW to run sync immediately
  reg.active?.postMessage({ type: 'TRIGGER_SYNC' });
}

/** Listen for sync-complete messages from the SW. Returns an unsubscribe fn. */
export function onSyncMessage(
  handler: (data: { type: string; tag?: string; results?: unknown[] }) => void,
): () => void {
  const listener = (event: MessageEvent) => {
    if (event.data?.type === 'SYNC_COMPLETE') handler(event.data);
  };
  navigator.serviceWorker?.addEventListener('message', listener);
  return () => navigator.serviceWorker?.removeEventListener('message', listener);
}
