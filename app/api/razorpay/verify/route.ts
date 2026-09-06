import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { razorpayVerifySchema } from '@/lib/validations';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { getRazorpay } from '@/lib/razorpay';
import { isRateLimited } from '@/lib/rate-limit';
import { debug } from '@/lib/debug';
import { sendCapiEvent } from '@/lib/meta-tracking';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return apiError('Unauthorized', 401);
    }

    if (isRateLimited(`razorpay-verify:${userId}`, { maxRequests: 10, windowMs: 60_000 })) {
      return apiError('Too many requests', 429);
    }

    const body = await req.json();
    const validation = validateBody(razorpayVerifySchema, body);
    if (!validation.success) return validation.response;

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = validation.data;

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return apiError('Payment configuration error', 500);
    }

    // Step 1: Verify HMAC signature to confirm this payment is genuine.
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    const expected = Buffer.from(generatedSignature, 'hex');
    const received = Buffer.from(razorpay_signature, 'hex');

    if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
      return apiError('Invalid payment signature', 400);
    }

    const checkoutOrder = await db.courseOrder.findUnique({
      where: { razorpayOrderId: razorpay_order_id }
    });

    if (!checkoutOrder) {
      return apiError('Checkout order not found', 404);
    }

    if (checkoutOrder.userId !== userId) {
      return apiError('Payment does not belong to this account', 400);
    }

    if (
      checkoutOrder.status === 'PAID' &&
      checkoutOrder.razorpayPaymentId === razorpay_payment_id
    ) {
      return NextResponse.json({ success: true });
    }

    if (
      checkoutOrder.status === 'PAID' &&
      checkoutOrder.razorpayPaymentId !== razorpay_payment_id
    ) {
      return apiError('Order already paid', 409);
    }

    // Step 2: Fetch the order from Razorpay to get authoritative metadata.
    const order = await getRazorpay().orders.fetch(razorpay_order_id);
    const notes = order.notes as Record<string, string> | undefined;
    const authoritativeCourseId = notes?.courseId;
    const authoritativeUserId = notes?.userId;

    if (!authoritativeCourseId || !authoritativeUserId) {
      return apiError('Order metadata missing', 400);
    }

    if (authoritativeUserId !== userId) {
      return apiError('Payment does not belong to this account', 400);
    }

    if (authoritativeCourseId !== checkoutOrder.courseId) {
      return apiError('Payment does not match checkout context', 400);
    }

    // Step 3: Cross-check the paid amount.
    const course = await db.course.findUnique({
      where: { id: authoritativeCourseId },
      select: { price: true, title: true }
    });

    if (!course || !course.price) {
      return apiError('Course not found', 404);
    }

    const originalAmountInPaise = Math.round(course.price * 100);
    const discountAmountInPaise = checkoutOrder.discountAmountInPaise ?? 0;
    const expectedAmountInPaise = Math.max(0, originalAmountInPaise - discountAmountInPaise);
    if (Number(order.amount) !== expectedAmountInPaise) {
      return apiError('Payment amount does not match course price', 400);
    }

    await db.$transaction(async (tx) => {
      const latest = await tx.courseOrder.findUnique({
        where: { razorpayOrderId: razorpay_order_id }
      });

      if (!latest) return;
      if (latest.status === 'PAID' && latest.razorpayPaymentId === razorpay_payment_id) {
        return;
      }
      if (latest.status === 'PAID' && latest.razorpayPaymentId !== razorpay_payment_id) {
        throw new Error('Order already paid with another payment id');
      }

      await tx.courseOrder.update({
        where: { id: latest.id },
        data: {
          status: 'PAID',
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          failureCode: null,
          failureDescription: null
        }
      });

      await tx.purchase.upsert({
        where: {
          userId_courseId: {
            userId,
            courseId: authoritativeCourseId
          }
        },
        update: {},
        create: {
          userId,
          courseId: authoritativeCourseId,
          onboardingSource: 'PAID'
        }
      });

      if (latest.couponId) {
        const existingRedemption = await tx.couponRedemption.findFirst({
          where: { courseOrderId: latest.id }
        });

        if (!existingRedemption) {
          await tx.couponRedemption.create({
            data: {
              couponId: latest.couponId,
              userId: latest.userId,
              courseId: latest.courseId,
              courseOrderId: latest.id,
              discountAmount: latest.discountAmountInPaise ?? 0,
              source: latest.couponSource ?? null
            }
          });
        }
      }
    });

    // Authoritative Purchase CAPI conversion tracking
    void (async () => {
      try {
        const userProfile = await db.profile.findUnique({
          where: { userId },
          select: { email: true, name: true }
        });

        await sendCapiEvent({
          eventName: 'Purchase',
          eventId: `purchase_${razorpay_order_id}`,
          userData: {
            email: userProfile?.email,
            externalId: userId,
            firstName: userProfile?.name?.split(' ')[0],
            lastName: userProfile?.name?.split(' ').slice(1).join(' ')
          },
          customData: {
            content_ids: [authoritativeCourseId],
            content_name: course.title,
            content_type: 'product',
            value: expectedAmountInPaise / 100,
            currency: 'INR',
            order_id: razorpay_order_id,
            num_items: 1
          }
        });
      } catch {
        // Safe fail-silent: never block payment verification response
      }
    })();

    debug('PAYMENT_SUCCESS', {
      userId,
      courseId: authoritativeCourseId,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError('RAZORPAY_VERIFY', error);
  }
}
