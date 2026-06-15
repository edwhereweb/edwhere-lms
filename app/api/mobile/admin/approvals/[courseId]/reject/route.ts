import { auth } from '@clerk/nextjs/server';
import { mobileSuccess, mobileError, handleMobileApiError } from '@/lib/api-mobile-utils';
import { currentProfile } from '@/lib/current-profile';
import { db } from '@/lib/db';

type Params = { params: Promise<{ courseId: string }> };

export async function POST(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const profile = await currentProfile();
    if (!profile || profile.role !== 'ADMIN') {
      return mobileError('FORBIDDEN', 'Forbidden', 403);
    }

    const { courseId } = await params;

    const course = await db.course.findUnique({ where: { id: courseId } });
    if (!course) return mobileError('NOT_FOUND', 'Course not found', 404);

    const updated = await db.course.update({
      where: { id: courseId },
      data: {
        pendingApproval: false,
        isPublished: false
      }
    });

    return mobileSuccess(updated);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_APPROVAL_REJECT', error);
  }
}
