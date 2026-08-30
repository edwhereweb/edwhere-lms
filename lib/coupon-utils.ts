import type { Coupon } from '@prisma/client';

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
