import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { apiError, handleApiError } from '@/lib/api-utils';
import { getBatchContent, isStudentEnrolledInBatch } from '@/actions/get-batches';

export async function GET(_req: Request, { params }: { params: { batchId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const enrolled = await isStudentEnrolledInBatch(params.batchId, userId);
    if (!enrolled) return apiError('Forbidden', 403);

    const content = await getBatchContent(params.batchId, userId, 'STUDENT');

    if (!content) {
      return apiError('Not Found', 404);
    }

    return NextResponse.json(content);
  } catch (error) {
    return handleApiError('MOBILE_BATCH_CONTENT', error);
  }
}
