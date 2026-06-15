import { auth } from '@clerk/nextjs/server';
import {
  mobileSuccess,
  mobileError,
  validateMobileBody,
  handleMobileApiError
} from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';
import { checkCourseEdit } from '@/lib/course-auth';
import { updateChapterSchema } from '@/lib/validations';

type Params = { params: Promise<{ courseId: string; chapterId: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { courseId, chapterId } = await params;
    const denied = await checkCourseEdit(userId, courseId);
    if (denied) return denied;

    const chapter = await db.chapter.findUnique({
      where: { id: chapterId, courseId },
      include: {
        quiz: {
          include: { questions: { orderBy: { createdAt: 'asc' } } }
        }
      }
    });

    if (!chapter) return mobileError('NOT_FOUND', 'Chapter not found', 404);

    return mobileSuccess(chapter);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_CHAPTER_GET', error);
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { courseId, chapterId } = await params;
    const denied = await checkCourseEdit(userId, courseId);
    if (denied) return denied;

    const body = await req.json();
    const result = validateMobileBody(updateChapterSchema, body);
    if (!result.success) return result.response;

    const chapter = await db.chapter.update({
      where: { id: chapterId, courseId },
      data: result.data
    });

    return mobileSuccess(chapter);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_CHAPTER_UPDATE', error);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { courseId, chapterId } = await params;
    const denied = await checkCourseEdit(userId, courseId);
    if (denied) return denied;

    await db.chapter.delete({ where: { id: chapterId, courseId } });

    return mobileSuccess({ success: true });
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_CHAPTER_DELETE', error);
  }
}
