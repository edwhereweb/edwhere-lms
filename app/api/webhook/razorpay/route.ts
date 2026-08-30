import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError, handleApiError } from '@/lib/api-utils';

type RazorpayWebhookPayload = {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        error_code?: string;
        error_description?: string;
      };
    };
  };
};

function verifyWebhookSignature(rawBody: string, signature: string, secret: string) {
  const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const expected = Buffer.from(digest, 'hex');
  const received = Buffer.from(signature, 'hex');
  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(expected, received);
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

    if (!signature || !secret) {
      return apiError('Invalid webhook configuration', 400);
    }

    if (!verifyWebhookSignature(rawBody, signature, secret)) {
      return apiError('Invalid webhook signature', 400);
    }

    const body = JSON.parse(rawBody) as RazorpayWebhookPayload;
    const event = body.event;
    const payment = body.payload?.payment?.entity;
    const razorpayOrderId = payment?.order_id;

    if (!event || !razorpayOrderId) {
      return NextResponse.json({ received: true });
    }

    const existingOrder = await db.courseOrder.findUnique({
      where: { razorpayOrderId }
    });

    if (!existingOrder) {
      return NextResponse.json({ received: true });
    }

    if (event === 'payment.captured') {
      await db.$transaction(async (tx) => {
        const latest = await tx.courseOrder.findUnique({
          where: { razorpayOrderId }
        });

        if (!latest) return;
        if (latest.status === 'PAID' && latest.razorpayPaymentId === payment?.id) return;
        if (latest.status === 'PAID' && latest.razorpayPaymentId !== payment?.id) return;

        await tx.courseOrder.update({
          where: { id: latest.id },
          data: {
            status: 'PAID',
            razorpayPaymentId: payment?.id ?? latest.razorpayPaymentId,
            failureCode: null,
            failureDescription: null
          }
        });

        await tx.purchase.upsert({
          where: {
            userId_courseId: {
              userId: latest.userId,
              courseId: latest.courseId
            }
          },
          update: {},
          create: {
            userId: latest.userId,
            courseId: latest.courseId,
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
                discountAmount: latest.discountAmountInPaise ?? 0
              }
            });
          }
        }
      });
    }

    if (event === 'payment.failed' && existingOrder.status !== 'PAID') {
      await db.courseOrder.update({
        where: { id: existingOrder.id },
        data: {
          status: 'FAILED',
          failureCode: payment?.error_code ?? null,
          failureDescription: payment?.error_description ?? 'Payment failed'
        }
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return handleApiError('RAZORPAY_WEBHOOK', error);
  }
}
