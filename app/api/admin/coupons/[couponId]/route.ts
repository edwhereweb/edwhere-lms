import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { updateCouponSchema } from '@/lib/validations';
import { normalizeCouponCode } from '@/lib/coupons';

async function isAdmin(userId: string) {
  const profile = await db.profile.findUnique({ where: { userId } });
  return profile?.role === 'ADMIN';
}

export async function PATCH(req: Request, { params }: { params: { couponId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    if (!(await isAdmin(userId))) {
      return apiError('Forbidden — only admins can manage coupons', 403);
    }

    const existing = await db.coupon.findUnique({ where: { id: params.couponId } });
    if (!existing) return apiError('Coupon not found', 404);

    const body = await req.json();
    const validation = validateBody(updateCouponSchema, body);
    if (!validation.success) return validation.response;
    const data = validation.data;

    let code: string | undefined;
    if (data.code) {
      code = normalizeCouponCode(data.code);
      const conflict = await db.coupon.findUnique({ where: { code } });
      if (conflict && conflict.id !== params.couponId) {
        return apiError('A coupon with this code already exists', 409);
      }
    }

    const coupon = await db.coupon.update({
      where: { id: params.couponId },
      data: {
        ...(code ? { code } : {}),
        ...(data.type ? { type: data.type } : {}),
        ...(data.value !== undefined ? { value: data.value } : {}),
        ...(data.currency ? { currency: data.currency } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.startsAt !== undefined
          ? { startsAt: data.startsAt ? new Date(data.startsAt) : null }
          : {}),
        ...(data.expiresAt !== undefined
          ? { expiresAt: data.expiresAt ? new Date(data.expiresAt) : null }
          : {}),
        ...(data.maxRedemptions !== undefined ? { maxRedemptions: data.maxRedemptions } : {}),
        ...(data.maxRedemptionsPerUser !== undefined
          ? { maxRedemptionsPerUser: data.maxRedemptionsPerUser }
          : {}),
        ...(data.applicableCourseIds !== undefined
          ? { applicableCourseIds: data.applicableCourseIds }
          : {})
      }
    });

    return NextResponse.json(coupon);
  } catch (error) {
    return handleApiError('ADMIN_COUPON_PATCH', error);
  }
}
