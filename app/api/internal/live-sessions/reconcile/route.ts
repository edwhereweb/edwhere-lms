import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { reconcileLiveSessionsSchema } from '@/lib/validations';
import { reconcileDueSessions } from '@/lib/live-sessions/reconcile-artifacts';

// Not behind Clerk: callers are the Vercel cron / internal triggers, authenticated by shared secret.
function isAuthorized(req: Request): boolean {
  const secrets = [process.env.GOOGLE_MEET_INTERNAL_SECRET, process.env.CRON_SECRET].filter(
    (s): s is string => !!s && s.length >= 16
  );
  const header = req.headers.get('authorization') ?? '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
  const provided = Buffer.from(req.headers.get('x-internal-secret') ?? bearer);
  return secrets.some((secret) => {
    const expected = Buffer.from(secret);
    return expected.length === provided.length && timingSafeEqual(expected, provided);
  });
}

async function handle(req: Request) {
  try {
    if (!isAuthorized(req)) return apiError('Unauthorized', 401);

    const text = req.method === 'POST' ? await req.text() : '';
    const validation = validateBody(reconcileLiveSessionsSchema, text ? JSON.parse(text) : {});
    if (!validation.success) return validation.response;

    return NextResponse.json(await reconcileDueSessions(validation.data));
  } catch (error) {
    if (error instanceof SyntaxError) return apiError('Invalid request body', 400);
    return handleApiError('LIVE_SESSIONS_RECONCILE', error);
  }
}

export const POST = handle;
export const GET = handle;
