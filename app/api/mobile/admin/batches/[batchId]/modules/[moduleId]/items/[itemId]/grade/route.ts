import { auth } from '@clerk/nextjs/server';
import {
  mobileError,
  validateMobileBody,
  handleMobileApiError,
  mobileSuccess
} from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';
import { hasBatchAccess } from '@/lib/batch-auth';
import { gradeBatchTaskSchema } from '@/lib/validations';

type Params = { params: Promise<{ batchId: string; moduleId: string; itemId: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { batchId, itemId } = await params;

    const hasAccess = await hasBatchAccess(batchId, userId);
    if (!hasAccess) return mobileError('FORBIDDEN', 'Forbidden', 403);

    // Verify item has a task
    const task = await db.batchTask.findUnique({ where: { itemId } });
    if (!task) return mobileError('NOT_FOUND', 'Task not found for this item', 404);

    const body = await req.json();
    const result = validateMobileBody(gradeBatchTaskSchema, body);
    if (!result.success) return result.response;

    const submission = await db.batchTaskSubmission.upsert({
      where: {
        taskId_userId: {
          taskId: task.id,
          userId: result.data.userId
        }
      },
      create: {
        taskId: task.id,
        userId: result.data.userId,
        marks: result.data.marks,
        gradedBy: userId,
        gradedAt: new Date()
      },
      update: {
        marks: result.data.marks,
        gradedBy: userId,
        gradedAt: new Date()
      }
    });

    return mobileSuccess(submission);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_GRADE_TASK', error);
  }
}
