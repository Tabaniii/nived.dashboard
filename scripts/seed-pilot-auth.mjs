import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(new URL(projectUrl).hostname, 'wpfvwmitkfmxpagykykn.supabase.co', 'Pilot seed must target the linked unified project');
assert(process.env.SUPABASE_SERVICE_ROLE_KEY, 'Service key required');
const admin = createClient(projectUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Credentials stay in the ignored local environment, never in console output.
for (const [prefix, email, role, dashboardRole, fullName] of [
  ['PILOT_OWNER', 'kopi.titik.temu.owner@example.com', 'owner', 'owner', 'Owner Kopi Titik Temu (Pilot)'],
  ['PILOT_ADMIN', 'nived.pilot.superadmin@example.com', 'admin', 'superadmin', 'Nived Internal (Pilot)'],
]) {
  const emailKey = `${prefix}_EMAIL`;
  const passwordKey = `${prefix}_PASSWORD`;
  assert(!process.env[emailKey] || process.env[emailKey] === email, 'Reserved pilot email mismatch');
  const password = process.env[passwordKey] || randomBytes(24).toString('base64url');
  if (!process.env[emailKey]) fs.appendFileSync('.env.local', `\n${emailKey}=${email}\n`);
  if (!process.env[passwordKey]) fs.appendFileSync('.env.local', `${passwordKey}=${password}\n`);
  fs.chmodSync('.env.local', 0o600);

  let user;
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    user = data.users.find(candidate => candidate.email === email);
    if (user || data.users.length < 100) break;
  }
  if (user) {
    assert.equal(user.app_metadata.pilot_seed, 'kopi-titik-temu', 'Refusing to modify an existing non-pilot account');
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      app_metadata: { role, pilot_seed: 'kopi-titik-temu' },
      user_metadata: { full_name: fullName },
    });
    if (error) throw error;
    user = data.user;
  }
  const { error } = await admin.from('profiles').upsert({
    id: user.id, auth_id: user.id, email, role, dashboard_role: dashboardRole,
    full_name: fullName, is_active: true,
  });
  if (error) throw error;
  console.log(JSON.stringify({ email, id: user.id, role: dashboardRole }));
}
