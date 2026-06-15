import { auth } from '@clerk/nextjs/server';
import { mobileSuccess, mobileError, handleMobileApiError } from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';
import { checkCourseEdit } from '@/lib/course-auth';

type Params = { params: Promise<{ courseId: string; purchaseId: string }> };

export async function POST(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { courseId, purchaseId } = await params;
    const denied = await checkCourseEdit(userId, courseId);
    if (denied) return denied;

    const purchase = await db.purchase.findUnique({
      where: { id: purchaseId },
      select: { userId: true }
    });

    if (!purchase) return mobileError('NOT_FOUND', 'Purchase not found', 404);

    const chapters = await db.chapter.findMany({
      where: { courseId },
      select: { id: true }
    });

    const chapterIds = chapters.map((c) => c.id);

    await db.userProgress.deleteMany({
      where: {
        userId: purchase.userId,
        chapterId: { in: chapterIds }
      }
    });

    return mobileSuccess({ success: true });
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_LEARNER_RESET', error);
  }
}
