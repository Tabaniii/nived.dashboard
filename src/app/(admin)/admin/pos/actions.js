'use server';
import { revalidatePath } from 'next/cache';
import { adminContext } from '@/lib/pos/data';
import { POS_ROLES, uuid } from '@/lib/pos/validation';

const text = (form, key) => String(form.get(key) || '').trim();
export async function saveOutlet(_previous, form) {
  try {
    const { db } = await adminContext();
    const id = text(form, 'id');
    const merchant_id = text(form, 'merchant_id');
    const name = text(form, 'name');
    const tax = Number(form.get('tax_rate')), service = Number(form.get('service_charge_rate'));
    if (!uuid(merchant_id) || (id && !uuid(id)) || !name || name.length > 200 || !Number.isFinite(tax) || !Number.isFinite(service) || tax < 0 || tax > 100 || service < 0 || service > 100) throw new Error('Enter a merchant, outlet name, and valid percentages (0–100).');
    const { data: merchant } = await db.from('merchants').select('id').eq('id', merchant_id).maybeSingle();
    if (!merchant) throw new Error('Merchant not found.');
    const row = { name, merchant_id, address: text(form,'address'), phone: text(form,'phone'), tax_rate: tax / 100, service_charge_rate: service / 100 };
    const query = id ? db.from('outlets').update(row).eq('id',id).eq('merchant_id',merchant_id) : db.from('outlets').insert(row);
    const { data, error } = await query.select('id').single();
    if (error || !data) throw new Error('Unable to save outlet. Existing outlets cannot be moved between merchants.');
    revalidatePath('/admin/outlets');
    return { success: 'Outlet saved.' };
  } catch (error) { return { error: error.message }; }
}
export async function saveEmployee(_previous, form) {
  try {
    const { db, session } = await adminContext();
    const id = text(form,'id'), merchant_id = text(form,'merchant_id'), outlet_id = text(form,'outlet_id') || null;
    const full_name = text(form,'full_name'), role = text(form,'role');
    const is_active = form.get('is_active') === 'on';
    if ((id && !uuid(id)) || !uuid(merchant_id) || (outlet_id && !uuid(outlet_id)) || !full_name || full_name.length > 200 || !POS_ROLES.includes(role) || (is_active && !outlet_id)) throw new Error('Choose a name, POS role, merchant and outlet. Active staff require an outlet.');
    if (id === session.user.id) throw new Error('You cannot change your own admin account here.');
    const { data: merchant } = await db.from('merchants').select('id').eq('id',merchant_id).maybeSingle();
    if (!merchant) throw new Error('Merchant not found.');
    if (outlet_id) {
      const { data: outlet } = await db.from('outlets').select('id').eq('id',outlet_id).eq('merchant_id',merchant_id).maybeSingle();
      if (!outlet) throw new Error('Outlet does not belong to this merchant.');
    }
    const assignment = { full_name, role, merchant_id, outlet_id, is_active };
    if (id) {
      const { data: existing } = await db.from('profiles').select('id,role').eq('id',id).maybeSingle();
      if (!existing || existing.role === 'admin') throw new Error('Admin accounts cannot be edited in employee management.');
      // Profiles are the live authorization source for POS; disable/reassign here first.
      const { error } = await db.from('profiles').update(assignment).eq('id',id).neq('role','admin');
      if (error) throw new Error('Unable to update employee.');
      revalidatePath('/admin/employees');
      return { success: 'Employee updated. POS checks the live assignment on every server request.' };
    }
    const email = text(form,'email').toLowerCase(), password = String(form.get('password') || '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12) throw new Error('Enter a valid email and a password of at least 12 characters.');
    // Start without POS access. Only activate after the profile write succeeds.
    const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name }, app_metadata: { role, merchant_id } });
    if (error) throw new Error(error.message);
    const { error: profileError } = await db.from('profiles').upsert({ id: data.user.id, email, ...assignment });
    if (profileError) {
      const { error: cleanupError } = await db.auth.admin.deleteUser(data.user.id);
      throw new Error(cleanupError ? 'Profile setup failed; an unassigned Auth account remains. Contact the administrator before retrying.' : 'Profile setup failed. Account creation was rolled back.');
    }
    revalidatePath('/admin/employees');
    return { success: 'Employee created. Share the credentials securely; sign in at the POS /login page.' };
  } catch (error) { return { error: error.message }; }
}
