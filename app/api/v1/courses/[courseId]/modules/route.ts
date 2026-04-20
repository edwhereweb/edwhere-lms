import { auth } from '@clerk/nextjs/server';

import { db } from '@/lib/db';
import { checkCourseEdit } from '@/lib/course-auth';
import { apiOk, validateRequest, handleRouteError } from '@/lib/api-response';
import { createModuleSchema } from '@/lib/validations';

export async function POST(req: Request, { params }: { params: { courseId: string } }) {
  try {
    const { userId } = await auth();

    const denied = await checkCourseEdit(userId, params.courseId);
    if (denied) return denied;

    const body = await req.json();
    const validation = validateRequest(createModuleSchema, body);
    if (!validation.success) return validation.response;

    const lastModule = await db.module.findFirst({
      where: { courseId: params.courseId },
      orderBy: { position: 'desc' }
    });

    const newPosition = lastModule ? lastModule.position + 1 : 1;

    const courseModule = await db.module.create({
      data: {
        title: validation.data.title,
        courseId: params.courseId,
        position: newPosition
      }
    });

    return apiOk(courseModule);
  } catch (error) {
    return handleRouteError('MODULES', error);
  }
}
