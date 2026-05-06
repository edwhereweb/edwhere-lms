// app/api/batch/[batchId]/leaderboard/route.ts
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { auth } from '@clerk/nextjs/server';
import { apiError, handleApiError } from '@/lib/api-utils';
import { getBatchLeaderboard, isStudentEnrolledInBatch } from '@/actions/get-batches';

export async function GET(req: Request, { params }: { params: { batchId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const { batchId } = params;
    // Ensure the requester belongs to the batch (or is an admin – handled inside isStudentEnrolledInBatch)
    const enrolled = await isStudentEnrolledInBatch(batchId, userId);
    if (!enrolled) return apiError('Forbidden', 403);

    const leaderboard = await getBatchLeaderboard(batchId);
    return NextResponse.json(leaderboard);
  } catch (error) {
    return handleApiError('GET_BATCH_LEADERBOARD', error);
  }
}
