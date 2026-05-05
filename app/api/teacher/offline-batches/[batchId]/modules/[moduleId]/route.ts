import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { updateBatchModuleSchema } from '@/lib/validations';
import { canManageBatch } from '@/lib/batch-auth';
import { db } from '@/lib/db';

type Params = { params: Promise<{ batchId: string; moduleId: string }> };

async function resolveModule(batchId: string, moduleId: string) {
  return db.batchModule.findFirst({ where: { id: moduleId, batchId } });
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const allowed = await canManageBatch(userId);
    if (!allowed) return apiError('Forbidden', 403);

    const { batchId, moduleId } = await params;
    const mod = await resolveModule(batchId, moduleId);
    if (!mod) return apiError('Module not found', 404);

    const body = await req.json();
    const validation = validateBody(updateBatchModuleSchema, body);
    if (!validation.success) return validation.response;

    const updated = await db.batchModule.update({
      where: { id: moduleId },
      data: {
        ...(validation.data.title !== undefined && { title: validation.data.title }),
        ...(validation.data.position !== undefined && { position: validation.data.position })
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError('PATCH_BATCH_MODULE', error);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const allowed = await canManageBatch(userId);
    if (!allowed) return apiError('Forbidden', 403);

    const { batchId, moduleId } = await params;
    const mod = await resolveModule(batchId, moduleId);
    if (!mod) return apiError('Module not found', 404);

    await db.batchModule.delete({ where: { id: moduleId } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return handleApiError('DELETE_BATCH_MODULE', error);
  }
}
