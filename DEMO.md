# Skillzone — Demo Runbook

End-to-end walkthrough of the full demo scenario using the **web frontend**
on a local Wi-Fi network. No curl required for the main flow — every step
has a URL and a click path. Curl snippets are provided as a fallback for
each scene if you prefer to drive from a terminal instead.

---

## Cast of characters

| Person | Role | Email | Password |
|--------|------|-------|----------|
| **TechCorp Africa** | Event host (company) | `host@techcorp.test` | `demo1234` |
| **Amara Osei** | Veteran student | `amara@student.test` | `demo1234` |
| **Baraka Mwangi** | Newcomer student | `baraka@student.test` | `demo1234` |

**Amara** has been on the platform for months: 6 completed events, 6 skill
badges, and is already pre-registered for today's workshop.

**Baraka** just signed up. No history, no pre-registration — they arrive at
the venue and scan the QR like everyone else.

---

## Setup (5 minutes before the demo)

### 1 — Find your laptop's local IP

```bash
ip addr show | grep "inet " | grep -v 127.0.0.1   # Linux / macOS
ipconfig                                            # Windows
```

Note the address — something like `192.168.x.x`.

### 2 — Start the backend

```bash
cd /path/to/skillzone/backend
ADDR=0.0.0.0:8080 JWT_SECRET=hackathon-demo go run ./cmd/server/
```

`0.0.0.0` makes the server reachable from all devices on the same Wi-Fi.

### 3 — Start the frontend

```bash
cd /home/ksilas/Pictures/skillzone-hub
VITE_API_URL=http://<YOUR_LAPTOP_IP>:8080 npm run dev -- --host
```

The app is now at `http://<YOUR_LAPTOP_IP>:5173`.

Open this URL on:
- **Your laptop** — the projector screen (host view)
- **Phone / tablet A** — Amara
- **Phone / tablet B** — Baraka

> **PWA install tip:** On each phone, tap the browser menu → *"Add to Home
> Screen"* to install the app as a PWA before the demo. It will work offline
> even after the network drops.

### 4 — Seed all demo data

```bash
curl -s -X POST http://<YOUR_LAPTOP_IP>:8080/api/admin/seed | jq .
```

This creates the three accounts, 9 skill badges, 8 events (6 past/completed,
1 active workshop, 1 upcoming internship), Amara's full attendance history,
her badges, and her pre-registration for today's workshop.

**Safe to run multiple times** — every INSERT uses `OR IGNORE`.

---

## Demo script

---

### Scene 1 — Show Amara's history ("this is a real user")

**On Amara's phone:**

1. Open `http://<IP>:5173` → **Sign In**
2. Tap the **"Amara (veteran)"** quick-fill button — credentials populate
   automatically
3. Tap **Sign In**
4. You land on `/dashboard`

Point out:
- **Skill Badges** section: 6 badges (Python, Data Science, Open Source,
  Cloud, Mobile Dev, Cybersecurity)
- **Progress bar** already well along — this is an established user
- **Upcoming / Active** registrations: the AI Workshop shows as *confirmed*

<details>
<summary>Curl equivalent</summary>

```bash
BASE=http://localhost:8080
AMARA_TOKEN=$(curl -s -X POST $BASE/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"amara@student.test","password":"demo1234"}' | jq -r .token)

curl -s $BASE/api/users/me/skills \
  -H "Authorization: Bearer $AMARA_TOKEN" | jq '[.[] | .skill.name]'

curl -s $BASE/api/users/me/registrations \
  -H "Authorization: Bearer $AMARA_TOKEN" | \
  jq '[.[] | {title: .event_title, status: .status}]'
```

</details>

---

### Scene 2 — Workshop is live: host activates it

**On the laptop (projector screen):**

1. Open `http://<IP>:5173` → **Sign In**
2. Tap **"Host (TechCorp)"** quick-fill → **Sign In**
3. Header shows a **"Host Dashboard"** link → click it → `/host`
4. Find the **"Building Apps with AI Workshop"** card (status: *upcoming*)
5. Click **Activate** — the status badge flips to *active* (green)

