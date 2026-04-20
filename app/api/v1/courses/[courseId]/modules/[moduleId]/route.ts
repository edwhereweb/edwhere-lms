import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { checkCourseEdit } from '@/lib/course-auth';
import { apiOk, apiErr, validateRequest, handleRouteError } from '@/lib/api-response';
import { updateModuleSchema } from '@/lib/validations';

export async function DELETE(
  _req: Request,
  { params }: { params: { courseId: string; moduleId: string } }
) {
  try {
    const { userId } = await auth();

    const denied = await checkCourseEdit(userId, params.courseId);
    if (denied) return denied;

    const courseModule = await db.module.findUnique({
      where: { id: params.moduleId, courseId: params.courseId }
    });

    if (!courseModule) return apiErr('NOT_FOUND', 'Not found', 404);

    await db.chapter.updateMany({
      where: { moduleId: params.moduleId },
      data: { moduleId: null }
    });

    const deletedModule = await db.module.delete({
      where: { id: params.moduleId }
    });

    return apiOk(deletedModule);
  } catch (error) {
    return handleRouteError('MODULE_ID_DELETE', error);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { courseId: string; moduleId: string } }
) {
  try {
    const { userId } = await auth();

    const denied = await checkCourseEdit(userId, params.courseId);
    if (denied) return denied;

    const body = await req.json();
    const validation = validateRequest(updateModuleSchema, body);
    if (!validation.success) return validation.response;

    const courseModule = await db.module.update({
      where: { id: params.moduleId, courseId: params.courseId },
      data: validation.data
    });

    return apiOk(courseModule);
  } catch (error) {
    return handleRouteError('MODULE_ID_PATCH', error);
  }
}

export async function GET(
  _req: Request,
  { params }: { params: { courseId: string; moduleId: string } }
) {
  try {
    const { userId } = await auth();

    const denied = await checkCourseEdit(userId, params.courseId);
    if (denied) return denied;

    const courseModule = await db.module.findUnique({
      where: { id: params.moduleId, courseId: params.courseId },
      include: {
        chapters: { orderBy: { position: 'asc' } }
      }
    });

    if (!courseModule) return apiErr('NOT_FOUND', 'Not found', 404);

    return apiOk(courseModule);
  } catch (error) {
    return handleRouteError('MODULE_ID_GET', error);
  }
}
