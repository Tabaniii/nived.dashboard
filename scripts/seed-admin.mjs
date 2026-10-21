/**
 * One-time admin bootstrap.
 * Usage:
 *   node --env-file=.env scripts/seed-admin.mjs
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL
 * Optional: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FULL_NAME
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.ADMIN_EMAIL || 'nived.labs@gmail.com';
const password = process.env.ADMIN_PASSWORD || 'nived!zyx';
const fullName = process.env.ADMIN_FULL_NAME || 'Nived Admin';

if (!url || !serviceKey || url.includes('your-project')) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { role: 'admin', full_name: fullName },
});

if (error) {
  console.error('Failed to create admin:', error.message);
  process.exit(1);
}

const { error: profileError } = await admin.from('profiles').upsert({
  id: data.user.id,
  email,
  role: 'admin',
  full_name: fullName,
  merchant_id: null,
});

if (profileError) {
  console.error('User created but profile upsert failed:', profileError.message);
  process.exit(1);
}

console.log('Admin ready:');
console.log(`  email:    ${email}`);
console.log(`  password: ${password}`);
console.log('Change the password after first login.');
