import { auth } from '@clerk/nextjs/server';
import {
  mobileError,
  validateMobileBody,
  handleMobileApiError,
  mobileSuccess
} from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';
import { hasBatchAccess } from '@/lib/batch-auth';
import { currentProfile } from '@/lib/current-profile';
import { getBatchDetail, getBatchContent } from '@/actions/get-batches';
import { updateBatchSchema } from '@/lib/validations';

type Params = { params: Promise<{ batchId: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { batchId } = await params;

    const profile = await currentProfile();
    if (!profile || (profile.role !== 'ADMIN' && profile.role !== 'TEACHER')) {
      return mobileError('FORBIDDEN', 'Forbidden', 403);
    }

    const [detail, content] = await Promise.all([
      getBatchDetail(batchId, userId, profile.role),
      getBatchContent(batchId, userId, profile.role)
    ]);

    if (!detail) return mobileError('NOT_FOUND', 'Batch not found', 404);

    return mobileSuccess({ ...detail, modules: content ?? [] });
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_BATCH_GET', error);
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { batchId } = await params;

    const hasAccess = await hasBatchAccess(batchId, userId);
    if (!hasAccess) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const body = await req.json();
    const result = validateMobileBody(updateBatchSchema, body);
    if (!result.success) return result.response;

    const updateData: Record<string, unknown> = {};
    if (result.data.title !== undefined) updateData.title = result.data.title;
    if (result.data.description !== undefined) updateData.description = result.data.description;
    if (result.data.startDate !== undefined)
      updateData.startDate = result.data.startDate ? new Date(result.data.startDate) : null;
    if (result.data.endDate !== undefined)
      updateData.endDate = result.data.endDate ? new Date(result.data.endDate) : null;
    if (result.data.allowSameDayOfflineSession !== undefined)
      updateData.allowSameDayOfflineSession = result.data.allowSameDayOfflineSession;

    const batch = await db.batch.update({
      where: { id: batchId },
      data: updateData
    });

    return mobileSuccess(batch);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_BATCH_UPDATE', error);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { batchId } = await params;

    const profile = await currentProfile();
    if (!profile || profile.role !== 'ADMIN') {
      return mobileError('FORBIDDEN', 'Forbidden', 403);
    }

    await db.batch.delete({ where: { id: batchId } });

    return mobileSuccess({ success: true });
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_BATCH_DELETE', error);
  }
}
