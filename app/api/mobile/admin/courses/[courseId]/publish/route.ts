import { auth } from '@clerk/nextjs/server';
import { mobileSuccess, mobileError, handleMobileApiError } from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';
import { checkCourseEdit } from '@/lib/course-auth';

type Params = { params: Promise<{ courseId: string }> };

export async function PATCH(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { courseId } = await params;
    const denied = await checkCourseEdit(userId, courseId);
    if (denied) return denied;

    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { isPublished: true }
    });

    if (!course) return mobileError('NOT_FOUND', 'Course not found', 404);

    const updated = await db.course.update({
      where: { id: courseId },
      data: course.isPublished
        ? { isPublished: false, pendingApproval: false }
        : { isPublished: true, pendingApproval: true }
    });

    return mobileSuccess(updated);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_COURSE_PUBLISH', error);
  }
}
