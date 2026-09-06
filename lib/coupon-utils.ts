import type { Coupon } from '@prisma/client';

const DEFAULT_APP_URL = 'https://learn.edwhere.com';

// Query param carrying a Meta Ads (or other campaign) coupon token, e.g.
// an ad destination URL like `/courses/aws-101?ct=META_AWS_50`. Shared by
// the middleware (which captures it into a signed cookie) and by anything
// that needs to build/display a promo landing URL for a coupon.
export const CAMPAIGN_TOKEN_PARAM = 'ct';

/**
 * Builds the canonical, absolute landing URL for a coupon's campaign
 * token — the single source of truth for this URL shape so admin UI and
 * any future callers never duplicate the construction logic. Links to a
 * specific course when one is provided, otherwise falls back to the
 * course catalog.
 */
export function buildCouponLandingUrl({
  campaignToken,
  courseId,
  baseUrl
}: {
  campaignToken: string;
  courseId?: string | null;
  baseUrl?: string;
}): string {
  const origin = (baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_APP_URL).replace(
    /\/+$/,
    ''
  );
  const path = courseId ? `/courses/${courseId}` : '/courses';
  const params = new URLSearchParams({ [CAMPAIGN_TOKEN_PARAM]: campaignToken });
  return `${origin}${path}?${params.toString()}`;
}

/** Case-insensitive coupon codes are normalized to uppercase everywhere. */
export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Computes the discount (in paise) for a coupon against a base price.
 * The discount is always clamped so the payable amount never goes below 0.
 */
export function calculateDiscountInPaise(
  coupon: Pick<Coupon, 'type' | 'value'>,
  originalAmountInPaise: number
): number {
  const rawDiscount =
    coupon.type === 'PERCENT'
      ? Math.round((originalAmountInPaise * coupon.value) / 100)
      : Math.round(coupon.value * 100);

  return Math.max(0, Math.min(rawDiscount, originalAmountInPaise));
}

export type CouponStatus = 'active' | 'inactive' | 'scheduled' | 'expired';

/** Derives a human/UI friendly status for a coupon at a point in time. */
export function getCouponStatus(
  coupon: Pick<Coupon, 'isActive' | 'startsAt' | 'expiresAt'>,
  now: Date = new Date()
): CouponStatus {
  if (!coupon.isActive) return 'inactive';
  if (coupon.expiresAt && now > coupon.expiresAt) return 'expired';
  if (coupon.startsAt && now < coupon.startsAt) return 'scheduled';
  return 'active';
}
