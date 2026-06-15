import { auth } from '@clerk/nextjs/server';
import {
  mobileSuccess,
  mobileError,
  validateMobileBody,
  handleMobileApiError
} from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';
import { checkCourseEdit } from '@/lib/course-auth';
import { updateModuleSchema } from '@/lib/validations';

type Params = { params: Promise<{ courseId: string; moduleId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { courseId, moduleId } = await params;
    const denied = await checkCourseEdit(userId, courseId);
    if (denied) return denied;

    const body = await req.json();
    const result = validateMobileBody(updateModuleSchema, body);
    if (!result.success) return result.response;

    const courseModule = await db.module.update({
      where: { id: moduleId, courseId },
      data: result.data
    });

    return mobileSuccess(courseModule);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_MODULE_UPDATE', error);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { courseId, moduleId } = await params;
    const denied = await checkCourseEdit(userId, courseId);
    if (denied) return denied;

    await db.module.delete({ where: { id: moduleId, courseId } });

    return mobileSuccess({ success: true });
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_MODULE_DELETE', error);
  }
}
