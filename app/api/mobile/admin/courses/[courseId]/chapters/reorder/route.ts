import { auth } from '@clerk/nextjs/server';
import {
  mobileSuccess,
  mobileError,
  validateMobileBody,
  handleMobileApiError
} from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';
import { checkCourseEdit } from '@/lib/course-auth';
import { reorderChaptersSchema } from '@/lib/validations';

type Params = { params: Promise<{ courseId: string }> };

export async function PUT(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { courseId } = await params;
    const denied = await checkCourseEdit(userId, courseId);
    if (denied) return denied;

    const body = await req.json();
    const result = validateMobileBody(reorderChaptersSchema, body);
    if (!result.success) return result.response;

    for (const item of result.data.list) {
      await db.chapter.update({
        where: { id: item.id, courseId },
        data: {
          position: item.position,
          moduleId: item.moduleId ?? null
        }
      });
    }

    return mobileSuccess({ success: true });
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_CHAPTERS_REORDER', error);
  }
}
