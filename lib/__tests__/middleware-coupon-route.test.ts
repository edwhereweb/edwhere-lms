process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY =
  'pk_test_ZmFrZS1kb21haW4tMTIzLmNsZXJrLmFjY291bnRzLmRldiQ';
process.env.CLERK_SECRET_KEY = 'sk_test_fakefakefakefakefakefakefakefakefakefake';

import { NextRequest } from 'next/server';
import { isPublicRoute } from '../../middleware';

function req(path: string) {
  return new NextRequest(`https://example.com${path}`);
}

describe('middleware isPublicRoute', () => {
  // Guests browsing a public course page must be able to validate a coupon
  // before signing in — see app/(public)/courses/[courseId]/_components/course-buy-section.tsx.
  // If this route isn't public, Clerk's auth.protect() blocks the request
  // before it reaches app/api/coupons/validate/route.ts, and every coupon
  // (valid or not) appears to fail client-side.
  it('allows guest access to the coupon validate API route', () => {
    expect(isPublicRoute(req('/api/coupons/validate'))).toBe(true);
  });

  it('still allows guest access to public course pages', () => {
    expect(isPublicRoute(req('/courses/some-course'))).toBe(true);
  });

  it('does not mark unrelated authenticated-only API routes as public', () => {
    expect(isPublicRoute(req('/api/admin/coupons'))).toBe(false);
  });
});
