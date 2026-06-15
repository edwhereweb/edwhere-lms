import { auth } from '@clerk/nextjs/server';
import { mobileSuccess, mobileError, handleMobileApiError } from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';
import { checkCourseEdit } from '@/lib/course-auth';

type Params = { params: Promise<{ courseId: string; attachmentId: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { courseId, attachmentId } = await params;
    const denied = await checkCourseEdit(userId, courseId);
    if (denied) return denied;

    await db.attachment.delete({
      where: { id: attachmentId, courseId }
    });

    return mobileSuccess({ success: true });
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_ATTACHMENT_DELETE', error);
  }
}
