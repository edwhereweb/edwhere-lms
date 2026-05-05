import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { completeSessionSchema } from '@/lib/validations';
import { canManageBatch } from '@/lib/batch-auth';
import { db } from '@/lib/db';

type Params = { params: Promise<{ itemId: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const allowed = await canManageBatch(userId);
    if (!allowed) return apiError('Forbidden', 403);

    const { itemId } = await params;
    const session = await db.offlineSession.findUnique({ where: { itemId } });
    if (!session) return apiError('Session not found', 404);
    if (session.completedAt) return apiError('Session already marked as complete', 409);

    const body = await req.json();
    const validation = validateBody(completeSessionSchema, body);
    if (!validation.success) return validation.response;

    const completedAt = validation.data.completedAt
      ? new Date(validation.data.completedAt)
      : new Date();

    const updated = await db.offlineSession.update({
      where: { itemId },
      data: { completedAt }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError('COMPLETE_SESSION', error);
  }
}
