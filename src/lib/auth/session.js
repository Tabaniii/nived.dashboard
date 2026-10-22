import { createClient } from '@/lib/supabase/server';

/**
 * @returns {Promise<{ user: import('@supabase/supabase-js').User, profile: object } | null>}
 */
export async function getSessionProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, email, role, full_name, merchant_id, outlet_id, is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !profile || !profile.is_active) return null;

  return { user, profile };
}

/**
 * @param {'admin' | 'client'} role
 */
export async function requireRole(role) {
  const session = await getSessionProfile();
  if (!session || session.profile.role !== role) {
    return null;
  }
  return session;
}
