import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { endLiveSessionSchema, liveSessionIdParamSchema } from '@/lib/validations';
import { endLiveSession } from '@/lib/live-sessions/end-live-session';
import { LiveSessionError } from '@/lib/live-sessions/errors';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const ids = validateBody(liveSessionIdParamSchema, params);
    if (!ids.success) return ids.response;

    const text = await req.text();
    const body = validateBody(endLiveSessionSchema, text ? JSON.parse(text) : {});
    if (!body.success) return body.response;

    const session = await endLiveSession(userId, ids.data.id);
    return NextResponse.json(session);
  } catch (error) {
    if (error instanceof LiveSessionError) return apiError(error.message, error.status);
    if (error instanceof SyntaxError) return apiError('Invalid request body', 400);
    return handleApiError('LIVE_SESSIONS_END', error);
  }
}
