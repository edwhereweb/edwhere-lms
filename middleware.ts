import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import {
  CAMPAIGN_COOKIE_NAME,
  buildCampaignCookieValue,
  getCampaignCookieMaxAgeSeconds,
  isValidCampaignToken
} from '@/lib/campaign-cookie';
import { CAMPAIGN_TOKEN_PARAM } from '@/lib/coupon-utils';

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
  '/api/analytics(.*)',
  '/blog(.*)',
  '/pages(.*)',
  '/verify-certificate(.*)',
  '/api/certificates/verify',
  '/api/mobile/meta/(.*)',
  '/delete-account',
  '/api/mobile/placement/companies',
  '/api/mobile/placement/companies/(.*)',
  '/api/mobile/placement/jobs',
  '/api/mobile/placement/jobs/(.*)'
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

  // First-touch campaign token capture: only ever store the opaque token in
  // a signed cookie here — never resolve it to a coupon/discount at the
  // Edge. Actual coupon resolution + validation always happens server-side
  // in Node.js route handlers (see lib/coupons.ts#resolveCampaignCouponCode)
  // so a forged token can never grant a discount.
  if (req.method === 'GET') {
    const token = req.nextUrl.searchParams.get(CAMPAIGN_TOKEN_PARAM);
    if (isValidCampaignToken(token)) {
      const response = NextResponse.next();
      response.cookies.set(CAMPAIGN_COOKIE_NAME, await buildCampaignCookieValue(token), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: getCampaignCookieMaxAgeSeconds()
      });
      return response;
    }
  }
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images/|.*\\.(?:png|jpg|jpeg|gif|ico|svg|webp)$).*)',
    '/api/:path*'
  ]
};
