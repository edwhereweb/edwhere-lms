import { auth } from '@clerk/nextjs/server';
import {
  mobileError,
  validateMobileBody,
  handleMobileApiError,
  mobileSuccess
} from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';
import { hasBatchAccess } from '@/lib/batch-auth';
import { updateBatchItemSchema } from '@/lib/validations';

type Params = { params: Promise<{ batchId: string; moduleId: string; itemId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { batchId, itemId } = await params;

    const hasAccess = await hasBatchAccess(batchId, userId);
    if (!hasAccess) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const body = await req.json();
    const result = validateMobileBody(updateBatchItemSchema, body);
    if (!result.success) return result.response;

    const { description, maxMarks, submissionType, ...itemData } = result.data;

    await db.batchItem.update({
      where: { id: itemId },
      data: itemData
    });

    // If task fields provided, update BatchTask too
    if (description !== undefined || maxMarks !== undefined || submissionType !== undefined) {
      const taskUpdate: Record<string, unknown> = {};
      if (description !== undefined) taskUpdate.description = description;
      if (maxMarks !== undefined) taskUpdate.maxMarks = maxMarks;
      if (submissionType !== undefined) taskUpdate.submissionType = submissionType;

      await db.batchTask.updateMany({
        where: { itemId },
        data: taskUpdate
      });
    }

    const updated = await db.batchItem.findUnique({
      where: { id: itemId },
      include: { task: true, session: true }
    });

    return mobileSuccess(updated);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_BATCH_ITEM_UPDATE', error);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { batchId, itemId } = await params;

    const hasAccess = await hasBatchAccess(batchId, userId);
    if (!hasAccess) return mobileError('FORBIDDEN', 'Forbidden', 403);

    await db.batchItem.delete({ where: { id: itemId } });

    return mobileSuccess({ success: true });
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_BATCH_ITEM_DELETE', error);
  }
}
