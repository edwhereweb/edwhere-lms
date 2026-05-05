import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { createBatchModuleSchema } from '@/lib/validations';
import { canManageBatch } from '@/lib/batch-auth';
import { db } from '@/lib/db';
import { getBatchContent } from '@/actions/get-batches';
import getSafeProfile from '@/actions/get-safe-profile';

export async function GET(_req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await getSafeProfile();
    if (!profile) return apiError('Unauthorized', 401);

    const { batchId } = await params;
    const content = await getBatchContent(batchId, userId, profile.role);
    if (content === null) return apiError('Not found', 404);

    return NextResponse.json(content);
  } catch (error) {
    return handleApiError('GET_BATCH_MODULES', error);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const allowed = await canManageBatch(userId);
    if (!allowed) return apiError('Forbidden', 403);

    const { batchId } = await params;
    const batch = await db.batch.findUnique({ where: { id: batchId } });
    if (!batch) return apiError('Batch not found', 404);

    const body = await req.json();
    const validation = validateBody(createBatchModuleSchema, body);
    if (!validation.success) return validation.response;

    // Append at the end — derive next position
    const last = await db.batchModule.findFirst({
      where: { batchId },
      orderBy: { position: 'desc' },
      select: { position: true }
    });

    const batchModule = await db.batchModule.create({
      data: {
        batchId,
        title: validation.data.title,
        position: (last?.position ?? -1) + 1
      }
    });

    return NextResponse.json(batchModule, { status: 201 });
  } catch (error) {
    return handleApiError('CREATE_BATCH_MODULE', error);
  }
}
