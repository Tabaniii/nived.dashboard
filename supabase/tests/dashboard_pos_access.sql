-- Disposable fixtures only: every change is rolled back.
begin;
do $$
declare
  m uuid := gen_random_uuid(); other_m uuid := gen_random_uuid();
  o uuid := gen_random_uuid(); other_o uuid := gen_random_uuid();
  u uuid := gen_random_uuid(); foreign_order uuid := gen_random_uuid();
  rejected boolean;
begin
  insert into merchants(id,business_name,owner_name) values(m,'Dashboard access test','Test'),(other_m,'Other access test','Test');
  insert into outlets(id,name,merchant_id) values(o,'Test',m),(other_o,'Other',other_m);
  insert into auth.users(id,email) values(u,'dashboard-test-'||u||'@example.invalid');
  update profiles set role='cashier',merchant_id=m,outlet_id=o,is_active=false where id=u;
  rejected := false;
  begin
    perform pos_save_records(u,'{"records":[]}'::jsonb);
  exception when others then rejected := true;
  end;
  if not rejected then raise exception 'Inactive account accepted'; end if;
  update profiles set is_active=true,outlet_id=null where id=u;
  rejected := false;
  begin
    perform pos_save_records(u,'{"records":[]}'::jsonb);
  exception when others then rejected := true;
  end;
  if not rejected then raise exception 'Unassigned account accepted'; end if;
  update profiles set outlet_id=o where id=u;
  insert into orders(id,merchant_id,outlet_id,order_number,type) values(foreign_order,other_m,other_o,'TEST','takeaway');
  perform set_config('request.jwt.claim.sub',u::text,true);
  perform set_config('request.jwt.claims',json_build_object('sub',u,'role','authenticated')::text,true);
  set local role authenticated;
  if exists(select 1 from orders where id=foreign_order) then raise exception 'Cross-merchant order disclosed'; end if;
end $$;
rollback;
select 'PASS: inactive and unassigned sync denied; cross-merchant order read denied; fixtures rolled back' as result;
