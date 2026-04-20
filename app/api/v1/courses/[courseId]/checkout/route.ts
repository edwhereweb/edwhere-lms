import { db } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';
import { getRazorpay } from '@/lib/razorpay';
import { apiOk, apiErr, handleRouteError } from '@/lib/api-response';

export async function POST(_req: Request, { params }: { params: { courseId: string } }) {
  try {
    const user = await currentUser();
    if (!user || !user.id || !user.emailAddresses?.[0]?.emailAddress) {
      return apiErr('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const [course, existingPurchase] = await Promise.all([
      db.course.findUnique({
        where: { id: params.courseId, isPublished: true }
      }),
      db.purchase.findUnique({
        where: {
          userId_courseId: { userId: user.id, courseId: params.courseId }
        }
      })
    ]);

    if (!course) {
      return apiErr('NOT_FOUND', 'Course not found', 404);
    }

    if (!course.price || course.price <= 0) {
      return apiErr('VALIDATION', 'Invalid course price', 400);
    }

    if (existingPurchase) {
      return apiErr('VALIDATION', 'Already purchased', 400);
    }

    const amountInPaise = Math.round(course.price * 100);
    const receipt = `${params.courseId.slice(-16)}_${Date.now().toString(36)}`;

    const order = await getRazorpay().orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt,
      notes: {
        courseId: params.courseId,
        userId: user.id
      }
    });

    return apiOk({
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
    return handleRouteError('CHECKOUT', error);
  }
}
