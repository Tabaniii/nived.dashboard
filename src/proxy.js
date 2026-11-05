import { NextResponse } from 'next/server';
import { findPortalProfile, getPortalAccess, getPortalDestination } from '@/lib/auth/portal';
import { updateSession } from '@/lib/supabase/middleware';

function isRoute(pathname, base) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

function routeRedirect(request, url) {
  // Next.js fetch actions need its redirect header; an HTTP redirect replays the POST at login.
  if (request.method === 'POST' && request.headers.has('next-action')) {
    return new NextResponse(null, {
      headers: { 'x-action-redirect': `${url};replace`, 'Cache-Control': 'private, no-store' },
    });
  }
  return NextResponse.redirect(url);
}

function loginRedirect(request, destination, unauthorized) {
  const url = new URL('/login', request.url);
  url.searchParams.set('redirect', destination);
  if (unauthorized) url.searchParams.set('error', 'unauthorized');
  return routeRedirect(request, url);
}

function withSession(response, session) {
  for (const cookie of session.response.cookies.getAll()) response.cookies.set(cookie);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export async function proxy(request) {
  const { pathname, searchParams } = request.nextUrl;
  const isDashboard = isRoute(pathname, '/dashboard') || isRoute(pathname, '/api/dashboard');
  const isAdmin = isRoute(pathname, '/admin') || isRoute(pathname, '/api/admin');
  const isApi = isRoute(pathname, '/api');
  const isLogin = pathname === '/' || pathname === '/login';

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey || url.includes('your-project')) {
    if (isLogin) return NextResponse.next();
    if (isApi) return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
    return loginRedirect(request, isDashboard ? '/dashboard' : '/admin', false);
  }

  const session = await updateSession(request);
  const { supabase, user } = session;
  const profile = await findPortalProfile(supabase, user);
  const access = await getPortalAccess(supabase, profile);
  const hasPortalAccess = access.dashboard || access.admin;

  if (isLogin) {
    if (!hasPortalAccess || searchParams.get('error') === 'unauthorized') return session.response;
    const destination = getPortalDestination(access, searchParams.get('redirect'));
    return withSession(routeRedirect(request, new URL(destination, request.url)), session);
  }

  const authorized = isDashboard ? access.dashboard : isAdmin ? access.admin : hasPortalAccess;
  if (authorized) return session.response;

  if (isAdmin && access.dashboard) {
    const response = isApi
      ? NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      : routeRedirect(request, new URL('/dashboard', request.url));
    return withSession(response, session);
  }

  if (user) await supabase.auth.signOut({ scope: 'local' });
  const response = isApi
    ? NextResponse.json({ error: user ? 'Forbidden' : 'Unauthorized' }, { status: user ? 403 : 401 })
    : loginRedirect(request, isDashboard ? '/dashboard' : '/admin', Boolean(user));
  return withSession(response, session);
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/dashboard/:path*',
    '/admin/:path*',
    '/api/dashboard/:path*',
    '/api/admin/:path*',
    '/api/auth/me',
  ],
};
