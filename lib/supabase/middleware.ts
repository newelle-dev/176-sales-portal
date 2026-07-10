import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database.types';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();

  // Root redirect
  if (url.pathname === '/') {
    if (user) {
      const role = user.app_metadata?.role;
      if (role === 'admin') {
        url.pathname = '/admin';
        return NextResponse.redirect(url);
      } else {
        url.pathname = '/stylist';
        return NextResponse.redirect(url);
      }
    } else {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  // Protect /admin routes
  if (url.pathname.startsWith('/admin')) {
    if (!user) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    const role = user.app_metadata?.role;
    if (role !== 'admin') {
      url.pathname = role === 'stylist' ? '/stylist' : '/login';
      return NextResponse.redirect(url);
    }
  }

  // Protect /stylist routes
  if (url.pathname.startsWith('/stylist')) {
    if (!user) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    const role = user.app_metadata?.role;
    if (role === 'admin') {
      url.pathname = '/admin';
      return NextResponse.redirect(url);
    }
    if (role !== 'stylist') {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  // Prevent logged in users from visiting /login
  if (url.pathname === '/login' && user) {
    const role = user.app_metadata?.role;
    url.pathname = role === 'admin' ? '/admin' : '/stylist';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
