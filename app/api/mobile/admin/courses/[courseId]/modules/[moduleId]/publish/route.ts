import { auth } from '@clerk/nextjs/server';
import { mobileSuccess, mobileError, handleMobileApiError } from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';
import { checkCourseEdit } from '@/lib/course-auth';

type Params = { params: Promise<{ courseId: string; moduleId: string }> };

export async function PATCH(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { courseId, moduleId } = await params;
    const denied = await checkCourseEdit(userId, courseId);
    if (denied) return denied;

    const courseModule = await db.module.findUnique({
      where: { id: moduleId, courseId },
      select: { isPublished: true }
    });

    if (!courseModule) return mobileError('NOT_FOUND', 'Module not found', 404);

    const updated = await db.module.update({
      where: { id: moduleId, courseId },
      data: { isPublished: !courseModule.isPublished }
    });

    return mobileSuccess(updated);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_MODULE_PUBLISH', error);
  }
}
