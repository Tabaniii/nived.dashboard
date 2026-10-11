import { NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

function isPublicPath(pathname) {
  if (pathname.startsWith('/r/')) return true;
  if (pathname.startsWith('/api/feedback')) return true;
  if (pathname.startsWith('/api/telemetry')) return true;
  if (pathname === '/api/auth/login') return true;
  if (pathname === '/api/auth/logout') return true;
  if (pathname.startsWith('/_next')) return true;
  if (pathname === '/favicon.ico') return true;
  return false;
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseReady = Boolean(url && anon && !url.includes('your-project'));

  if (!supabaseReady) {
    // Without Supabase, skip session middleware for pages; APIs stay 401/503 safe.
    if (
      pathname.startsWith('/api/dashboard') ||
      pathname.startsWith('/api/admin') ||
      pathname === '/api/auth/me'
    ) {
      return NextResponse.json(
        { error: 'Supabase is not configured' },
        { status: 503 }
      );
    }
    if (
      pathname === '/' ||
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/admin')
    ) {
      return NextResponse.next();
    }
  }

  const { supabase, user, supabaseResponse } = await updateSession(request);

  let role = null;
  let merchantStatus = null;

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, merchant_id, merchants(status)')
      .eq('id', user.id)
      .maybeSingle();

    role = profile?.role ?? null;
    merchantStatus = profile?.merchants?.status ?? null;
  }

  const isAuthPage = pathname === '/';
  const isDashboard = pathname.startsWith('/dashboard');
  const isAdmin = pathname.startsWith('/admin');

  const isProtectedApi =
    pathname.startsWith('/api/dashboard') ||
    pathname.startsWith('/api/admin') ||
    pathname === '/api/auth/me';

  if (!user && (isDashboard || isAdmin || isProtectedApi)) {
    if (isProtectedApi) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/';
    redirectUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isProtectedApi) {
    if (pathname.startsWith('/api/admin') && role === 'client') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  if (user && isAuthPage) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = role === 'admin' ? '/admin' : '/dashboard';
    return NextResponse.redirect(redirectUrl);
  }

  if (user && role === 'client' && isAdmin) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/dashboard';
    return NextResponse.redirect(redirectUrl);
  }

  if (user && role === 'admin' && isDashboard) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/admin';
    return NextResponse.redirect(redirectUrl);
  }

  if (user && role === 'client' && isDashboard && merchantStatus === 'suspended') {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/';
    redirectUrl.searchParams.set('error', 'suspended');
    // Sign-out is handled on the login page when error=suspended
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/admin/:path*',
    '/api/dashboard/:path*',
    '/api/admin/:path*',
    '/api/auth/:path*',
  ],
};
