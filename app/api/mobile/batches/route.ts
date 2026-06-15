import { auth } from '@clerk/nextjs/server';
import { mobileSuccess, mobileError, handleMobileApiError } from '@/lib/api-mobile-utils';
import { getStudentBatches } from '@/actions/get-batches';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const batches = await getStudentBatches(userId);

    return mobileSuccess(batches);
  } catch (error) {
    return handleMobileApiError('MOBILE_BATCHES', error);
  }
}
