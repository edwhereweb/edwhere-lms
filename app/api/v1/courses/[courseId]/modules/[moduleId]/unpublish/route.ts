import { auth } from '@clerk/nextjs/server';

import { db } from '@/lib/db';
import { checkCourseEdit } from '@/lib/course-auth';
import { apiOk, handleRouteError } from '@/lib/api-response';

export async function PATCH(
  _req: Request,
  { params }: { params: { courseId: string; moduleId: string } }
) {
  try {
    const { userId } = await auth();

    const denied = await checkCourseEdit(userId, params.courseId);
    if (denied) return denied;

    const courseModule = await db.module.update({
      where: {
        id: params.moduleId,
        courseId: params.courseId
      },
      data: {
        isPublished: false
      }
    });

    return apiOk(courseModule);
  } catch (error) {
    return handleRouteError('MODULE_UNPUBLISH', error);
  }
}
