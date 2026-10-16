import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { apiError, handleApiError } from '@/lib/api-utils';
import { backfillMissingSyncRecords, reconcileEnrollmentSync } from '@/lib/crm-enrollment-sync';

function isAuthorized(request: Request): boolean {
  const secrets = [process.env.CRM_SYNC_SECRET, process.env.CRON_SECRET].filter(
    (s): s is string => Boolean(s) && (s as string).length >= 16
  );
  const header = request.headers.get('authorization') ?? '';
  const provided = Buffer.from(header);
  return secrets.some((secret) => {
    const expected = Buffer.from(`Bearer ${secret}`);
    return expected.length === provided.length && timingSafeEqual(expected, provided);
  });
}

async function handle(request: Request) {
  try {
    if (!isAuthorized(request)) return apiError('Unauthorized', 401);

    const params = new URL(request.url).searchParams;
    const dryRun = params.get('dryRun') === '1' || params.get('dryRun') === 'true';
    const resetExhausted = params.get('resetExhausted') === '1';
    const mode = params.get('mode') ?? 'reconcile';

    if (mode === 'backfill') {
      return NextResponse.json(await backfillMissingSyncRecords({ dryRun }));
    }
    if (mode !== 'reconcile') return apiError('Invalid mode', 400);

    return NextResponse.json(await reconcileEnrollmentSync({ dryRun, resetExhausted }));
  } catch (error) {
    return handleApiError('CRM_ENROLLMENT_SYNC_CRON', error);
  }
}

export const GET = handle;
export const POST = handle;
