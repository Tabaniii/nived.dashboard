# Kopi Titik Temu integration verification

Verified 5 November 2026 (Asia/Jakarta). Live unified project: `wpfvwmitkfmxpagykykn`.
Dashboard source: `/Users/tabaniii/Herd/filter-rating`. POS source: `/Users/tabaniii/Herd/POS`.
Existing styling, Tailwind classes, layouts, and visual components were preserved.

## Seeded records

Store ID: `11111111-1111-1111-1111-111111111111`.
Outlet ID: `11111111-1111-4111-8111-111111110001`.

The canonical shared schema uses `merchants` for stores, `categories` for menu categories, and `products` for menu items. No parallel store/catalog tables were introduced.

| Fixture | Seed count |
| --- | ---: |
| Dedicated Auth/profile test accounts | 2 (owner and internal superadmin) |
| Outlet / area | 1 / 1 |
| Tables / tabletop cards | 10 / 10 |
| Categories | 4 |
| Products | 6 (the five requested products plus an unavailable main course) |
| Orders / items / bills | 15 / 30 / 15 |
| Successful payments | 11 |
| Historical shifts / active shift | 7 / 1 |
| Google review clicks | 25 |
| Private feedback | 8, all five categories, resolved and unresolved |

Seed receipts total **Rp 958.650**, covering seven WIB business dates. Service is 5%; PB1 is 10% of the amount including service, matching the POS calculation. QRIS, Cash and Debit use canonical `qris`, `cash` and `card` ledger values. Order states use `open`, `sent`, `ready`, `completed`, `cancelled`; kitchen items use `new`, `preparing`, `ready`, `served`, `void`.

Credentials are random and saved only in ignored `.env.local`, mode 0600: `PILOT_OWNER_EMAIL`, `PILOT_OWNER_PASSWORD`, `PILOT_ADMIN_EMAIL`, `PILOT_ADMIN_PASSWORD`. Existing accounts and other merchants were not reassigned.

## Browser and integration checks

- Anonymous `/dashboard/*` requests redirect to `/login`; anonymous dashboard APIs and POS bootstrap reject access.
- Owner RLS reads are restricted to the pilot store across POS and feedback data. Foreign store dashboard requests return 403. Direct anonymous reads disclose no profiles, orders, payments or private feedback.
- Superadmin reads both stores, and the UI switches between Nived Demo Coffee and Kopi Titik Temu.
- `/r/kopi-titik-temu-meja-04`: Google button opens the saved Google Review URL and inserts table `04` into `review_click_events`.
- Private modal submission inserts an anonymous complaint with the correct store, table and category. Hub displays it; resolution toggle persists `true`.
- Summary refresh persists a nine-feedback private summary. With no Gemini key configured, the existing rules fallback is used and labeled `Analisis otomatis`.
- With user approval, WhatsApp action opens the correctly encoded dummy summary and shows `Ringkasan disalin.`; no WhatsApp message was sent.
- POS owner signs in, loads shared categories/catalog/tables, opens a shift and selects Meja 04. Coffee quantity 2 plus croissant passes kitchen preparation → ready → served → cash checkout.
- Table transaction `ORD-044487`: subtotal Rp 73.000, service Rp 3.650, tax Rp 7.665, total **Rp 84.315**; tender Rp 100.000, change Rp 15.685. Under-tendered cash disables checkout; DB also rejects forged underpayments.
- Counter transaction `ORD-670953`: held takeaway order reopened and completed using **simulated QRIS**, total **Rp 25.410**. Receipt renders canonical store name/address.
- Dashboard and fresh POS bootstrap reconcile to the live Supabase ledger after both transactions.

Final pilot totals, including retained browser test evidence: **17 orders, 13 successful payments, Rp 1.068.375 collected, Rp 314.160 collected today, 26 Google clicks, 9 feedback records**. Two browser test orders, one additional click and one resolved test complaint remain intentionally visible.

## Fixes

Dashboard:

- Expired-session Server Actions use the installed Next.js redirect protocol; a two-tab browser test confirms a stale store switch returns to login without a runtime error.
- Main overview now reads shared POS payments/orders and review clicks/private feedback instead of obsolete rating-gating metrics.
- Correct WIB day/week/hour boundaries, pagination and no-card store handling; query errors fail visibly instead of producing false zero totals.
- Feedback list renders actual categories/resolution state without fabricated star ratings.
- Corrected a SQL test fixture that omitted the live legacy `owner_user_id` requirement.
- Granted trusted `service_role` SELECT on the review click ledger; public/owner restrictions remain intact.

POS:

- Shared server Supabase fetches explicitly bypass Next.js caching, fixing stale bootstrap/revenue after payment.
- Category filters use real category IDs/names; receipt identity uses joined merchant/outlet data.
- Reports use successful ledger payments; removed fabricated fallback totals and unpaid-order revenue.
- Zero tax/service rates are respected; invalid/under-tendered/cancelled payments rejected.
- Validation failures return HTTP 400 rather than 500.
- Applied database checks for finite, nonnegative, consistent order totals and successful payment tender/change. Split-bill rounding behavior is preserved.
- Seeded orders now have valid shift/collector links and realistic closed-shift cash reconciliation.

## Repeatable checks

```sh
node --env-file=.env.local scripts/seed-pilot-auth.mjs
# Apply supabase/seeds/pilot_unified.sql through the Supabase SQL plugin.
node --env-file=.env.local scripts/verify-pilot.mjs
npm run lint
npm test
npx tsc --noEmit --project jsconfig.json
npm run build
```

The SQL seed checks reserved IDs/owner assignments and reconciles fixture totals transactionally. Re-running it preserves counts and browser test orders. SQL verification files roll back all their fixtures:

- `supabase/tests/dashboard_rbac_access.sql`
- `supabase/tests/dashboard_pos_access.sql`
- `supabase/tests/pos_payment_integrity.sql`

Dashboard is JavaScript with `jsconfig.json`, so compiler verification specifies that existing project file; bare `tsc --noEmit` has no `tsconfig.json` to read.

Default Turbopack production build passed in a fresh isolated copy with the same source/dependencies and network access. This avoids the active dev server's build cache/worker permission conflict. Generated CSS was checked for compiled Tailwind utilities, brand color, dark variants and fonts. The webpack fallback was discarded because this project uses a Turbopack Tailwind loader and webpack left directives unexpanded.

GitHub HEAD `535c8c6` had successful Vercel status checks. New local fixes were not pushed or deployed. Vercel team access was authorized during verification. The latest production deployment is READY at HEAD 535c8c6; the runtime error query reported no errors in the last hour, and the recent 30-minute warning/error/fatal log query returned none. Required Supabase environment-variable names exist for production/preview; sensitive values were redacted, so this is a presence check only. Local production builds verify the new source independently.

## Limits

Google destination is the pilot's saved placeholder Place ID; verify the real merchant Place ID before launch. QRIS settlement was simulated; real payment-provider settlement, physical receipt printing and real WhatsApp delivery were not exercised. Gemini API generation requires a configured provider key; its rules fallback was verified. Existing Auth password-protection advisory was reviewed without changing project-wide settings.

## Final verification results

- Dashboard: 227/227 tests across 27 files, lint and compiler checks pass.
- POS: 36/36 tests, lint, TypeScript and production build pass.
- Live SDK/HTTP reconciliation: six integration groups pass.
- All three SQL access/integrity suites pass with fixtures rolled back.
- Five intentional invalid POS requests return 400 without saving data.
- Supabase log review found no backend 5xx after the final fixes; initial fixture/grant errors were corrected and negative permission/validation probes are expected.
- Two-tab expired-session browser regression passes.

Security advisors retain two intentional deny-by-default internal tables and the existing [leaked-password protection setting](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection); no project-wide Auth settings were changed.