<details>
<summary>Curl equivalent</summary>

```bash
COMPANY_TOKEN=$(curl -s -X POST $BASE/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"host@techcorp.test","password":"demo1234"}' | jq -r .token)

WORKSHOP_ID=seed-event-aiwork-0000-0000-0000-000000000030

curl -s -X PATCH $BASE/api/events/$WORKSHOP_ID/status \
  -H "Authorization: Bearer $COMPANY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"active"}' | jq .
```

</details>

---

### Scene 3 — Host generates the check-in QR

**Still on the laptop (Host Dashboard):**

1. The workshop card now shows a **QR Code** button (only appears for
   active events)
2. Click **QR Code** — a scannable QR image appears below the card
3. The QR encodes `{"token":"<signed-JWT>"}` — valid for **6 hours**
4. Expand the browser window so the QR is large on the projector screen

The instruction text below the QR reads:
> *Display on the projector. Students open their app → Events → Scan QR
> Check-in and point their camera here.*

You can also click **Copy full payload** to copy the JSON string for the
paste-mode fallback or curl demo.

<details>
<summary>Curl equivalent</summary>

```bash
CHECKIN_TOKEN=$(curl -s $BASE/api/events/$WORKSHOP_ID/checkin-code \
  -H "Authorization: Bearer $COMPANY_TOKEN" | jq -r .token)

echo "{\"token\":\"$CHECKIN_TOKEN\"}"   # this is what the QR encodes
```

</details>

---

### Scene 4 — Network drops

> *"The venue is packed. The cell tower is overwhelmed — the network is
> effectively down. But our app keeps working."*

**Simulate offline on each phone:**

- Chrome for Android: enable **Offline** in DevTools (via `chrome://inspect`)
- Or: simply turn off Wi-Fi on the phone — the PWA is already cached

On the laptop in Chrome DevTools:
**Network tab → throttling dropdown → Offline**

The app still loads from the service worker cache. The Online/Offline
indicator in the Events and Check-In pages changes to **Offline**.

---

### Scene 5 — Amara and Baraka scan the QR (offline)

**On Amara's phone (still signed in):**

1. Navigate to **Events** → find **"Building Apps with AI Workshop"**
   (status: *active*)
2. Tap **Scan QR Check-in** — opens `/checkin/<workshopId>`
3. The page opens in **Camera** mode by default
4. Point the camera at the QR code on the projector screen
5. The app decodes the QR automatically — no button press needed
6. Toast: **"Checked in ✓ — badges will appear when you reconnect."**

**On Baraka's phone:**

1. **Sign In** → tap **"Baraka (newcomer)"** quick-fill → **Sign In**
2. **Events → Scan QR Check-in** on the workshop
3. Point camera at QR → auto-decoded → same success toast

> **Key point:** Baraka was NOT pre-registered. The scan still works
> offline. When the sync fires, the server auto-registers and checks them
> in as a single operation.

**What happens internally:**
- `jsqr` decodes the QR from the live camera feed
- JWT structure is validated locally (no server call)
- `{ local_id, event_id, payload }` stored in IndexedDB
  (`skillzone-idb` → `attendance_pending`)
- Background Sync tag `sync-attendance` queued — fires on reconnect

**No-camera fallback (paste mode):**
Tap the **Paste** toggle in the check-in card header, paste the JSON
payload from the host's **Copy full payload** button, tap
**Save Check-In (offline)**.

---

### Scene 6 — Both apply for the internship while offline

While still offline on both phones:

**On Amara's phone:**

1. **Events** → scroll to **"AI Product Internship"** (status: *upcoming*)
2. Tap **📥 Apply (offline)** — button immediately shows
   **"⏳ Queued offline"**
3. Toast: *"Registration for 'AI Product Internship' will sync when you
   reconnect."*

