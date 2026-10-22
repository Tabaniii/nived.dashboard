# Dashboard → POS agent handoff

Implemented in `/Users/tabaniii/Herd/filter-rating`, 2026-10-22. POS source was inspected but not modified.
Shared project: `fanhcjlfgqksdlolsmnk` (Nived super app). No migrations, seeds, or permanent test business data were applied.

## Dashboard implementation

- `/admin/outlets`: super admin creates and edits outlets under an existing merchant, including address, phone, tax and service rates. Existing outlets cannot change merchant.
- `/admin/employees`: super admin creates email/password accounts via server-only Auth Admin API and writes `profiles.full_name`, `role`, `merchant_id`, `outlet_id`, `is_active`. Supports reassignment, role changes and disabling access. POS roles: owner, manager, cashier, waiter, kitchen. Admin accounts are deliberately excluded from staff editing to prevent self-lockout or privilege escalation. Initial passwords are entered by the admin and are not returned or logged.
- `/admin/pos`: merchant/outlet/date/employee filters; successful payment count, collected amount, average receipt, shift overlap hours, collected/hour, cash difference, hourly receipts, orders, receipt details including split bills/items/modifiers, shifts, cash movements, and activity audit before/after values. Refreshes every 60 seconds while visible and on navigation/manual refresh.
- Reads require a fresh verified user and active admin profile on the server. Explicit merchant and optional outlet scopes constrain each report. Payment outlet scope joins orders; collector and shift attribution come only from payments. Child detail queries follow a validated scoped parent order. No public POS dashboard endpoint exists.
- Periods are inclusive selected Jakarta business dates converted to UTC `[from,to)`, maximum 93 days. Refunded rows are excluded from collected without double subtraction. Refund figures use original paid_at, not refund event time. Existing zero-activity profiles remain visible; historical/system identities are separate. Order creator activity is separate from payment collection.
- Pagination fetches 500 records at a time; a report exceeding 100,000 rows in any dataset fails explicitly and requests a narrower period, rather than showing partial totals.
- Existing merchant onboarding now uses app_metadata for authorization claims. Dashboard login rejects inactive accounts and directs POS-only staff to use POS login. Service client has a build-time server-only boundary.

## Configuration and POS work

1. Dashboard local environment already points to the shared project and has a server service key. Configure the same values on its deployment: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and server-only `SUPABASE_SERVICE_ROLE_KEY`. Never prefix the service key with NEXT_PUBLIC or expose it to a client. No POS HTTP API key or CORS configuration is needed for direct shared-database reads.
2. Keep POS `requireStaff` live profile/outlet checks and `pos_save_records` access checks. They already reject inactive or unassigned accounts, including stale sessions. No POS code change is required for basic provisioning/reporting. Assignment edits apply on the next server request; the existing cached POS display may remain visible until its next validation, but server writes are denied.
3. Create the real outlet and real named staff in the dashboard. No names or employee identities were invented. Enter passwords securely and distribute credentials outside logs. Use POS `/login` for staff. Do not use dashboard login for cashier/waiter/kitchen roles.
4. Provision the real outlet catalog, categories, tables, modifiers and recipes through an authorized catalog workflow before live trading. Catalog editing is outside this dashboard implementation; local demo catalog editors are not a production cloud catalog manager.
5. Complete the two-device end-to-end acceptance: two real staff logins; separate shifts; different order creator and collector; split payments; known cash in/out and closing cash; compare dashboard attribution and Jakarta date boundaries; retry sync; deactivate/reassign staff and confirm server rejection. This was not performed with real employee credentials during implementation.
6. Keep QR ordering, delivery simulation, QRIS mock settlement and manager-PIN approvals marked as nonproduction. Dashboard payment status reflects stored POS data, not independently verified provider settlement.
7. Cash variance review is read-only. Adding approval later requires an authorized manager/admin server operation and an audit write; do not auto-approve closure variance.
8. Decide whether other products need public Supabase sign-up before disabling it project-wide. This implementation did not change shared Auth settings. Unassigned accounts cannot enter the staff POS path regardless.
9. Account reassignment can leave unsynced records on a device tied to the original account/outlet; follow POS's pending queue workflow before planned reassignment. Do not clear local storage to resolve pending records.

## Verification

- Vitest tests cover collector attribution, split receipts, unpaid/refunded exclusion, date boundaries, open/overlapping shifts, zero activity, unauthorized reads/writes, invalid merchant/outlet scope, page traversal, Auth provisioning, profile failure cleanup, and forged privilege fields.
- Production build and ESLint pass. Build emits existing `connection()` prerender warnings in `/api/dashboard/analytics` and `/api/dashboard/overview`; these are outside the new POS routes.
- Live PostgREST reads verified the payment→order and item→modifier joins and all report tables. Business tables currently have no trading history, so real login-to-payment UI acceptance remains outstanding.
- POS `supabase/tests/staff_sync.sql` passed against the shared database: atomic sync, retry idempotency, actor validation, cash difference and RPC permission checks. Transaction rolled back.
- Dashboard `supabase/tests/dashboard_pos_access.sql` passed: inactive account denied, unassigned account denied, cross-merchant RLS read denied. Transaction rolled back.
- Anonymous requests to `/admin/pos`, `/admin/employees`, and `/admin/outlets` redirected to login. Anonymous Supabase reads disclosed no profiles, payments or shifts.
