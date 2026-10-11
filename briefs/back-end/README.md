# Back-End Agent — Nived NFC Platform

**Role:** Back-End only  
**Owns:** Database, RLS, server route logic, REST/JSON APIs, middleware authz, seed scripts  
**Does not own:** Visual UI, chart styling, E2E/QA suites

---

## Mission

1. Keep `/r/[slug]` hot path fast (TTFB target `<300ms`): slug lookup, Direct Mode **HTTP 307**, async debounced tap logs.
2. Expose stable JSON APIs for Auth, Client Dashboard, and Admin provisioning.
3. Enforce multi-tenant security via Supabase RLS + Next.js middleware (role `admin` | `client`).

---

## Documents

| Doc | Isi |
|---|---|
| [`brief.md`](./brief.md) | NFC public route, telemetry, feedback APIs, debounce |
| [`auth-dashboard-api.md`](./auth-dashboard-api.md) | Login-only auth, dashboard & admin API contract |

---

## Key files

```
supabase/migrations/
  20261008000000_init_schema.sql
  20261012000000_auth_dashboard_admin.sql
src/middleware.js
src/lib/supabase/{client,server,admin,middleware}.js
src/lib/auth/session.js
src/lib/slug.js
src/lib/password.js
src/lib/{db,logger,debounce,device,validation}.js
src/app/r/[slug]/page.js          # server orchestration only
src/app/api/**                    # all JSON APIs
src/app/(admin)/admin/{actions,queries}.js
src/app/(dashboard)/dashboard/{actions,queries}.js
scripts/seed-admin.mjs
```

---

## Definition of Done (BE)

- [x] Schema + RLS multi-tenant (`profiles`, `merchants`, cards evolve, feedbacks)
- [x] Public NFC APIs + `/r/[slug]` Direct 307 + debounce logger
- [x] Auth APIs: login / logout / me (no public register)
- [x] Admin APIs: merchants, cards, shield, telemetry export
- [x] Dashboard APIs: overview, analytics, settings
- [x] Middleware: unauth redirect, client≠admin, suspended gate
- [x] `npm run seed:admin` documented
- [x] `npm test` + `next build` green (BE verified)
- [ ] Apply migrations on target Supabase project (ops — di luar repo)

---

## Rules of engagement

- Prefer extending `/api/*` contracts over coupling FE to Server Actions.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client.
- Do not rewrite `RatingClientView` / dashboard page visuals — that is Front-End.
- Do not author QA plans beyond fixing BE bugs found by QA.
