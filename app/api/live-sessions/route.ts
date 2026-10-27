import { randomUUID } from 'crypto';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { validateBody, apiError } from '@/lib/api-utils';
import { logError } from '@/lib/debug';
import { createLiveSessionSchema } from '@/lib/validations';
import { createLiveSession } from '@/lib/live-sessions/create-live-session';
import { mapLiveSessionCreateError } from '@/lib/live-sessions/error-map';

export async function POST(req: Request) {
  const requestId = randomUUID();
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const body = await req.json();
    const validation = validateBody(createLiveSessionSchema, body);
    if (!validation.success) return validation.response;

    const session = await createLiveSession(userId, validation.data, { requestId });
    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    logError(`LIVE_SESSIONS_CREATE requestId=${requestId}`, error);
    const { code, message, status } = mapLiveSessionCreateError(error);
    return NextResponse.json({ error: message, code, requestId }, { status });
  }
}
