# Front-End Brief — Auth Portal, Client Dashboard, Admin Panel

**Role:** Front-End AI Agent  
**Depends on:** [`../back-end/auth-dashboard-api.md`](../back-end/auth-dashboard-api.md)  
**Out of scope:** SQL, RLS, service role, middleware auth logic, writing QA tests

---

## 1. Mission

Replace Next.js boilerplate at `/` with a **login-only** portal, then build polished UI for:

- `/dashboard` — merchant (role `client`)
- `/admin` — Nived internal (role `admin`)

There is **no Register**. Credentials are created by Admin and handed to clients.

Dark aesthetic preferred for auth + protected shells. Keep `/r/[slug]` public UI separate (see [`README.md`](./README.md)).

---

## 2. Routes to own (UI)

```
src/app/
  (auth)/                 # GET /  → Login UI
  (dashboard)/dashboard/  # client shell + pages
  (admin)/admin/          # admin shell + pages
```

Scaffold/placeholder pages may already exist from BE scaffolding — **you own visual quality, UX, a11y, and responsive layout**. Prefer calling JSON APIs below instead of inventing new data access.

---

## 3. Data access (FE → BE)

Use `fetch` / SWR against cookie session (same-origin).

### Auth
- `POST /api/auth/login` `{ email, password }` → `{ redirectTo }` then `router.push`
- `POST /api/auth/logout`
- `GET /api/auth/me` — boot shell / guard UI

### Client dashboard
- `GET /api/dashboard/overview` — KPI, daily/weekly/peakHours, feedbacks, cards
- `GET /api/dashboard/analytics` — chart refresh
- `GET|PATCH /api/dashboard/settings` — Google URL + WhatsApp (not shield toggle)

### Admin
- `GET /api/admin/overview`
- `GET|POST /api/admin/merchants` — POST returns **one-time** `{ credentials: { email, password } }` → show “Salin kredensial”
- `PATCH /api/admin/merchants/:id/status` — `trial|active|suspended`
- `GET|POST /api/admin/cards` — POST returns `{ publicUrl, card }` → Copy URL + QR (generate QR client-side from `publicUrl`)
- `PATCH /api/admin/cards/:id/shield` — Shield ↔ Direct
- `DELETE /api/admin/cards/:id` — soft delete
- `GET /api/admin/telemetry`
- `GET /api/admin/telemetry/export?format=json|csv&dataset=...`
- Live feed: Supabase Realtime on `tap_logs` (anon/authenticated policy already set server-side)

---

## 4. UI requirements checklist

### Login `/`
- [ ] Dark, clean, brand “Nived”
- [ ] Email + password only (no register link)
- [ ] Error states (wrong password, suspended)
- [ ] After login, navigate to `redirectTo` from API

### Client `/dashboard`
- [ ] KPI: taps today / month, positive 4–5★, shielded 1–3★
- [ ] Charts: daily, weekly, peak hours
- [ ] Feedback table: time, stars, text, customer WA
- [ ] Settings: edit Google Review URL + manager WhatsApp
- [ ] Empty states when no cards yet

### Admin `/admin`
- [ ] Global stats + device breakdown chart
- [ ] Add merchant + show copyable credentials once
- [ ] Provision card slug, copy NFC URL, downloadable QR
- [ ] Per-card Shield/Direct toggle
- [ ] Merchant status select
- [ ] Telemetry table + Export CSV/JSON buttons
- [ ] Live audit ticker

### A11y / responsive
- [ ] Keyboard focus, `aria` on forms/tables
- [ ] Usable from ~360px mobile up to desktop admin

---

## 5. Hard rules

- Do **not** import `@/lib/supabase/admin` or use service role in client bundles.
- Do **not** allow clients to toggle shield / create slugs in UI (hide controls; BE rejects anyway).
- Do **not** change NFC public rating behavior contracts without coordinating with BE.
- NFC chip encoding stays outside this app — only display URL/QR for external writers.
