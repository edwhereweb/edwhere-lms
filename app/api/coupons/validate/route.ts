import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { validateCouponSchema } from '@/lib/validations';
import { validateCouponForCourse } from '@/lib/coupons';
import { isRateLimited } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    const rateLimitKey = userId
      ? `coupon-validate:${userId}`
      : `coupon-validate:guest:${req.headers.get('x-forwarded-for') ?? 'anon'}`;

    if (isRateLimited(rateLimitKey, { maxRequests: 20, windowMs: 60_000 })) {
      return apiError('Too many requests', 429);
    }

    const body = await req.json();
    const validation = validateBody(validateCouponSchema, body);
    if (!validation.success) return validation.response;

    const { courseId, couponCode } = validation.data;

    const course = await db.course.findUnique({
      where: { id: courseId, isPublished: true },
      select: { price: true }
    });

    if (!course) return apiError('Course not found', 404);
    if (!course.price || course.price <= 0) return apiError('Invalid course price', 400);

    const originalAmountInPaise = Math.round(course.price * 100);
    const result = await validateCouponForCourse({
      code: couponCode,
      courseId,
      userId: userId ?? '',
      originalAmountInPaise
    });

    if (!result.valid) {
      return NextResponse.json(
        { valid: false, reason: result.reason, message: result.message },
        { status: 200 }
      );
    }

    return NextResponse.json({
      valid: true,
      code: result.coupon.code,
      type: result.coupon.type,
      value: result.coupon.value,
      originalPrice: result.originalAmountInPaise / 100,
      discountAmount: result.discountAmountInPaise / 100,
      finalPrice: result.finalAmountInPaise / 100,
      message: `Coupon "${result.coupon.code}" applied.`
    });
  } catch (error) {
    return handleApiError('COUPON_VALIDATE', error);
  }
}
