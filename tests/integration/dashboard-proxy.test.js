import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/lib/supabase/middleware', () => ({ updateSession: vi.fn() }));

import { updateSession } from '@/lib/supabase/middleware';
import { proxy } from '@/proxy';

function setupSession(profile, { merchant = null, user = { id: 'user-1' }, sessionCookie } = {}) {
  const profileQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: profile }),
  };
  const merchantQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: merchant }),
  };
  let response = NextResponse.next();
  if (sessionCookie) response.cookies.set('sb-example-auth-token', sessionCookie, { path: '/' });
  const signOut = vi.fn(async () => {
    response = NextResponse.next();
    response.cookies.set('sb-example-auth-token', '', { path: '/', maxAge: 0 });
  });
  const supabase = {
    auth: { signOut },
    from: vi.fn((table) => table === 'profiles' ? profileQuery : merchantQuery),
  };
  updateSession.mockResolvedValue({ user, supabase, get response() { return response; } });
  return { supabase, profileQuery, merchantQuery, signOut };
}

const request = (pathname, options) => new NextRequest(`https://portal.example.invalid${pathname}`, options);
const owner = { id: 'user-1', role: 'client', dashboard_role: 'owner', is_active: true };

describe('dashboard proxy authorization', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'example-key');
  });

  afterEach(() => vi.unstubAllEnvs());

  it('redirects a guest to login and denies direct API access', async () => {
    const { signOut } = setupSession(null, { user: null });
    const page = await proxy(request('/dashboard/reviews-feedback'));
    const location = new URL(page.headers.get('location'));
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('redirect')).toBe('/dashboard');
    expect((await proxy(request('/api/dashboard/overview'))).status).toBe(401);
    expect(signOut).not.toHaveBeenCalled();
  });

  it('navigates an expired fetch action to login without replaying its POST', async () => {
    const { signOut, supabase } = setupSession(null, { user: null });
    const response = await proxy(request('/dashboard', {
      method: 'POST', headers: { 'next-action': 'store-switch-action' },
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-action-redirect')).toBe('https://portal.example.invalid/login?redirect=%2Fdashboard;replace');
    expect(response.headers.has('location')).toBe(false);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(supabase.from).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it('denies an owner admin action and preserves refreshed session cookies', async () => {
    const { signOut } = setupSession(owner, { merchant: { id: 'own-store' }, sessionCookie: 'refreshed' });
    const response = await proxy(request('/admin', {
      method: 'POST', headers: { 'next-action': 'admin-mutation-action' },
    }));

    expect(response.headers.get('x-action-redirect')).toBe('https://portal.example.invalid/dashboard;replace');
    expect(response.headers.has('location')).toBe(false);
    expect(response.cookies.get('sb-example-auth-token')?.value).toBe('refreshed');
    expect(signOut).not.toHaveBeenCalled();
  });

  it('forwards the revoked cookie when an ineligible profile submits an action', async () => {
    const { signOut } = setupSession({ ...owner, is_active: false });
    const response = await proxy(request('/dashboard', {
      method: 'POST', headers: { 'next-action': 'store-switch-action' },
    }));

    expect(response.headers.get('x-action-redirect')).toBe('https://portal.example.invalid/login?redirect=%2Fdashboard&error=unauthorized;replace');
    expect(response.cookies.get('sb-example-auth-token')?.maxAge).toBe(0);
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it.each([
    { role: 'cashier', dashboard_role: 'staff', is_active: true },
    { role: 'admin', dashboard_role: 'staff', is_active: true },
    { role: 'admin', dashboard_role: 'superadmin', is_active: false },
    owner,
  ])('denies an ineligible profile and forwards the sign-out cookie', async (profile) => {
    const { signOut } = setupSession(profile);
    const page = await proxy(request('/dashboard'));
    const location = new URL(page.headers.get('location'));
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('error')).toBe('unauthorized');
    expect(page.cookies.get('sb-example-auth-token')?.maxAge).toBe(0);
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('denies anonymous Supabase accounts before reading profiles', async () => {
    const { supabase } = setupSession(owner, { user: { id: 'user-1', is_anonymous: true } });
    const page = await proxy(request('/dashboard'));
    expect(page.status).toBe(307);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('checks the signed-in owner assignment and keeps admin APIs private', async () => {
    const { merchantQuery, signOut } = setupSession(owner, { merchant: { id: 'own-store' } });
    expect((await proxy(request('/dashboard/reviews-feedback'))).status).toBe(200);
    expect(merchantQuery.eq).toHaveBeenCalledWith('owner_id', 'user-1');
    expect((await proxy(request('/api/admin/overview'))).status).toBe(403);
    expect(signOut).not.toHaveBeenCalled();
  });

  it('allows superadmins without requiring a store assignment', async () => {
    const { merchantQuery } = setupSession({ ...owner, role: 'admin', dashboard_role: 'superadmin' });
    expect((await proxy(request('/dashboard/reviews-feedback'))).status).toBe(200);
    expect((await proxy(request('/admin'))).status).toBe(200);
    expect(merchantQuery.select).not.toHaveBeenCalled();
  });

  it('accepts only eligible internal destinations after login', async () => {
    setupSession(owner, { merchant: { id: 'own-store' } });
    const go = async (redirect) => (await proxy(request(`/login?redirect=${encodeURIComponent(redirect)}`))).headers.get('location');
    expect(await go('/dashboard/reviews-feedback')).toBe('https://portal.example.invalid/dashboard/reviews-feedback');
    for (const destination of ['//evil.example', '//[invalid', '/admin', '/dashboard/../admin', '/\\evil.example']) {
      expect(await go(destination)).toBe('https://portal.example.invalid/dashboard');
    }
  });
});
