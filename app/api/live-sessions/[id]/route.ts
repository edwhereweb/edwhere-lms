import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { liveSessionIdParamSchema } from '@/lib/validations';
import { deleteLiveSession } from '@/lib/live-sessions/delete-live-session';
import { LiveSessionError } from '@/lib/live-sessions/errors';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const ids = validateBody(liveSessionIdParamSchema, params);
    if (!ids.success) return ids.response;

    const deleted = await deleteLiveSession(userId, ids.data.id);
    return NextResponse.json(deleted);
  } catch (error) {
    if (error instanceof LiveSessionError) return apiError(error.message, error.status);
    return handleApiError('LIVE_SESSIONS_DELETE', error);
  }
}
