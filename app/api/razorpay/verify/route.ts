import { db } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { razorpayVerifySchema } from '@/lib/validations';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { getRazorpay } from '@/lib/razorpay';

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user || !user.id) {
      return apiError('Unauthorized', 401);
    }

    const body = await req.json();
    const validation = validateBody(razorpayVerifySchema, body);
    if (!validation.success) return validation.response;

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, courseId } =
      validation.data;

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return apiError('Payment configuration error', 500);
    }

    // Step 1: Verify HMAC signature to confirm this payment is genuine.
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (
      !crypto.timingSafeEqual(
        Uint8Array.from(Buffer.from(generatedSignature, 'hex')),
        Uint8Array.from(Buffer.from(razorpay_signature, 'hex'))
      )
    ) {
      return apiError('Invalid payment signature', 400);
    }

    // Step 2: Fetch the order from Razorpay to get the authoritative courseId and
    // userId that were embedded server-side at checkout. This prevents an attacker
    // from paying for a cheap course and supplying a different courseId here.
    const order = await getRazorpay().orders.fetch(razorpay_order_id);
    const notes = order.notes as Record<string, string> | undefined;
    const authoritativeCourseId = notes?.courseId;
    const authoritativeUserId = notes?.userId;

    if (!authoritativeCourseId || !authoritativeUserId) {
      return apiError('Order metadata missing', 400);
    }

    // The client-supplied courseId must match what was recorded on the order.
    if (authoritativeCourseId !== courseId) {
      return apiError('Payment does not match this course', 400);
    }

    // The order must belong to the currently authenticated user.
    if (authoritativeUserId !== user.id) {
      return apiError('Payment does not belong to this account', 400);
    }

    // Step 3: Cross-check the paid amount against the current course price so a
    // price change between checkout and verify cannot be exploited (defence-in-depth).
    const course = await db.course.findUnique({
      where: { id: authoritativeCourseId },
      select: { price: true }
    });

    if (!course || !course.price) {
      return apiError('Course not found', 404);
    }

    const expectedAmountInPaise = Math.round(course.price * 100);
    if (Number(order.amount) !== expectedAmountInPaise) {
      return apiError('Payment amount does not match course price', 400);
    }

    const existingPurchase = await db.purchase.findUnique({
      where: {
        userId_courseId: { userId: user.id, courseId: authoritativeCourseId }
      }
    });

    if (existingPurchase) {
      return NextResponse.json({ success: true });
    }

    const onboardingData: Record<string, string> = {
      onboardingSource: 'PAID'
    };
    await db.purchase.create({
      data: { courseId: authoritativeCourseId, userId: user.id, ...onboardingData }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError('RAZORPAY_VERIFY', error);
  }
}
