import { createClient } from '@/lib/supabase/server';
import { findPortalProfile, isPortalAdmin } from './portal';

/**
 * @returns {Promise<{ user: import('@supabase/supabase-js').User, profile: object } | null>}
 */
export async function getSessionProfile(options) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = await findPortalProfile(supabase, user, options);
  return profile ? { user, profile } : null;
}

/**
 * @param {'admin' | 'client'} role
 */
export async function requireRole(role) {
  const session = await getSessionProfile();
  if (!session || (role === 'admin' ? !isPortalAdmin(session.profile) : session.profile.role !== role)) {
    return null;
  }
  return session;
}
