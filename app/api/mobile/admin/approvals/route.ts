import { auth } from '@clerk/nextjs/server';
import { mobileSuccess, mobileError, handleMobileApiError } from '@/lib/api-mobile-utils';
import { currentProfile } from '@/lib/current-profile';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const profile = await currentProfile();
    if (!profile || profile.role !== 'ADMIN') {
      return mobileError('FORBIDDEN', 'Forbidden', 403);
    }

    const courses = await db.course.findMany({
      where: { pendingApproval: true },
      include: {
        category: { select: { name: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return mobileSuccess(courses);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_APPROVALS_LIST', error);
  }
}
