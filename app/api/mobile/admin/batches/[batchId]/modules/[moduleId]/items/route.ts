import { auth } from '@clerk/nextjs/server';
import {
  mobileError,
  validateMobileBody,
  handleMobileApiError,
  mobileCreated
} from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';
import { canManageBatch } from '@/lib/batch-auth';
import { createBatchItemSchema } from '@/lib/validations';

type Params = { params: Promise<{ batchId: string; moduleId: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const allowed = await canManageBatch(userId);
    if (!allowed) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const { batchId, moduleId } = await params;

    // Verify module belongs to batch
    const batchModule = await db.batchModule.findFirst({
      where: { id: moduleId, batchId }
    });
    if (!batchModule) return mobileError('NOT_FOUND', 'Module not found', 404);

    const body = await req.json();
    const result = validateMobileBody(createBatchItemSchema, body);
    if (!result.success) return result.response;

    // Auto-set position
    const lastItem = await db.batchItem.findFirst({
      where: { moduleId },
      orderBy: { position: 'desc' }
    });
    const position = lastItem ? lastItem.position + 1 : 0;

    const item = await db.batchItem.create({
      data: {
        moduleId,
        type: result.data.type,
        title: result.data.title,
        position,
        pdfUrl: result.data.pdfUrl,
        resourceUrl: result.data.resourceUrl
      }
    });

    // If type is TASK, also create BatchTask
    if (result.data.type === 'TASK') {
      await db.batchTask.create({
        data: {
          itemId: item.id,
          description: result.data.description || '',
          maxMarks: result.data.maxMarks || 100,
          submissionType: result.data.submissionType || 'OFFLINE'
        }
      });
    }

    // If type is OFFLINE_SESSION, also create OfflineSession
    if (result.data.type === 'OFFLINE_SESSION') {
      await db.offlineSession.create({
        data: {
          itemId: item.id,
          scheduledAt: new Date(),
          instructorId: userId
        }
      });
    }

    // Re-fetch with relations
    const created = await db.batchItem.findUnique({
      where: { id: item.id },
      include: { task: true, session: true }
    });

    return mobileCreated(created);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_BATCH_ITEM_CREATE', error);
  }
}
