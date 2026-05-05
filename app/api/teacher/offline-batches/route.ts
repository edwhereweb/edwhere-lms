import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { createBatchSchema } from '@/lib/validations';
import { canManageBatch } from '@/lib/batch-auth';
import { getBatches } from '@/actions/get-batches';
import { db } from '@/lib/db';
import getSafeProfile from '@/actions/get-safe-profile';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await getSafeProfile();
    if (!profile) return apiError('Unauthorized', 401);

    const batches = await getBatches(userId, profile.role);
    return NextResponse.json(batches);
  } catch (error) {
    return handleApiError('GET_OFFLINE_BATCHES', error);
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const allowed = await canManageBatch(userId);
    if (!allowed) return apiError('Forbidden', 403);

    const body = await req.json();
    const validation = validateBody(createBatchSchema, body);
    if (!validation.success) return validation.response;

    const { title, description, startDate, endDate } = validation.data;

    const batch = await db.batch.create({
      data: {
        title,
        description,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        createdBy: userId
      }
    });

    return NextResponse.json(batch, { status: 201 });
  } catch (error) {
    return handleApiError('CREATE_OFFLINE_BATCH', error);
  }
}
