import { NextResponse, type NextRequest } from 'next/server';

// Signed-out visitors can only see the sign-in page: every other page redirects there,
// remembering where they were going. The cookie is set by signing in (lib/current-user.ts).
// API routes are left alone: the MCP endpoint authenticates with its own connection secret.

const SIGNED_IN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function proxy(request: NextRequest) {
  const member = request.cookies.get('vt_member')?.value;
  if (member && SIGNED_IN.test(member)) return NextResponse.next();

  const url = request.nextUrl.clone();
  const next = url.pathname + url.search;
  url.pathname = '/sign-in';
  url.search = next === '/' ? '' : `?next=${encodeURIComponent(next)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except the sign-in page, API routes, Next.js assets and files like favicon.ico.
  matcher: ['/((?!sign-in|api|_next/static|_next/image|.*\\.[a-z0-9]+$).*)'],
};
