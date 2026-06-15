import { auth } from '@clerk/nextjs/server';
import { mobileSuccess, mobileError, handleMobileApiError } from '@/lib/api-mobile-utils';
import { currentProfile } from '@/lib/current-profile';
import { db } from '@/lib/db';

type Params = { params: Promise<{ pageId: string }> };

export async function POST(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const profile = await currentProfile();
    if (!profile || profile.role !== 'ADMIN') {
      return mobileError('FORBIDDEN', 'Forbidden', 403);
    }

    const { pageId } = await params;

    const page = await db.landingPage.findUnique({ where: { id: pageId } });
    if (!page) return mobileError('NOT_FOUND', 'Landing page not found', 404);

    const updated = await db.landingPage.update({
      where: { id: pageId },
      data: {
        isApproved: true,
        approvedBy: userId,
        approvedAt: new Date()
      }
    });

    return mobileSuccess(updated);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_LANDING_PAGE_APPROVE', error);
  }
}
