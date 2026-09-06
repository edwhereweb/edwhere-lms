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
