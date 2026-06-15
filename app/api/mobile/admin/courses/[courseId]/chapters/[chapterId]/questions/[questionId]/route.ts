import { auth } from '@clerk/nextjs/server';
import { mobileSuccess, mobileError, handleMobileApiError } from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';
import { checkCourseEdit } from '@/lib/course-auth';

type Params = { params: Promise<{ courseId: string; chapterId: string; questionId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { courseId, questionId } = await params;
    const denied = await checkCourseEdit(userId, courseId);
    if (denied) return denied;

    const body = await req.json();

    const question = await db.question.update({
      where: { id: questionId },
      data: body
    });

    return mobileSuccess(question);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_QUESTION_UPDATE', error);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { courseId, questionId } = await params;
    const denied = await checkCourseEdit(userId, courseId);
    if (denied) return denied;

    await db.question.delete({ where: { id: questionId } });

    return mobileSuccess({ success: true });
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_QUESTION_DELETE', error);
  }
}
