import { auth } from '@clerk/nextjs/server';
import { mobileSuccess, mobileError, handleMobileApiError } from '@/lib/api-mobile-utils';
import { getBatchContent, isStudentEnrolledInBatch } from '@/actions/get-batches';

export async function GET(_req: Request, { params }: { params: { batchId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const enrolled = await isStudentEnrolledInBatch(params.batchId, userId);
    if (!enrolled) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const content = await getBatchContent(params.batchId, userId, 'STUDENT');

    if (!content) {
      return mobileError('NOT_FOUND', 'Not Found', 404);
    }

    return mobileSuccess(content);
  } catch (error) {
    return handleMobileApiError('MOBILE_BATCH_CONTENT', error);
  }
}
