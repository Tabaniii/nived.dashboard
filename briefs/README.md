# Nived NFC Platform — Multi-Agent Brief Master Index

Role-specific briefs for agents building **filter-rating** (Reputation Shield + Auth Dashboard + Admin).

---

## Ownership (jangan saling nyerobot)

| Role | Folder | Owns | Does NOT own |
|---|---|---|---|
| **Back-End** | [`briefs/back-end/`](./back-end/) | Schema/RLS, `/r/[slug]` server logic, APIs, middleware session/role, seed admin | UI components, visual polish, E2E test authorship |
| **Front-End** | [`briefs/front-end/`](./front-end/) | `/r/[slug]` UI, login portal UI, `/dashboard` UI, `/admin` UI | SQL migrations, RLS, service-role code, secret env |
| **QA** | [`briefs/qa/`](./qa/) | Tests under `tests/`, fixtures, NFR checks, auth/RBAC test matrix | App implementation (FE/BE) |

---

## System map

```
Public NFC          Auth gateway           Protected apps
/r/[slug]    →      /  (login only)   →    /dashboard  (role: client)
API feedback/star                          /admin      (role: admin)
```

- **No public register.** Admin membuat merchant + email/password client + slug NFC.
- Client login → `/dashboard`. Admin login → `/admin`.
- NFC writer fisik = tool eksternal; platform hanya sediakan URL `/r/{slug}` (+ QR dari FE admin).

---

## Brief index

### Back-End
- [`back-end/README.md`](./back-end/README.md) — misi & DoD BE
- [`back-end/brief.md`](./back-end/brief.md) — NFC hot path (existing)
- [`back-end/auth-dashboard-api.md`](./back-end/auth-dashboard-api.md) — kontrak API Auth/Dashboard/Admin

### Front-End
- [`front-end/README.md`](./front-end/README.md) — NFC public UI (existing)
- [`front-end/auth-dashboard-ui.md`](./front-end/auth-dashboard-ui.md) — Login + Client Dashboard + Admin UI

### QA
- [`qa/README.md`](./qa/README.md) — NFC QA plan (existing)
- [`qa/auth-dashboard-qa.md`](./qa/auth-dashboard-qa.md) — Auth/RBAC/Dashboard/Admin test matrix

---

## Shared contracts (ringkas)

**Public NFC**
- `GET /r/[slug]` — rating UI untuk semua kartu aktif
- `POST /api/telemetry/star` — `{ card_id, selected_stars }`
- `POST /api/feedback` — `{ card_id, rating(1-3), feedback_text? }`

**Auth / protected** — lihat [`back-end/auth-dashboard-api.md`](./back-end/auth-dashboard-api.md)

**Stack:** Next.js 16 App Router · React 19 · Tailwind v4 · Supabase (Auth + Postgres + RLS)

---

## Setup cepat (semua agent)

```bash
# Env
cp .env.example .env   # isi Supabase keys + NEXT_PUBLIC_APP_URL
# Staging: NEXT_PUBLIC_APP_URL=https://staging.example.com
# Gunakan URL deployment staging, bukan localhost, agar URL NFC/QR siap dibagikan.

# Migrasi (Supabase CLI / SQL editor)
# 20261008000000_init_schema.sql
# 20261012000000_auth_dashboard_admin.sql

npm run seed:admin     # buat user admin pertama
npm run dev
```

Seed NFC demo slugs: `demo-card` dan `direct-card` (keduanya rating UI).
