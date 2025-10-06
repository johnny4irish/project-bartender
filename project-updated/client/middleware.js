import { NextResponse } from 'next/server';

const publicPaths = ['/', '/login', '/register'];

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const isPublic = publicPaths.includes(pathname) || pathname.startsWith('/_next');
  if (isPublic) return NextResponse.next();

  const token = request.cookies.get('token')?.value;
  if (!token && pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};