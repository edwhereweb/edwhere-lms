import { auth } from '@clerk/nextjs/server';
import { mobileSuccess, mobileError, handleMobileApiError } from '@/lib/api-mobile-utils';
import { getChapter } from '@/actions/get-chapter';

export async function GET(
  _req: Request,
  { params }: { params: { courseId: string; chapterId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const data = await getChapter({
      userId,
      courseId: params.courseId,
      chapterId: params.chapterId
    });

    if (!data.chapter) {
      return mobileError('NOT_FOUND', 'Not Found', 404);
    }

    return mobileSuccess(data);
  } catch (error) {
    return handleMobileApiError('MOBILE_CHAPTER', error);
  }
}
