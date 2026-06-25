import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // Define public paths that don't need authentication
  // The root path '/' is the login gateway now
  const isPublicPath = pathname === '/' || 
                       pathname.startsWith('/_next') || 
                       pathname.startsWith('/api') || 
                       pathname.includes('.');

  if (!token && !isPublicPath) {
    // Redirect to login gateway at '/' if token is not present
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (token && pathname === '/') {
    // If authenticated, allow access to root (it will display the dashboard)
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
