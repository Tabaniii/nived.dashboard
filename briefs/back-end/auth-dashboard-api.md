# Back-End Contract — Auth, Dashboard, Admin APIs

FE/QA agents should consume these endpoints. Do not call service role from the browser.

## Setup

1. Apply migrations:
   - `supabase/migrations/20261008000000_init_schema.sql`
   - `supabase/migrations/20261012000000_auth_dashboard_admin.sql`
2. Env: see `.env.example` (`NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`)
3. Seed first admin: `npm run seed:admin`

## Auth

| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/login` | `{ email, password }` → `{ role, redirectTo }` + session cookies |
| POST | `/api/auth/logout` | Clears session |
| GET | `/api/auth/me` | Current user + profile + merchant |

Roles: `admin` | `client`. No public register. Admin provisions client email/password.

## Public NFC (related)

| Method | Path | Notes |
|---|---|---|
| POST | `/api/feedback` | `{ card_id, rating(1-3), feedback_text?, customer_whatsapp? }` → 201 |
| POST | `/api/telemetry/star` | `{ card_id, selected_stars(1-5) }` → 200 |

Soft-deleted cards (`deleted_at` set) return 404 from feedback/star and fallback on `/r/[slug]`.

## Client dashboard

| Method | Path | Notes |
|---|---|---|
| GET | `/api/dashboard/overview` | KPI, charts series, feedbacks, cards |
| GET | `/api/dashboard/analytics` | daily / weekly / peakHours |
| GET | `/api/dashboard/settings` | merchant cards |
| PATCH | `/api/dashboard/settings` | `{ card_id, google_review_url, whatsapp_number?, store_name? }` |

Clients cannot toggle shield / create slug (enforced by DB trigger + admin-only APIs).

## Admin

| Method | Path | Notes |
|---|---|---|
| GET | `/api/admin/overview` | taps, merchants, cards, device breakdown |
| GET/POST | `/api/admin/merchants` | POST creates merchant + auth user; returns one-time `credentials` |
| PATCH | `/api/admin/merchants/:id/status` | `{ status: trial\|active\|suspended }` |
| GET/POST | `/api/admin/cards` | POST provisions slug; returns `publicUrl` |
| PATCH | `/api/admin/cards/:id/shield` | `{ is_shield_active }` |
| DELETE | `/api/admin/cards/:id` | soft delete (`deleted_at`) |
| GET | `/api/admin/telemetry?limit=` | taps + feedbacks |
| GET | `/api/admin/telemetry/export?format=json\|csv&dataset=all\|taps\|feedbacks` | sanitized export |

## Middleware

- Unauth `/dashboard`, `/admin` → `/`
- Client → `/admin` or `/api/admin/*` denied
- Admin → `/dashboard` redirected to `/admin`
- Public NFC remains: `/r/*`, `/api/feedback`, `/api/telemetry/*`

## Lib (server)

- `src/lib/supabase/{client,server,admin,middleware}.js`
- `src/lib/auth/session.js`
- `src/lib/slug.js`, `src/lib/password.js`
- Actions: `src/app/(admin)/admin/actions.js`, `src/app/(dashboard)/dashboard/actions.js`
- Queries: `src/app/(admin)/admin/queries.js`, `src/app/(dashboard)/dashboard/queries.js`
