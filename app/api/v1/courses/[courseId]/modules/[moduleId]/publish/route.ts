import { auth } from '@clerk/nextjs/server';

import { db } from '@/lib/db';
import { checkCourseEdit } from '@/lib/course-auth';
import { apiOk, apiErr, handleRouteError } from '@/lib/api-response';

export async function PATCH(
  _req: Request,
  { params }: { params: { courseId: string; moduleId: string } }
) {
  try {
    const { userId } = await auth();

    const denied = await checkCourseEdit(userId, params.courseId);
    if (denied) return denied;

    const courseModule = await db.module.findUnique({
      where: {
        id: params.moduleId,
        courseId: params.courseId
      },
      include: {
        chapters: {
          where: {
            isPublished: true
          }
        }
      }
    });

    if (!courseModule) {
      return apiErr('NOT_FOUND', 'Not found', 404);
    }

    // A module ideally shouldn't be published if it has 0 published chapters.
    if (!courseModule.title || courseModule.chapters.length === 0) {
      return apiErr('VALIDATION', 'Missing required fields or no published chapters', 400);
    }

    const publishedModule = await db.module.update({
      where: {
        id: params.moduleId,
        courseId: params.courseId
      },
      data: {
        isPublished: true
      }
    });

    return apiOk(publishedModule);
  } catch (error) {
    return handleRouteError('MODULE_PUBLISH', error);
  }
}
