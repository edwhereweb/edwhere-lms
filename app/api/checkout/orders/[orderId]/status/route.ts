import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { apiError, handleApiError, validateBody } from '@/lib/api-utils';
import { checkoutOrderStatusSchema } from '@/lib/validations';
import { db } from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: { orderId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const body = await req.json();
    const validation = validateBody(checkoutOrderStatusSchema, body);
    if (!validation.success) return validation.response;

    const existing = await db.courseOrder.findUnique({
      where: { id: params.orderId },
      select: { id: true, userId: true, status: true }
    });

    if (!existing) return apiError('Order not found', 404);
    if (existing.userId !== userId) return apiError('Forbidden', 403);
    if (existing.status === 'PAID') return NextResponse.json({ success: true });

    const { status, failureCode, failureDescription } = validation.data;
    await db.courseOrder.update({
      where: { id: existing.id },
      data: {
        status,
        failureCode: failureCode ?? null,
        failureDescription: failureDescription ?? null
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError('CHECKOUT_ORDER_STATUS', error);
  }
}
