import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const VALID_ROLES = ['admin', 'secretary', 'treasurer'] as const;
type BarangayRole = (typeof VALID_ROLES)[number];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  // Redirect unauthenticated users back to login page
  if (!user && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Enforce strict role-based routing on the server
  if (user && pathname.startsWith('/dashboard')) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const rawRole = String(profile?.role || '').toLowerCase();
    const isValidRole = VALID_ROLES.includes(rawRole as BarangayRole);

    if (error || !isValidRole) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    const role = rawRole as BarangayRole;

    // If visiting /dashboard directly, send straight to their role's portal
    if (pathname === '/dashboard' || pathname === '/dashboard/') {
      return NextResponse.redirect(new URL(`/dashboard/${role}`, request.url));
    }

    if (pathname.startsWith('/dashboard/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL(`/dashboard/${role}`, request.url));
    }
    if (pathname.startsWith('/dashboard/secretary') && role !== 'secretary' && role !== 'admin') {
      return NextResponse.redirect(new URL(`/dashboard/${role}`, request.url));
    }
    if (pathname.startsWith('/dashboard/treasurer') && role !== 'treasurer' && role !== 'admin') {
      return NextResponse.redirect(new URL(`/dashboard/${role}`, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
