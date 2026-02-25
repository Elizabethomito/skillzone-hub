const CACHE_NAME = 'skillzone-v2';
const PRECACHE_URLS = ['/', '/index.html'];
const SYNC_ATTENDANCE = 'sync-attendance';
const SYNC_REGISTRATIONS = 'sync-registrations';

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      ),
  );
  self.clients.claim();
});

// ─── Fetch — network-first, cache fallback ────────────────────────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // Don't cache API calls
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});

// ─── Background Sync ──────────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_ATTENDANCE) {
    event.waitUntil(syncAttendance());
  }
  if (event.tag === SYNC_REGISTRATIONS) {
    event.waitUntil(syncRegistrations());
  }
});

// ─── IndexedDB helpers (duplicated here — sw has no module imports) ───────────
const DB_NAME = 'skillzone-idb';
const DB_VERSION = 1;

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('attendance_pending'))
        db.createObjectStore('attendance_pending', { keyPath: 'local_id' });
      if (!db.objectStoreNames.contains('registration_pending'))
        db.createObjectStore('registration_pending', { keyPath: 'local_id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAllFromStore(storeName) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function deleteFromStore(storeName, key) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Sync logic ───────────────────────────────────────────────────────────────
async function getApiBase() {
  // Broadcast to clients to get the API base URL stored by the main app
  const clients = await self.clients.matchAll();
  // Fallback: read from sw registration scope or just use empty (same-origin)
  return '';
}

async function syncAttendance() {
  const token = await getStoredToken();
  if (!token) return;

  const records = await getAllFromStore('attendance_pending');
  if (!records.length) return;

  const base = await getApiBase();
  try {
    const res = await fetch(`${base}/api/sync/attendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ records }),
    });

    if (!res.ok) return;

    const { results } = await res.json();
    for (const result of results) {
      // Remove records that were accepted (verified or already existed)
      if (result.status === 'verified') {
        await deleteFromStore('attendance_pending', result.local_id);
      }
    }

    notifyClients({ type: 'SYNC_COMPLETE', tag: 'attendance', results });
  } catch {
    // Network still down — will retry on next sync event
  }
}

async function syncRegistrations() {
  const token = await getStoredToken();
  if (!token) return;

  const pending = await getAllFromStore('registration_pending');
  if (!pending.length) return;

  const base = await getApiBase();
  for (const reg of pending) {
    try {
      const res = await fetch(`${base}/api/events/${reg.event_id}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok || res.status === 409) {
        // 409 = already registered — treat as done
        await deleteFromStore('registration_pending', reg.local_id);
        const body = res.ok ? await res.json() : null;
        notifyClients({ type: 'SYNC_COMPLETE', tag: 'registration', eventId: reg.event_id, result: body });
      }
    } catch {
      // Will retry on next sync
    }
  }
}

// ─── Read JWT from localStorage (via client message) ─────────────────────────
let _cachedToken = null;

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SET_TOKEN') {
    _cachedToken = event.data.token;
  }
  if (event.data?.type === 'TRIGGER_SYNC') {
    syncAttendance();
    syncRegistrations();
  }
});

async function getStoredToken() {
  if (_cachedToken) return _cachedToken;
  // Ask first available client
  const clients = await self.clients.matchAll({ type: 'window' });
  if (!clients.length) return null;
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = (e) => resolve(e.data?.token ?? null);
    clients[0].postMessage({ type: 'GET_TOKEN' }, [channel.port2]);
    setTimeout(() => resolve(null), 1000);
  });
}

function notifyClients(payload) {
  self.clients.matchAll({ type: 'window' }).then((clients) => {
    clients.forEach((c) => c.postMessage(payload));
  });
}
