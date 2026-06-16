import { auth } from '@clerk/nextjs/server';
import {
  mobileSuccess,
  mobileError,
  validateMobileBody,
  handleMobileApiError
} from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';
import { checkCourseEdit } from '@/lib/course-auth';
import { updateCourseSchema } from '@/lib/validations';

type Params = { params: Promise<{ courseId: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { courseId } = await params;
    const denied = await checkCourseEdit(userId, courseId);
    if (denied) return denied;

    const course = await db.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          include: { chapters: { orderBy: { position: 'asc' } } },
          orderBy: { position: 'asc' }
        },
        chapters: {
          where: { moduleId: null },
          orderBy: { position: 'asc' }
        },
        instructors: {
          include: {
            profile: { select: { id: true, name: true, email: true, imageUrl: true } }
          }
        },
        attachments: { orderBy: { createdAt: 'desc' } },
        category: true,
        _count: { select: { purchases: true } }
      }
    });

    if (!course) return mobileError('NOT_FOUND', 'Course not found', 404);

    return mobileSuccess(course);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_COURSE_GET', error);
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { courseId } = await params;
    const denied = await checkCourseEdit(userId, courseId);
    if (denied) return denied;

    const body = await req.json();
    const result = validateMobileBody(updateCourseSchema, body);
    if (!result.success) return result.response;

    const course = await db.course.update({
      where: { id: courseId },
      data: result.data
    });

    return mobileSuccess(course);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_COURSE_UPDATE', error);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { courseId } = await params;
    const denied = await checkCourseEdit(userId, courseId);
    if (denied) return denied;

    await db.course.delete({ where: { id: courseId } });

    return mobileSuccess({ success: true });
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_COURSE_DELETE', error);
  }
}
