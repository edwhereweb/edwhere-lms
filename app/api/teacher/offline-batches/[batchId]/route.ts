import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { updateBatchSchema } from '@/lib/validations';
import { db } from '@/lib/db';
import getSafeProfile from '@/actions/get-safe-profile';
import { hasBatchAccess } from '@/lib/batch-auth';

async function resolveBatch(batchId: string, userId: string, role: string) {
  const batch = await db.batch.findUnique({ where: { id: batchId } });
  if (!batch) return null;
  const hasAccess = role === 'ADMIN' || (await hasBatchAccess(batchId, userId));
  if (!hasAccess) return null;
  return batch;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await getSafeProfile();
    if (!profile) return apiError('Unauthorized', 401);

    const { batchId } = await params;
    const batch = await resolveBatch(batchId, userId, profile.role);
    if (!batch) return apiError('Not found', 404);

    const body = await req.json();
    const validation = validateBody(updateBatchSchema, body);
    if (!validation.success) return validation.response;

    const { title, description, startDate, endDate, allowSameDayOfflineSession } = validation.data;

    const updated = await db.batch.update({
      where: { id: batchId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(allowSameDayOfflineSession !== undefined && { allowSameDayOfflineSession })
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError('PATCH_OFFLINE_BATCH', error);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await getSafeProfile();
    if (!profile) return apiError('Unauthorized', 401);

    // Only admins can delete batches
    if (profile.role !== 'ADMIN') return apiError('Forbidden', 403);

    const { batchId } = await params;
    const batch = await db.batch.findUnique({ where: { id: batchId } });
    if (!batch) return apiError('Not found', 404);

    await db.batch.delete({ where: { id: batchId } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return handleApiError('DELETE_OFFLINE_BATCH', error);
  }
}
