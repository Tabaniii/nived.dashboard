-- Disposable fixtures: keep POS money checks at the database trust boundary.
begin;
do $$
declare
  actor_id uuid := gen_random_uuid();
  merchant uuid := '11111111-1111-1111-1111-111111111111';
  outlet uuid := '11111111-1111-4111-8111-111111110001';
  shift_id uuid := gen_random_uuid();
  order_id uuid := gen_random_uuid();
  bill_id uuid := gen_random_uuid();
  payment_id uuid := gen_random_uuid();
  rejected boolean;
  payload jsonb;
  invalid_record jsonb;
  invalid_payload jsonb;
begin
  insert into auth.users(id,email) values(actor_id,'payment-integrity-'||actor_id||'@example.invalid');
  update profiles set role='cashier',merchant_id=merchant,outlet_id=outlet,is_active=true where id=actor_id;
  insert into shifts(id,merchant_id,outlet_id,user_id,opening_cash,status) values(shift_id,merchant,outlet,actor_id,0,'open');
  insert into orders(id,merchant_id,outlet_id,user_id,shift_id,order_number,type,subtotal,total) values(order_id,merchant,outlet,actor_id,shift_id,'INTEGRITY-TEST','takeaway',24000,24000);
  insert into bills(id,merchant_id,order_id,subtotal,amount) values(bill_id,merchant,order_id,24000,24000);
  payload := jsonb_build_object('records',jsonb_build_array(jsonb_build_object('event_id',gen_random_uuid(),'table','payments','actor_id',actor_id,'outlet_id',outlet,'record',jsonb_build_object('id',payment_id,'order_id',order_id,'bill_id',bill_id,'user_id',actor_id,'shift_id',shift_id,'method','cash','amount',24000,'tendered_amount',10000,'change_amount',0,'status','success'))));
  for invalid_record in select value from jsonb_array_elements(jsonb_build_array(
    jsonb_build_object('tendered_amount',10000,'change_amount',0),
    jsonb_build_object('tendered_amount',50000,'change_amount',0),
    jsonb_build_object('tendered_amount','NaN','change_amount',0),
    jsonb_build_object('amount','NaN','tendered_amount','NaN','change_amount',0)
  )) loop
    invalid_payload := jsonb_set(payload,'{records,0,record}',(payload#>'{records,0,record}') || invalid_record);
    rejected := false;
    begin
      perform pos_save_records(actor_id,invalid_payload);
    exception when check_violation or raise_exception then rejected := true;
    end;
    if not rejected then raise exception 'Invalid cash payment accepted: %',invalid_record; end if;
    if exists(select 1 from payments where id=payment_id) then raise exception 'Rejected payment was partially saved'; end if;
    if exists(select 1 from pos_sync_events where entity_id=payment_id) then raise exception 'Rejected payment event was partially saved'; end if;
  end loop;

  rejected := false;
  begin
    perform pos_save_records(actor_id,jsonb_build_object('records',jsonb_build_array(jsonb_build_object('event_id',gen_random_uuid(),'table','orders','actor_id',actor_id,'outlet_id',outlet,'record',jsonb_build_object('id',order_id,'outlet_id',outlet,'user_id',actor_id,'shift_id',shift_id,'version',2,'updated_at',now()+interval '1 second','subtotal',24000,'discount',0,'tax',0,'service',0,'total',1,'order_number','INTEGRITY-TEST','type','takeaway')))));
  exception when check_violation then rejected := true;
  end;
  if not rejected then raise exception 'Inconsistent order total accepted'; end if;

  payload := jsonb_set(payload,'{records,0,event_id}',to_jsonb(gen_random_uuid()));
  payload := jsonb_set(payload,'{records,0,record,tendered_amount}','50000');
  payload := jsonb_set(payload,'{records,0,record,change_amount}','26000');
  perform pos_save_records(actor_id,payload);
  perform pos_save_records(actor_id,payload);
  if (select count(*) from payments where id=payment_id) <> 1 then raise exception 'Valid payment retry duplicated'; end if;
  if (select amount from payments where id=payment_id) <> 24000 then raise exception 'Valid payment amount changed'; end if;
  if has_function_privilege('anon','public.pos_save_records(uuid,jsonb)','execute') or has_function_privilege('authenticated','public.pos_save_records(uuid,jsonb)','execute') then raise exception 'Sync RPC exposed to client roles'; end if;
end $$;
rollback;
select 'PASS: under-tender and inconsistent totals rejected atomically; valid payment retry idempotent; client RPC access denied; fixtures rolled back' as result;
