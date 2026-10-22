import { describe, it, expect } from 'vitest';
import { staffPerformance } from '@/lib/pos/performance';
import { businessDates } from '@/lib/pos/validation';
const from = '2026-10-21T17:00:00Z', to = '2026-10-22T17:00:00Z';
describe('POS reporting',()=>{
  it('uses Jakarta inclusive business days and rejects invalid ranges',()=>{
    expect(businessDates('2026-10-22','2026-10-22')).toEqual({from:'2026-10-21T17:00:00.000Z',to:'2026-10-22T17:00:00.000Z'});
    expect(()=>businessDates('2026-02-30','2026-03-01')).toThrow();
    expect(()=>businessDates('2026-10-23','2026-10-22')).toThrow();
  });
  it('attributes split receipts to collector, excludes unpaid/refunded and exclusive end',()=>{
    const rows=staffPerformance({profiles:[{id:'creator'},{id:'collector'},{id:'idle'}],payments:[
      {user_id:'collector',order_id:'same',status:'success',amount:100,paid_at:from},
      {user_id:'collector',order_id:'same',status:'success',amount:200,paid_at:from},
      {user_id:'collector',status:'refunded',amount:50,paid_at:from},
      {user_id:'collector',status:'pending',amount:999,paid_at:from},
      {user_id:'collector',status:'success',amount:999,paid_at:to},
      {user_id:null,status:'success',amount:20,paid_at:from},
    ]},from,to);
    expect(rows.find(r=>r.staff_id==='collector')).toMatchObject({transactions:2,collected:300,refunds:50,net_collected:300,original_collected:350,average_payment:150,collected_per_hour:null});
    expect(rows.find(r=>r.staff_id==='creator').collected).toBe(0);
    expect(rows.find(r=>r.staff_id==='idle').transactions).toBe(0);
    expect(rows.find(r=>r.staff_id===null).collected).toBe(20);
  });
  it('clips overlapping and open shifts and counts variance on closure date',()=>{
    const rows=staffPerformance({shifts:[
      {user_id:'a',opened_at:'2026-10-21T16:00:00Z',closed_at:'2026-10-21T19:00:00Z',status:'closed',variance:-10},
      {user_id:'a',opened_at:'2026-10-22T16:00:00Z',closed_at:null,status:'open'},
      {user_id:'a',opened_at:'2026-10-22T18:00:00Z',closed_at:null,status:'open'},
    ]},from,to,new Date('2026-10-22T16:30:00Z'));
    expect(rows[0]).toMatchObject({hours:2.5,cash_variance:-10});
  });
});
