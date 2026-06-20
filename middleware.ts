import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/contact',
  '/courses(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhook(.*)',
  '/api/files(.*)',
  '/api/contact',
  '/api/health',
  '/api/public(.*)',
  '/blog(.*)',
  '/pages(.*)',
  '/verify-certificate(.*)',
  '/api/certificates/verify',
  '/api/mobile/meta/(.*)',
  '/delete-account'
]);

const MOBILE_CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-App-Version',
  'Access-Control-Max-Age': '86400'
};

export default clerkMiddleware(async (auth, req) => {
  if (req.method === 'OPTIONS' && req.nextUrl.pathname.startsWith('/api/mobile/')) {
    return new NextResponse(null, { status: 204, headers: MOBILE_CORS_HEADERS });
  }

  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images/|.*\\.(?:png|jpg|jpeg|gif|ico|svg|webp)$).*)',
    '/api/:path*'
  ]
};
