import { auth } from '@clerk/nextjs/server';
import { mobileSuccess, mobileError, handleMobileApiError } from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';
import { checkCourseEdit } from '@/lib/course-auth';

type Params = { params: Promise<{ courseId: string; chapterId: string }> };

export async function PATCH(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { courseId, chapterId } = await params;
    const denied = await checkCourseEdit(userId, courseId);
    if (denied) return denied;

    const chapter = await db.chapter.findUnique({
      where: { id: chapterId, courseId },
      select: { isPublished: true }
    });

    if (!chapter) return mobileError('NOT_FOUND', 'Chapter not found', 404);

    const updated = await db.chapter.update({
      where: { id: chapterId, courseId },
      data: { isPublished: !chapter.isPublished }
    });

    return mobileSuccess(updated);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_CHAPTER_PUBLISH', error);
  }
}
