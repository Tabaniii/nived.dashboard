import { describe,it,expect,vi,beforeEach } from 'vitest';
vi.mock('@/lib/auth/session',()=>({requireRole:vi.fn()}));
vi.mock('@/lib/supabase/admin',()=>({createAdminClient:vi.fn()}));
vi.mock('next/cache',()=>({revalidatePath:vi.fn()}));
import { requireRole } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { adminContext, reportData, orderDetail, allRows } from '@/lib/pos/data';
import { saveEmployee,saveOutlet } from '@/app/(admin)/admin/pos/actions';
beforeEach(()=>vi.resetAllMocks());
describe('POS server authorization',()=>{
  it('rejects all reads and writes before constructing privileged client',async()=>{
    requireRole.mockResolvedValue(null);
    await expect(adminContext()).rejects.toThrow('super admin');
    await expect(reportData({})).rejects.toThrow('super admin');
    await expect(orderDetail('a','b','c')).rejects.toThrow('super admin');
    expect(await saveEmployee(null,new FormData())).toHaveProperty('error');
    expect(await saveOutlet(null,new FormData())).toHaveProperty('error');
    expect(createAdminClient).not.toHaveBeenCalled();
  });
  it('rejects outlet belonging to another merchant',async()=>{
    requireRole.mockResolvedValue({user:{id:'admin'}});
    const q={select:()=>q,eq:()=>q,maybeSingle:vi.fn().mockResolvedValueOnce({data:{id:'m'}}).mockResolvedValueOnce({data:null})};
    createAdminClient.mockReturnValue({from:()=>q});
    await expect(reportData({merchant:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',outlet:'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',from:'2026-10-22',through:'2026-10-22'})).rejects.toThrow('does not belong');
  });
  it('reads beyond a database page without truncating totals',async()=>{
    const range=vi.fn().mockResolvedValueOnce({data:Array.from({length:500},(_,id)=>({id}))}).mockResolvedValueOnce({data:[{id:500}]});
    expect((await allRows(()=>({order:()=>({range})}))).length).toBe(501);
    expect(range).toHaveBeenLastCalledWith(500,999);
  });
});

describe('employee provisioning',()=>{
  const merchant='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',outlet='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  function form(overrides={}) { const f=new FormData(); for(const [k,v] of Object.entries({full_name:'Test',role:'cashier',merchant_id:merchant,outlet_id:outlet,is_active:'on',email:'test@example.invalid',password:'a-test-password-123',...overrides})) f.set(k,v); return f; }
  it('creates Auth on server and then assigns the complete profile',async()=>{
    requireRole.mockResolvedValue({user:{id:'admin'}});
    const upsert=vi.fn().mockResolvedValue({error:null});
    const q={select:()=>q,eq:()=>q,maybeSingle:vi.fn().mockResolvedValue({data:{id:merchant}}),upsert};
    const createUser=vi.fn().mockResolvedValue({data:{user:{id:'new-user'}}});
    createAdminClient.mockReturnValue({from:()=>q,auth:{admin:{createUser}}});
    const result=await saveEmployee(null,form());
    expect(result.success).toBeTruthy();
    expect(createUser.mock.calls[0][0]).toMatchObject({app_metadata:{role:'cashier',merchant_id:merchant},user_metadata:{full_name:'Test'}});
    expect(createUser.mock.calls[0][0].user_metadata).not.toHaveProperty('role');
    expect(upsert).toHaveBeenCalledWith({id:'new-user',email:'test@example.invalid',full_name:'Test',role:'cashier',merchant_id:merchant,outlet_id:outlet,is_active:true});
    expect(JSON.stringify(result)).not.toContain('a-test-password');
  });
  it('rejects forged admin role and active account with no outlet',async()=>{
    requireRole.mockResolvedValue({user:{id:'admin'}});
    createAdminClient.mockReturnValue({});
    expect(await saveEmployee(null,form({role:'admin'}))).toHaveProperty('error');
    expect(await saveEmployee(null,form({outlet_id:''}))).toHaveProperty('error');
  });
  it('removes the new Auth account when profile assignment fails',async()=>{
    requireRole.mockResolvedValue({user:{id:'admin'}});
    const q={select:()=>q,eq:()=>q,maybeSingle:vi.fn().mockResolvedValue({data:{id:merchant}}),upsert:vi.fn().mockResolvedValue({error:{message:'failed'}})};
    const deleteUser=vi.fn().mockResolvedValue({error:null});
    createAdminClient.mockReturnValue({from:()=>q,auth:{admin:{createUser:vi.fn().mockResolvedValue({data:{user:{id:'new-user'}}}),deleteUser}}});
    expect((await saveEmployee(null,form())).error).toContain('rolled back');
    expect(deleteUser).toHaveBeenCalledWith('new-user');
  });
});
