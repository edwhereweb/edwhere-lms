import { db } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { razorpayVerifySchema } from '@/lib/validations';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';

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

    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (
      !crypto.timingSafeEqual(
        Buffer.from(generatedSignature, 'hex'),
        Buffer.from(razorpay_signature, 'hex')
      )
    ) {
      return apiError('Invalid payment signature', 400);
    }

    const existingPurchase = await db.purchase.findUnique({
      where: {
        userId_courseId: { userId: user.id, courseId }
      }
    });

    if (existingPurchase) {
      return NextResponse.json({ success: true });
    }

    await db.purchase.create({
      data: { courseId, userId: user.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError('RAZORPAY_VERIFY', error);
  }
}
