import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { apiError, handleApiError } from '@/lib/api-utils';
import { getStudentBatchGamification, isStudentEnrolledInBatch } from '@/actions/get-batches';

export async function GET(_req: Request, { params }: { params: { batchId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const enrolled = await isStudentEnrolledInBatch(params.batchId, userId);
    if (!enrolled) return apiError('Forbidden', 403);

    const stats = await getStudentBatchGamification(params.batchId, userId);

    if (!stats) {
      return apiError('Not Found', 404);
    }

    return NextResponse.json(stats);
  } catch (error) {
    return handleApiError('MOBILE_BATCH_GAMIFICATION', error);
  }
}
