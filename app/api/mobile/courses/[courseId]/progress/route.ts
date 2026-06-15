import { auth } from '@clerk/nextjs/server';
import { mobileSuccess, mobileError, handleMobileApiError } from '@/lib/api-mobile-utils';
import { getProgress } from '@/actions/get-progress';

export async function GET(_req: Request, { params }: { params: { courseId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const progress = await getProgress(userId, params.courseId);

    return mobileSuccess({ progress });
  } catch (error) {
    return handleMobileApiError('MOBILE_PROGRESS', error);
  }
}
