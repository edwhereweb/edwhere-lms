import { auth } from '@clerk/nextjs/server';
import {
  mobileCreated,
  mobileError,
  validateMobileBody,
  handleMobileApiError
} from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';
import { checkCourseEdit } from '@/lib/course-auth';
import { createModuleSchema } from '@/lib/validations';

type Params = { params: Promise<{ courseId: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { courseId } = await params;
    const denied = await checkCourseEdit(userId, courseId);
    if (denied) return denied;

    const body = await req.json();
    const result = validateMobileBody(createModuleSchema, body);
    if (!result.success) return result.response;

    const lastModule = await db.module.findFirst({
      where: { courseId },
      orderBy: { position: 'desc' },
      select: { position: true }
    });

    const courseModule = await db.module.create({
      data: {
        title: result.data.title,
        courseId,
        position: (lastModule?.position ?? -1) + 1
      }
    });

    return mobileCreated(courseModule);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_MODULE_CREATE', error);
  }
}
