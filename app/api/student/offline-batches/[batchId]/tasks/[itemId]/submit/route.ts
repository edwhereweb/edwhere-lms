import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { submitBatchTaskSchema } from '@/lib/validations';
import { isStudentEnrolledInBatch } from '@/actions/get-batches';
import { db } from '@/lib/db';

type Params = { params: Promise<{ batchId: string; itemId: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const { batchId, itemId } = await params;

    const enrolled = await isStudentEnrolledInBatch(batchId, userId);
    if (!enrolled) return apiError('Forbidden — not enrolled in this batch', 403);

    const item = await db.batchItem.findUnique({
      where: { id: itemId },
      include: { task: true }
    });
    if (!item?.task) return apiError('Task not found', 404);
    if (item.task.submissionType !== 'ONLINE') {
      return apiError('This task does not accept online submissions', 400);
    }

    const body = await req.json();
    const validation = validateBody(submitBatchTaskSchema, body);
    if (!validation.success) return validation.response;

    const submission = await db.batchTaskSubmission.upsert({
      where: { taskId_userId: { taskId: item.task.id, userId } },
      create: { taskId: item.task.id, userId, driveLink: validation.data.driveLink },
      update: { driveLink: validation.data.driveLink }
    });

    return NextResponse.json(submission);
  } catch (error) {
    return handleApiError('SUBMIT_BATCH_TASK', error);
  }
}
