# Dashboard / Admin — Back-End surface

UI dimiliki Front-End. **Back-End owns** data + API di bawah ini.

Kontrak penuh: [`../back-end/auth-dashboard-api.md`](../back-end/auth-dashboard-api.md)

## Client dashboard APIs

| Method | Path | Response shape (ringkas) |
|---|---|---|
| GET | `/api/dashboard/overview` | `{ merchant, profile, cards, kpi, daily, weekly, peakHours, feedbacks }` |
| GET | `/api/dashboard/analytics` | `{ daily, weekly, peakHours, kpi }` |
| GET | `/api/dashboard/settings` | `{ cards }` |
| PATCH | `/api/dashboard/settings` | body `{ card_id, google_review_url, whatsapp_number?, store_name? }` |

KPI keys: `tapsToday`, `tapsMonth`, `positiveReviews`, `shieldedComplaints`.

## Admin APIs

| Method | Path |
|---|---|
| GET | `/api/admin/overview` |
| GET/POST | `/api/admin/merchants` |
| PATCH | `/api/admin/merchants/:id/status` |
| GET/POST | `/api/admin/cards` |
| PATCH | `/api/admin/cards/:id/shield` |
| DELETE | `/api/admin/cards/:id` |
| GET | `/api/admin/telemetry` |
| GET | `/api/admin/telemetry/export` |

## Server modules

- Queries: `src/app/(dashboard)/dashboard/queries.js`, `src/app/(admin)/admin/queries.js`
- Actions: `src/app/(dashboard)/dashboard/actions.js`, `src/app/(admin)/admin/actions.js`
- Middleware RBAC: `src/middleware.js`

Front-End brief: [`../front-end/auth-dashboard-ui.md`](../front-end/auth-dashboard-ui.md)
