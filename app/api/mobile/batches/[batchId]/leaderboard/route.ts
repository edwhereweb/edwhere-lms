import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { apiError, handleApiError } from '@/lib/api-utils';
import { getBatchLeaderboard, isStudentEnrolledInBatch } from '@/actions/get-batches';

export async function GET(_req: Request, { params }: { params: { batchId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const enrolled = await isStudentEnrolledInBatch(params.batchId, userId);
    if (!enrolled) return apiError('Forbidden', 403);

    const leaderboard = await getBatchLeaderboard(params.batchId);

    return NextResponse.json(leaderboard);
  } catch (error) {
    return handleApiError('MOBILE_BATCH_LEADERBOARD', error);
  }
}
