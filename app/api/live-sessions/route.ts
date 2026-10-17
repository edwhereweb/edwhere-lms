import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { createLiveSessionSchema } from '@/lib/validations';
import { createLiveSession } from '@/lib/live-sessions/create-live-session';
import { LiveSessionError } from '@/lib/live-sessions/errors';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const body = await req.json();
    const validation = validateBody(createLiveSessionSchema, body);
    if (!validation.success) return validation.response;

    const session = await createLiveSession(userId, validation.data);
    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    if (error instanceof LiveSessionError) return apiError(error.message, error.status);
    return handleApiError('LIVE_SESSIONS_CREATE', error);
  }
}
