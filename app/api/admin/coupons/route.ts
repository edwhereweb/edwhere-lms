import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { createCouponSchema } from '@/lib/validations';
import { normalizeCouponCode } from '@/lib/coupons';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await db.profile.findUnique({ where: { userId } });
    if (!profile || profile.role !== 'ADMIN') {
      return apiError('Forbidden — only admins can manage coupons', 403);
    }

    const coupons = await db.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { redemptions: true } } }
    });

    return NextResponse.json(coupons);
  } catch (error) {
    return handleApiError('ADMIN_COUPONS_GET', error);
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await db.profile.findUnique({ where: { userId } });
    if (!profile || profile.role !== 'ADMIN') {
      return apiError('Forbidden — only admins can manage coupons', 403);
    }

    const body = await req.json();
    const validation = validateBody(createCouponSchema, body);
    if (!validation.success) return validation.response;

    const data = validation.data;
    const code = normalizeCouponCode(data.code);

    const existing = await db.coupon.findUnique({ where: { code } });
    if (existing) {
      return apiError('A coupon with this code already exists', 409);
    }

    const coupon = await db.coupon.create({
      data: {
        code,
        type: data.type,
        value: data.value,
        currency: data.currency ?? 'INR',
        isActive: data.isActive ?? true,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        maxRedemptions: data.maxRedemptions ?? null,
        maxRedemptionsPerUser: data.maxRedemptionsPerUser ?? null,
        applicableCourseIds: data.applicableCourseIds ?? [],
        createdByUserId: userId
      }
    });

    return NextResponse.json(coupon, { status: 201 });
  } catch (error) {
    return handleApiError('ADMIN_COUPONS_POST', error);
  }
}
