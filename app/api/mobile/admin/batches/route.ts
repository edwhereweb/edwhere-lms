import { auth } from '@clerk/nextjs/server';
import {
  mobileError,
  validateMobileBody,
  handleMobileApiError,
  mobileSuccess,
  mobileCreated
} from '@/lib/api-mobile-utils';
import { canManageBatch } from '@/lib/batch-auth';
import { currentProfile } from '@/lib/current-profile';
import { createBatch } from '@/lib/services/batch-service';
import { getBatches } from '@/actions/get-batches';
import { createBatchSchema } from '@/lib/validations';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const profile = await currentProfile();
    if (!profile || (profile.role !== 'ADMIN' && profile.role !== 'TEACHER')) {
      return mobileError('FORBIDDEN', 'Forbidden', 403);
    }

    const batches = await getBatches(userId, profile.role);
    return mobileSuccess(batches);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_BATCHES_LIST', error);
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const allowed = await canManageBatch(userId);
    if (!allowed) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const body = await req.json();
    const result = validateMobileBody(createBatchSchema, body);
    if (!result.success) return result.response;

    const batch = await createBatch(userId, result.data);

    return mobileCreated(batch);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_BATCHES_CREATE', error);
  }
}
