-- POS clients and merchant analytics share the same payment ledger.
-- Bill components are deliberately not constrained: item/equal splits round each share.
alter table public.orders add constraint orders_total_integrity check (
  subtotal >= 0 and subtotal < 'Infinity'::numeric
  and discount >= 0 and discount < 'Infinity'::numeric
  and tax >= 0 and tax < 'Infinity'::numeric
  and service >= 0 and service < 'Infinity'::numeric
  and total = greatest(0::numeric, subtotal - discount) + service + tax
);

alter table public.payments add constraint payments_settlement_integrity check (
  amount >= 0 and amount < 'Infinity'::numeric
  and (
    status <> 'success'
    or (
      tendered_amount is not null
      and tendered_amount >= amount and tendered_amount < 'Infinity'::numeric
      and change_amount is not null
      and change_amount = case when method = 'cash' then tendered_amount - amount else 0 end
    )
  )
);
