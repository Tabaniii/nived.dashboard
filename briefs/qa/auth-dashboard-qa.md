# QA Brief — Auth, RBAC, Dashboard, Admin

**Role:** QA Agent  
**Scope:** tests under `tests/`, fixtures, evidence  
**Do not modify:** app FE/BE implementation while executing this plan (file bugs / failing tests instead)

Depends on BE contract: [`../back-end/auth-dashboard-api.md`](../back-end/auth-dashboard-api.md)  
Depends on FE checklist: [`../front-end/auth-dashboard-ui.md`](../front-end/auth-dashboard-ui.md)

NFC public QA remains in [`README.md`](./README.md).

---

## 1. Preconditions

- Migrations applied (init + `20261012000000_auth_dashboard_admin.sql`)
- `npm run seed:admin` → known admin email/password
- At least one provisioned client (via `POST /api/admin/merchants`) with card slug
- Base URL `http://localhost:3000`
- Never hit production credentials

---

## 2. Auth & middleware matrix

| ID | Scenario | Expect |
|---|---|---|
| AUTH-01 | `POST /api/auth/login` valid admin | 200, `role=admin`, `redirectTo=/admin`, session cookie set |
| AUTH-02 | `POST /api/auth/login` valid client | 200, `redirectTo=/dashboard` |
| AUTH-03 | Wrong password | 401 |
| AUTH-04 | Client with `merchants.status=suspended` | 403, no session |
| AUTH-05 | Unauth `GET /dashboard` | redirect `/` |
| AUTH-06 | Unauth `GET /admin` | redirect `/` |
| AUTH-07 | Client session `GET /admin` | redirect `/dashboard` |
| AUTH-08 | Admin session `GET /dashboard` | redirect `/admin` |
| AUTH-09 | Unauth `GET /api/admin/overview` | 401 JSON |
| AUTH-10 | Client `GET /api/admin/overview` | 403 JSON |
| AUTH-11 | `POST /api/auth/logout` then `/api/auth/me` | 401 |

No public register endpoint must exist (`/api/auth/register` → 404).

---

## 3. Admin provisioning

| ID | Scenario | Expect |
|---|---|---|
| ADM-01 | `POST /api/admin/merchants` | 201, merchant row + `credentials.email/password` |
| ADM-02 | New client can login with those credentials | AUTH-02 |
| ADM-03 | `POST /api/admin/cards` | 201, unique `slug`, `publicUrl` ends with `/r/{slug}` |
| ADM-04 | `PATCH .../shield` false | card `is_shield_active=false`; `GET /r/{slug}` → 307 |
| ADM-05 | `PATCH .../shield` true | shield UI path (non-307 HTML/RSC) |
| ADM-06 | `PATCH .../status` suspended | client login blocked |
| ADM-07 | `DELETE /api/admin/cards/:id` | soft delete; `/r/{slug}` fallback |
| ADM-08 | Export JSON/CSV | 200, no service keys, IP only as `ip_hash` |

---

## 4. Client dashboard data

| ID | Scenario | Expect |
|---|---|---|
| CL-01 | `GET /api/dashboard/overview` as client | 200, KPI + series + own feedbacks only |
| CL-02 | Client A cannot see Client B taps/feedback | empty / not present (RLS) |
| CL-03 | `PATCH /api/dashboard/settings` updates Google URL + WA | 200; reflected on next GET |
| CL-04 | Client cannot change `is_shield_active` via API/UI | rejected or field ignored; DB trigger enforces |
| CL-05 | Analytics endpoint matches overview series shape | `daily`, `weekly`, `peakHours` arrays |

---

## 5. FE smoke (manual / Playwright later)

- Login dark portal usable at 360px and desktop
- Dashboard charts render without console errors
- Admin “Salin kredensial” + “Copy URL” + QR download works
- Live audit feed updates after a tap on `/r/{slug}` (if Realtime enabled)

---

## 6. Regression with NFC suite

After auth work, re-run NFC cases from [`README.md`](./README.md):

- Direct 307 `direct-card`
- Shield rating paths on `demo-card`
- Debounce <5s
- Feedback validation 400 on rating >3

---

## 7. Evidence

Store failing request/response status + truncated JSON (no passwords, no service role keys) under your QA notes. Prefer automated Vitest/integration tests under `tests/integration/` named `auth-*.test.js` / `admin-*.test.js` when adding coverage.
