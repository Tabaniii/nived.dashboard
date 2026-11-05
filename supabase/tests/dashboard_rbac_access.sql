-- Run after the dashboard RBAC migration. Fixtures are rolled back.
begin;

do $$
declare
  admin_id uuid := gen_random_uuid();
  owner_user uuid := gen_random_uuid();
  staff_id uuid := gen_random_uuid();
  store_a uuid := gen_random_uuid();
  store_b uuid := gen_random_uuid();
  feedback_a uuid := gen_random_uuid();
  feedback_b uuid := gen_random_uuid();
  changed int;
begin
  insert into auth.users (id, email) values
    (admin_id, admin_id || '@example.invalid'),
    (owner_user, owner_user || '@example.invalid'),
    (staff_id, staff_id || '@example.invalid');

  update public.profiles set dashboard_role = 'superadmin' where id = admin_id;
  update public.profiles set dashboard_role = 'owner' where id = owner_user;
  -- Simulate a demoted dashboard admin that retains the POS role.
  update public.profiles set role = 'admin' where id = staff_id;

  insert into public.merchants (id, name, business_name, owner_name, owner_user_id, owner_id, status) values
    (store_a, 'Fixture A', 'Fixture A', 'Fixture', owner_user, owner_user, 'active'),
    (store_b, 'Fixture B', 'Fixture B', 'Fixture', admin_id, null, 'active');
  update public.profiles set merchant_id = store_b where id in (owner_user, staff_id);

  insert into public.customer_feedback (id, store_id, category, feedback_text) values
    (feedback_a, store_a, 'Kebersihan', 'Own feedback'),
    (feedback_b, store_b, 'Lainnya', 'Other feedback');
  insert into public.review_click_events (store_id, table_number) values
    (store_a, '01'), (store_b, '02');
  insert into public.feedback_summaries (merchant_id, period_start, period_end, summary, private_feedback_only)
    values (store_a, now() - interval '7 days', now(), 'Own summary', true),
           (store_b, now() - interval '7 days', now(), 'Other summary', true);

  perform set_config('request.jwt.claim.sub', owner_user::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', owner_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
  if not exists (select 1 from public.merchants where id = store_a)
      or exists (select 1 from public.merchants where id = store_b) then
    raise exception 'Owner store visibility follows legacy membership or omits the owned store';
  end if;
  if not exists (select 1 from public.customer_feedback where id = feedback_a)
      or exists (select 1 from public.customer_feedback where id = feedback_b)
      or exists (select 1 from public.review_click_events where store_id = store_b)
      or exists (select 1 from public.feedback_summaries where merchant_id = store_b) then
    raise exception 'Owner dashboard reads are not isolated';
  end if;
  update public.customer_feedback set resolved_status = true where id = feedback_b;
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'Owner resolved foreign feedback'; end if;
  update public.customer_feedback set resolved_status = true where id = feedback_a;
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception 'Owner cannot resolve their own feedback'; end if;
  begin
    update public.profiles set dashboard_role = 'superadmin' where id = owner_user;
    raise exception 'Owner can elevate their own role';
  exception when insufficient_privilege then null;
  end;
  reset role;

  perform set_config('request.jwt.claim.sub', staff_id::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', staff_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
  if exists (select 1 from public.customer_feedback where id in (feedback_a, feedback_b))
      or exists (select 1 from public.review_click_events where store_id in (store_a, store_b))
      or exists (select 1 from public.feedback_summaries where merchant_id in (store_a, store_b)) then
    raise exception 'Staff bypassed the dashboard role via a legacy admin permission';
  end if;
  reset role;

  perform set_config('request.jwt.claim.sub', admin_id::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
  if (select count(*) from public.merchants where id in (store_a, store_b)) <> 2
      or (select count(*) from public.review_click_events where store_id in (store_a, store_b)) <> 2
      or (select count(*) from public.feedback_summaries where merchant_id in (store_a, store_b)) <> 2 then
    raise exception 'Superadmin cannot read both stores';
  end if;
  update public.customer_feedback set resolved_status = false where id in (feedback_a, feedback_b);
  get diagnostics changed = row_count;
  if changed <> 2 then raise exception 'Superadmin cannot resolve feedback from both stores'; end if;
  reset role;

  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  insert into public.customer_feedback (store_id, category, feedback_text)
    values (store_a, 'Lainnya', 'Anonymous feedback');
  insert into public.review_click_events (store_id, table_number) values (store_a, '03');
  begin
    perform id from public.customer_feedback;
    raise exception 'Guest read private feedback';
  exception when insufficient_privilege then null;
  end;
  reset role;
end;
$$;

rollback;
select 'PASS: owner isolation, superadmin management, staff denial, and guest insert-only' as result;
