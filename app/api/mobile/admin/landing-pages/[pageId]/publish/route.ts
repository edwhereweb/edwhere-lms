import { auth } from '@clerk/nextjs/server';
import { mobileSuccess, mobileError, handleMobileApiError } from '@/lib/api-mobile-utils';
import { currentProfile } from '@/lib/current-profile';
import { db } from '@/lib/db';

type Params = { params: Promise<{ pageId: string }> };

export async function PATCH(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const profile = await currentProfile();
    if (!profile || (profile.role !== 'ADMIN' && profile.role !== 'TEACHER')) {
      return mobileError('FORBIDDEN', 'Forbidden', 403);
    }

    const { pageId } = await params;

    const page = await db.landingPage.findUnique({
      where: { id: pageId },
      select: { isPublished: true, createdBy: true }
    });

    if (!page) return mobileError('NOT_FOUND', 'Landing page not found', 404);

    if (profile.role !== 'ADMIN' && page.createdBy !== userId) {
      return mobileError('FORBIDDEN', 'Forbidden', 403);
    }

    const updated = await db.landingPage.update({
      where: { id: pageId },
      data: { isPublished: !page.isPublished }
    });

    return mobileSuccess(updated);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_LANDING_PAGE_PUBLISH', error);
  }
}
