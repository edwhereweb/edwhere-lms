import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { gradeBatchTaskSchema } from '@/lib/validations';
import { canEnrollInBatch } from '@/lib/batch-auth';
import { db } from '@/lib/db';

type Params = { params: Promise<{ batchId: string; moduleId: string; itemId: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const allowed = await canEnrollInBatch(userId);
    if (!allowed) return apiError('Forbidden — only admins and instructors can grade', 403);

    const { itemId } = await params;
    const item = await db.batchItem.findUnique({
      where: { id: itemId },
      include: { task: true }
    });
    if (!item?.task) return apiError('Task not found', 404);

    if (item.task.maxMarks !== undefined) {
      const body = await req.json();
      const validation = validateBody(gradeBatchTaskSchema, body);
      if (!validation.success) return validation.response;

      const { userId: studentUserId, marks } = validation.data;

      if (marks > item.task.maxMarks) {
        return apiError(`Marks cannot exceed max marks (${item.task.maxMarks})`, 400);
      }

      const submission = await db.batchTaskSubmission.upsert({
        where: { taskId_userId: { taskId: item.task.id, userId: studentUserId } },
        create: {
          taskId: item.task.id,
          userId: studentUserId,
          marks,
          gradedBy: userId,
          gradedAt: new Date()
        },
        update: {
          marks,
          gradedBy: userId,
          gradedAt: new Date()
        }
      });

      return NextResponse.json(submission);
    }

    return apiError('Invalid task configuration', 400);
  } catch (error) {
    return handleApiError('GRADE_BATCH_TASK', error);
  }
}
