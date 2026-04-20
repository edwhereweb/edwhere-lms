import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { checkCourseEdit } from '@/lib/course-auth';
import { apiOk, handleRouteError } from '@/lib/api-response';

export async function PATCH(
  req: Request,
  { params }: { params: { courseId: string; chapterId: string } }
) {
  try {
    const { userId } = await auth();

    const denied = await checkCourseEdit(userId, params.courseId);
    if (denied) return denied;

    const unpublishedChapter = await db.chapter.update({
      where: { id: params.chapterId, courseId: params.courseId },
      data: { isPublished: false }
    });

    const publishedCount = await db.chapter.count({
      where: { courseId: params.courseId, isPublished: true }
    });

    if (publishedCount === 0) {
      await db.course.update({
        where: { id: params.courseId },
        data: { isPublished: false }
      });
    }

    return apiOk(unpublishedChapter);
  } catch (error) {
    return handleRouteError('CHAPTER_UNPUBLISH', error);
  }
}
