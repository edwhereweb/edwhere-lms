import { db } from '@/lib/db';
import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getRazorpay } from '@/lib/razorpay';
import { apiError, handleApiError } from '@/lib/api-utils';
import { isRateLimited } from '@/lib/rate-limit';
import { debug } from '@/lib/debug';

export async function POST(_req: Request, { params }: { params: { courseId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return apiError('Unauthorized', 401);
    }

    if (isRateLimited(`checkout:${userId}`, { maxRequests: 5, windowMs: 60_000 })) {
      return apiError('Too many requests', 429);
    }

    const user = await currentUser();
    if (!user || !user.emailAddresses?.[0]?.emailAddress) {
      return apiError('Unauthorized', 401);
    }

    const [course, existingPurchase] = await Promise.all([
      db.course.findUnique({
        where: { id: params.courseId, isPublished: true }
      }),
      db.purchase.findUnique({
        where: {
          userId_courseId: { userId, courseId: params.courseId }
        }
      })
    ]);

    if (!course) {
      return apiError('Course not found', 404);
    }

    if (!course.price || course.price <= 0) {
      return apiError('Invalid course price', 400);
    }

    if (existingPurchase) {
      return apiError('Already purchased', 400);
    }

    const amountInPaise = Math.round(course.price * 100);
    const receipt = `${params.courseId.slice(-16)}_${Date.now().toString(36)}`;

    await db.courseOrder.updateMany({
      where: {
        userId,
        courseId: params.courseId,
        status: 'PENDING'
      },
      data: {
        status: 'CANCELLED',
        failureDescription: 'Superseded by a newer checkout attempt.'
      }
    });

    const order = await getRazorpay().orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt,
      notes: {
        courseId: params.courseId,
        userId
      }
    });

    const checkoutOrder = await db.courseOrder.create({
      data: {
        userId,
        courseId: params.courseId,
        amountInPaise,
        currency: 'INR',
        razorpayOrderId: order.id,
        status: 'PENDING'
      }
    });

    debug('CHECKOUT_STARTED', {
      userId,
      courseId: params.courseId,
      checkoutOrderId: checkoutOrder.id,
      razorpayOrderId: order.id
    });

    return NextResponse.json({
      checkoutOrderId: checkoutOrder.id,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      courseName: course.title,
      userEmail: user.emailAddresses[0].emailAddress,
      userName:
        `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() ||
        user.emailAddresses[0].emailAddress.split('@')[0]
    });
  } catch (error) {
    return handleApiError('CHECKOUT', error);
  }
}
