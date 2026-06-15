import { auth } from '@clerk/nextjs/server';
import {
  mobileError,
  validateMobileBody,
  handleMobileApiError,
  mobileCreated
} from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';
import { canManageBatch } from '@/lib/batch-auth';
import { createBatchModuleSchema } from '@/lib/validations';

type Params = { params: Promise<{ batchId: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const allowed = await canManageBatch(userId);
    if (!allowed) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const { batchId } = await params;

    // Verify batch exists
    const batch = await db.batch.findUnique({ where: { id: batchId } });
    if (!batch) return mobileError('NOT_FOUND', 'Batch not found', 404);

    const body = await req.json();
    const result = validateMobileBody(createBatchModuleSchema, body);
    if (!result.success) return result.response;

    // Auto-set position
    const lastModule = await db.batchModule.findFirst({
      where: { batchId },
      orderBy: { position: 'desc' }
    });
    const position = lastModule ? lastModule.position + 1 : 0;

    const batchModule = await db.batchModule.create({
      data: {
        batchId,
        title: result.data.title,
        position
      }
    });

    return mobileCreated(batchModule);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_BATCH_MODULE_CREATE', error);
  }
}
