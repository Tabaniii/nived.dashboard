-- Trusted server-side reconciliation reads the same ledger as the owner dashboard.
grant select on public.review_click_events to service_role;
