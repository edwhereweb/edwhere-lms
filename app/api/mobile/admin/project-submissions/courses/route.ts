import { auth } from '@clerk/nextjs/server';
import { mobileSuccess, mobileError, handleMobileApiError } from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';
import { isTeacher } from '@/lib/teacher';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const teacherAccess = await isTeacher();
    if (!teacherAccess) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const pendingSubmissions = await db.projectSubmission.findMany({
      where: { status: 'PENDING' },
      include: {
        chapter: {
          select: {
            id: true,
            courseId: true,
            course: { select: { id: true, title: true } }
          }
        }
      }
    });

    const courseMap = new Map<string, { id: string; title: string; pendingCount: number }>();
    for (const sub of pendingSubmissions) {
      const course = sub.chapter.course;
      if (!courseMap.has(course.id)) {
        courseMap.set(course.id, { id: course.id, title: course.title, pendingCount: 0 });
      }
      courseMap.get(course.id)!.pendingCount++;
    }

    return mobileSuccess(Array.from(courseMap.values()));
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_PROJECT_SUBMISSIONS_COURSES', error);
  }
}
