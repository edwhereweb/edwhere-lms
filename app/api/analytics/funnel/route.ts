import { auth } from '@clerk/nextjs/server';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError, handleApiError, validateBody } from '@/lib/api-utils';
import { funnelEventSchema } from '@/lib/validations';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = validateBody(funnelEventSchema, body);
    if (!validation.success) return validation.response;

    const { userId } = await auth();
    const payload = validation.data;

    await db.funnelEvent.create({
      data: {
        event: payload.event,
        dedupeKey: payload.dedupeKey,
        userId: userId ?? null,
        courseId: payload.courseId,
        amount: payload.amount ?? null,
        currency: payload.currency ?? null,
        source: payload.source ?? null,
        device: payload.device ?? null,
        checkoutOrderId: payload.checkoutOrderId ?? null,
        paymentOrderId: payload.paymentOrderId ?? null
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ success: true });
    }

    if (error instanceof SyntaxError) {
      return apiError('Invalid request body', 400);
    }

    return handleApiError('FUNNEL_ANALYTICS_EVENT', error);
  }
}
