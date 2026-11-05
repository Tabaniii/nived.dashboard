import { getLoginError } from './login-error';

export const UNAUTHORIZED_MESSAGE = 'Akun ini tidak memiliki akses dashboard. Hubungi tim Nived.';

const profileColumns = 'id, email, role, dashboard_role, full_name, merchant_id, is_active';

export async function findPortalProfile(supabase, user, { includeOutlet = false } = {}) {
  if (!user || user.is_anonymous) return null;

  const query = (columns) => supabase
    .from('profiles')
    .select(columns)
    .eq('id', user.id)
    .maybeSingle();

  const result = await query(includeOutlet ? `${profileColumns}, outlet_id` : profileColumns);
  const { data, error } = includeOutlet && result.error?.code === '42703'
    ? await query(profileColumns)
    : result;

  if (error || !data?.is_active) return null;
  return includeOutlet ? { ...data, outlet_id: data.outlet_id ?? null } : data;
}

export async function getPortalAccess(supabase, profile) {
  const admin = isPortalAdmin(profile);

  if (profile?.dashboard_role === 'superadmin') return { admin, dashboard: true };
  if (profile?.dashboard_role !== 'owner') return { admin, dashboard: false };

  const { data: merchant, error } = await supabase
    .from('merchants')
    .select('id, business_name, status')
    .eq('owner_id', profile.id)
    .in('status', ['trial', 'active'])
    .order('id')
    .limit(1)
    .maybeSingle();

  return { admin, dashboard: !error && Boolean(merchant), merchant: error ? null : merchant };
}

export function isPortalAdmin(profile) {
  return profile?.role === 'admin' && profile.dashboard_role === 'superadmin';
}

const redirectOrigin = 'https://portal.invalid';

export function getPortalDestination(access, requestedPath) {
  if (typeof requestedPath === 'string' && requestedPath.startsWith('/') && URL.canParse(requestedPath, redirectOrigin)) {
    const url = new URL(requestedPath, redirectOrigin);
    if (url.origin === redirectOrigin && (
      (access.dashboard && (url.pathname === '/dashboard' || url.pathname.startsWith('/dashboard/'))) ||
      (access.admin && (url.pathname === '/admin' || url.pathname.startsWith('/admin/')))
    )) {
      return url.pathname + url.search + url.hash;
    }
  }

  return access.dashboard ? '/dashboard' : '/admin';
}

export async function signInToPortal(supabase, { email, password, requestedPath }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return getLoginError(error);

  const profile = await findPortalProfile(supabase, data?.user);
  const access = await getPortalAccess(supabase, profile);
  if (!access.dashboard && !access.admin) {
    await supabase.auth.signOut({ scope: 'local' });
    return { error: UNAUTHORIZED_MESSAGE, status: 403 };
  }

  return {
    role: profile.dashboard_role,
    redirectTo: getPortalDestination(access, requestedPath),
  };
}