**On Baraka's phone — same steps.** Only **1 slot** remains.

Both registrations sit in IndexedDB (`registration_pending`).

<details>
<summary>Curl equivalent</summary>

```bash
BARAKA_TOKEN=$(curl -s -X POST $BASE/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"baraka@student.test","password":"demo1234"}' | jq -r .token)

INTERN_ID=seed-event-intern-0000-0000-0000-000000000031

# (actual POST happens in Scene 7)
```

</details>

---

### Scene 7 — Network returns, sync fires automatically

Re-enable Wi-Fi / untick **Offline** in DevTools on both phones.

Within a few seconds Background Sync fires automatically:

1. SW reads `attendance_pending` → `POST /api/sync/attendance` — workshop
   check-ins for both students
2. SW reads `registration_pending` → `POST /api/events/:id/register` — both
   internship applications

**On the Dashboard** (navigate there or wait for auto-refresh):
- Pending banner disappears
- Amara's internship: **confirmed ✓** (first applicant, got the last slot)
- Baraka's internship: **conflict pending** (slot exhausted)

> *"The check-in tokens were signed while the QR was live. The server
> verifies the **signature**, not the expiry — sync can happen hours later
> and attendance still counts."*

If Background Sync doesn't fire automatically, tap **Sync now** on the
Dashboard — it sends a `TRIGGER_SYNC` message to the service worker which
drains the IDB queue immediately.

<details>
<summary>Curl equivalent</summary>

```bash
# Amara syncs workshop check-in
curl -s -X POST $BASE/api/sync/attendance \
  -H "Authorization: Bearer $AMARA_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"records\":[{
    \"local_id\":\"amara-local-001\",
    \"event_id\":\"$WORKSHOP_ID\",
    \"payload\":\"{\\\"token\\\":\\\"$CHECKIN_TOKEN\\\"}\"
  }]}" | jq .

# Amara registers for internship (gets the last slot)
curl -s -X POST $BASE/api/events/$INTERN_ID/register \
  -H "Authorization: Bearer $AMARA_TOKEN" | jq '{id, status}'

# Baraka syncs workshop check-in
curl -s -X POST $BASE/api/sync/attendance \
  -H "Authorization: Bearer $BARAKA_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"records\":[{
    \"local_id\":\"baraka-local-001\",
    \"event_id\":\"$WORKSHOP_ID\",
    \"payload\":\"{\\\"token\\\":\\\"$CHECKIN_TOKEN\\\"}\"
  }]}" | jq .

# Baraka registers (slot gone → conflict_pending)
curl -s -X POST $BASE/api/events/$INTERN_ID/register \
  -H "Authorization: Bearer $BARAKA_TOKEN" | jq '{id, status}'
```

**Expected statuses:**
- Amara → `confirmed`
- Baraka → `conflict_pending`

</details>

---

### Scene 8 — Badges awarded automatically

**On Amara's Dashboard** (refresh or wait for sync-complete auto-reload):
- **8 badges** (was 6) — new: **AI Application Development** and
  **Prompt Engineering**, awarded for attending the workshop

**On Baraka's Dashboard:**
- **2 badges** — first ever: AI Application Development + Prompt Engineering

<details>
<summary>Curl equivalent</summary>

```bash
curl -s $BASE/api/users/me/skills \
  -H "Authorization: Bearer $AMARA_TOKEN" | jq '[.[] | .skill.name]'

curl -s $BASE/api/users/me/skills \
  -H "Authorization: Bearer $BARAKA_TOKEN" | jq '[.[] | .skill.name]'
```

</details>

---

### Scene 9 — Host sees the conflict on the dashboard

**On the laptop (Host Dashboard) → `/host`:**

1. Click the **chevron ▼** on the **"AI Product Internship"** card
2. Two rows appear in the registrations panel:
   - **Amara Osei** — green *confirmed* badge + ✓ icon
   - **Baraka Mwangi** — amber *conflict pending* badge + ⚠ icon
