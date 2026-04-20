import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { checkCourseEdit } from '@/lib/course-auth';
import { apiOk, apiErr, handleRouteError } from '@/lib/api-response';

export async function PATCH(_req: Request, { params }: { params: { courseId: string } }) {
  try {
    const { userId } = await auth();

    const denied = await checkCourseEdit(userId, params.courseId);
    if (denied) return denied;

    const course = await db.course.findUnique({
      where: { id: params.courseId }
    });

    if (!course) {
      return apiErr('NOT_FOUND', 'Not found', 404);
    }

    const unpublishedCourse = await db.course.update({
      where: { id: params.courseId },
      data: { isPublished: false }
    });

    return apiOk(unpublishedCourse);
  } catch (error) {
    return handleRouteError('COURSE_ID_UNPUBLISH', error);
  }
}
