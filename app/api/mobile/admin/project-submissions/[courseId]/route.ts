import { auth } from '@clerk/nextjs/server';
import { mobileSuccess, mobileError, handleMobileApiError } from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';
import { isTeacher } from '@/lib/teacher';

type Params = { params: Promise<{ courseId: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const teacherAccess = await isTeacher();
    if (!teacherAccess) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const { courseId } = await params;

    const chapters = await db.chapter.findMany({
      where: {
        courseId,
        projectSubmissions: { some: {} }
      },
      select: {
        id: true,
        title: true,
        _count: {
          select: {
            projectSubmissions: { where: { status: 'PENDING' } }
          }
        }
      },
      orderBy: { position: 'asc' }
    });

    const result = chapters.map((ch) => ({
      chapterId: ch.id,
      chapterTitle: ch.title,
      pendingCount: ch._count.projectSubmissions
    }));

    return mobileSuccess(result);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_PROJECT_SUBMISSIONS_BY_COURSE', error);
  }
}