3. The card header shows an amber **"1 conflict"** pill

<details>
<summary>Curl equivalent</summary>

```bash
curl -s $BASE/api/events/$INTERN_ID/registrations \
  -H "Authorization: Bearer $COMPANY_TOKEN" | \
  jq '[.[] | {name: .student_name, status}]'
```

</details>

---

### Scene 10 — Host resolves the conflict

**Host Dashboard, internship registrations panel:**

1. Next to **Baraka Mwangi** are two buttons: **Confirm** and **Waitlist**
2. Click **Confirm** — Baraka's badge turns green *confirmed*; the amber
   "1 conflict" pill disappears from the card header
3. (Alternatively: click **Waitlist** to put Baraka on the waitlist)

**On Baraka's Dashboard** (refresh):
- Internship status updates to **confirmed ✓** (or *waitlisted*)

<details>
<summary>Curl equivalent</summary>

```bash
BARAKA_REG_ID=$(curl -s $BASE/api/events/$INTERN_ID/registrations \
  -H "Authorization: Bearer $COMPANY_TOKEN" | \
  jq -r '.[] | select(.student_name=="Baraka Mwangi") | .id')

curl -s -X PATCH $BASE/api/events/$INTERN_ID/registrations/$BARAKA_REG_ID \
  -H "Authorization: Bearer $COMPANY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"confirm"}' | jq .
```

</details>

---

### Scene 11 — End the workshop (EOD)

**Host Dashboard → AI Workshop card:**

1. Click **End** — status badge flips to *completed* (grey)
2. The **QR Code** and **End** buttons disappear; card becomes read-only

<details>
<summary>Curl equivalent</summary>

```bash
curl -s -X PATCH $BASE/api/events/$WORKSHOP_ID/status \
  -H "Authorization: Bearer $COMPANY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"completed"}' | jq .
```

</details>

---

## DevTools: showing the PWA in action

| What to show | Where in Chrome DevTools |
|---|---|
| App loaded from SW cache | **Application → Service Workers** — tick **Offline**, reload |
| Pending IDB records | **Application → Storage → IndexedDB → skillzone-idb** |
| Background Sync firing | **Application → Background Services → Background Sync** |
| Slow network resilience | **Network → Slow 3G** preset — app still responds |

---

## Failure scenarios

| Scenario | How to trigger | Expected result |
|---|---|---|
| Wrong QR token | Use a token signed with a different JWT secret | `rejected: invalid check-in token` |
| Tampered token | Edit any character in the JWT string | `rejected: invalid check-in token` |
| Token from wrong event | Use workshop token with internship `event_id` | `rejected: token event_id does not match` |
| Missing token in payload | Paste `{}` in paste mode | `rejected: payload missing token` |
| Late sync (token "expired") | Scan QR, wait, sync hours later | `verified` — sync window is unlimited |
| Double-sync retry | Sync same `local_id` twice | Second call returns `verified` — idempotent |
| Two offline applicants, 1 slot | Run Scenes 6 + 7 | First → confirmed, second → conflict_pending |
| Host waitlists applicant | Click **Waitlist** (or `"action":"waitlist"`) | Status → `waitlisted` |
| Server down during sync | Stop server, scan QR, restart, tap **Sync now** | Sync succeeds on reconnect |

---

## Troubleshooting

**Other devices can't connect**
```bash
sudo ufw allow 8080 && sudo ufw allow 5173
```

**Port already in use**
```bash
lsof -i :8080
ADDR=0.0.0.0:9090 ./skillzone
```

**Camera permission denied on phone**
Switch to **Paste** mode in the check-in card header, then paste the JSON
payload copied from the host's **Copy full payload** button.

**Background Sync not firing**
Tap the **Sync now** button on the Dashboard — this sends a `TRIGGER_SYNC`
message to the service worker which processes the IDB queue immediately.

**Re-seed without restarting**
```bash
curl -s -X POST http://localhost:8080/api/admin/seed | jq .seeded
```