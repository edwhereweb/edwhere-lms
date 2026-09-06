import type { Coupon } from '@prisma/client';
import { db } from '@/lib/db';
import { calculateDiscountInPaise, normalizeCouponCode } from '@/lib/coupon-utils';

export { normalizeCouponCode, calculateDiscountInPaise, getCouponStatus } from '@/lib/coupon-utils';
export type { CouponStatus } from '@/lib/coupon-utils';

export type CouponInvalidReason =
  | 'NOT_FOUND'
  | 'INACTIVE'
  | 'NOT_STARTED'
  | 'EXPIRED'
  | 'NOT_APPLICABLE'
  | 'GLOBAL_LIMIT_REACHED'
  | 'USER_LIMIT_REACHED';

export type CouponValidationResult =
  | {
      valid: true;
      coupon: Coupon;
      originalAmountInPaise: number;
      discountAmountInPaise: number;
      finalAmountInPaise: number;
    }
  | {
      valid: false;
      reason: CouponInvalidReason;
      message: string;
    };

/**
 * Resolves a Meta Ads campaign token (captured via the signed
 * `edwhere_campaign` cookie, see `lib/campaign-cookie.ts`) to the coupon
 * code it maps to. Only returns a code for coupons explicitly flagged
 * `autoApply: true` — campaign tokens must never silently unlock coupons
 * that were only meant for manual entry. The returned code still goes
 * through the exact same `validateCouponForCourse` checks as a manually
 * typed coupon before it can affect a price.
 */
export async function resolveCampaignCouponCode(token: string): Promise<string | null> {
  const coupon = await db.coupon.findUnique({ where: { campaignToken: token } });
  if (!coupon || !coupon.autoApply) return null;
  return coupon.code;
}

/**
 * Re-validates a coupon server-side against a specific course/user context.
 * Must be called both for checkout preview and again at order creation —
 * never trust a client-supplied discount amount.
 */
export async function validateCouponForCourse({
  code,
  courseId,
  userId,
  originalAmountInPaise
}: {
  code: string;
  courseId: string;
  userId: string;
  originalAmountInPaise: number;
}): Promise<CouponValidationResult> {
  const normalizedCode = normalizeCouponCode(code);

  const coupon = await db.coupon.findUnique({ where: { code: normalizedCode } });

  if (!coupon) {
    return { valid: false, reason: 'NOT_FOUND', message: 'Coupon code not found.' };
  }

  const now = new Date();

  if (!coupon.isActive) {
    return { valid: false, reason: 'INACTIVE', message: 'This coupon is no longer active.' };
  }

  if (coupon.startsAt && now < coupon.startsAt) {
    return { valid: false, reason: 'NOT_STARTED', message: 'This coupon is not active yet.' };
  }

  if (coupon.expiresAt && now > coupon.expiresAt) {
    return { valid: false, reason: 'EXPIRED', message: 'This coupon has expired.' };
  }

  if (coupon.applicableCourseIds.length > 0 && !coupon.applicableCourseIds.includes(courseId)) {
    return {
      valid: false,
      reason: 'NOT_APPLICABLE',
      message: 'This coupon is not applicable to this course.'
    };
  }

  if (typeof coupon.maxRedemptions === 'number') {
    const totalRedemptions = await db.couponRedemption.count({ where: { couponId: coupon.id } });
    if (totalRedemptions >= coupon.maxRedemptions) {
      return {
        valid: false,
        reason: 'GLOBAL_LIMIT_REACHED',
        message: 'This coupon has reached its usage limit.'
      };
    }
  }

  if (typeof coupon.maxRedemptionsPerUser === 'number') {
    const userRedemptions = await db.couponRedemption.count({
      where: { couponId: coupon.id, userId }
    });
    if (userRedemptions >= coupon.maxRedemptionsPerUser) {
      return {
        valid: false,
        reason: 'USER_LIMIT_REACHED',
        message: 'You have already used this coupon the maximum number of times.'
      };
    }
  }

  const discountAmountInPaise = calculateDiscountInPaise(coupon, originalAmountInPaise);
  const finalAmountInPaise = Math.max(0, originalAmountInPaise - discountAmountInPaise);

  return {
    valid: true,
    coupon,
    originalAmountInPaise,
    discountAmountInPaise,
    finalAmountInPaise
  };
}

export type CouponPreviewResult =
  | {
      status: 'applied';
      code: string;
      type: 'PERCENT' | 'FIXED';
      value: number;
      originalPrice: number;
      discountAmount: number;
      finalPrice: number;
      message: string;
      isAutoApplied?: boolean;
    }
  | {
      status: 'invalid';
      message: string;
    }
  | null;

/**
 * Server-side helper to resolve initial coupon preview for course or checkout page.
 * Checks explicit coupon code from URL or campaign token/cookie.
 */
export async function resolveCouponPreviewForCourse({
  courseId,
  originalPriceInRupees,
  couponCode,
  campaignToken,
  campaignCookieToken,
  userId = ''
}: {
  courseId: string;
  originalPriceInRupees: number;
  couponCode?: string | null;
  campaignToken?: string | null;
  campaignCookieToken?: string | null;
  userId?: string;
}): Promise<CouponPreviewResult> {
  const originalAmountInPaise = Math.round(originalPriceInRupees * 100);

  // 1. Explicit coupon code from URL / input
  const explicitCode = couponCode?.trim();
  if (explicitCode) {
    const result = await validateCouponForCourse({
      code: explicitCode,
      courseId,
      userId,
      originalAmountInPaise
    });

    if (result.valid) {
      return {
        status: 'applied',
        code: result.coupon.code,
        type: result.coupon.type,
        value: result.coupon.value,
        originalPrice: result.originalAmountInPaise / 100,
        discountAmount: result.discountAmountInPaise / 100,
        finalPrice: result.finalAmountInPaise / 100,
        message: `Coupon "${result.coupon.code}" applied.`
      };
    } else {
      return { status: 'invalid', message: result.message };
    }
  }

  // 2. Campaign token (from query param or cookie)
  const token = campaignToken?.trim() ?? campaignCookieToken?.trim();
  if (token) {
    const autoCode = await resolveCampaignCouponCode(token);
    if (autoCode) {
      const result = await validateCouponForCourse({
        code: autoCode,
        courseId,
        userId,
        originalAmountInPaise
      });

      if (result.valid) {
        return {
          status: 'applied',
          code: result.coupon.code,
          type: result.coupon.type,
          value: result.coupon.value,
          originalPrice: result.originalAmountInPaise / 100,
          discountAmount: result.discountAmountInPaise / 100,
          finalPrice: result.finalAmountInPaise / 100,
          message: `Coupon "${result.coupon.code}" applied automatically.`,
          isAutoApplied: true
        };
      } else {
        return { status: 'invalid', message: result.message };
      }
    }
  }

  return null;
}
