/**
 * Next.js 16 proxy convention — replaces the deprecated `middleware.ts`.
 *
 * This file intercepts every matched request to refresh the Supabase auth
 * session and enforce role-based route guards (admin vs stylist vs guest).
 * See `lib/supabase/middleware.ts` for the full session/guard logic.
 */
import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
