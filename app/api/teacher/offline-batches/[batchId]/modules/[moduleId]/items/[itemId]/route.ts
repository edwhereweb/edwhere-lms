import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { updateBatchItemSchema } from '@/lib/validations';
import { canManageBatch } from '@/lib/batch-auth';
import { db } from '@/lib/db';

type Params = { params: Promise<{ batchId: string; moduleId: string; itemId: string }> };

async function resolveItem(moduleId: string, itemId: string) {
  return db.batchItem.findFirst({ where: { id: itemId, moduleId } });
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const allowed = await canManageBatch(userId);
    if (!allowed) return apiError('Forbidden', 403);

    const { moduleId, itemId } = await params;
    const item = await resolveItem(moduleId, itemId);
    if (!item) return apiError('Item not found', 404);

    const body = await req.json();
    const validation = validateBody(updateBatchItemSchema, body);
    if (!validation.success) return validation.response;

    const { title, position, pdfUrl, resourceUrl, description, maxMarks, submissionType } =
      validation.data;

    const updated = await db.batchItem.update({
      where: { id: itemId },
      data: {
        ...(title !== undefined && { title }),
        ...(position !== undefined && { position }),
        ...(pdfUrl !== undefined && { pdfUrl }),
        ...(resourceUrl !== undefined && { resourceUrl }),
        // Update nested task if any task-specific fields are present
        ...((description !== undefined ||
          maxMarks !== undefined ||
          submissionType !== undefined) && {
          task: {
            update: {
              ...(description !== undefined && { description }),
              ...(maxMarks !== undefined && { maxMarks }),
              ...(submissionType !== undefined && { submissionType })
            }
          }
        })
      },
      include: { task: true }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError('PATCH_BATCH_ITEM', error);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const allowed = await canManageBatch(userId);
    if (!allowed) return apiError('Forbidden', 403);

    const { moduleId, itemId } = await params;
    const item = await resolveItem(moduleId, itemId);
    if (!item) return apiError('Item not found', 404);

    await db.batchItem.delete({ where: { id: itemId } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return handleApiError('DELETE_BATCH_ITEM', error);
  }
}
