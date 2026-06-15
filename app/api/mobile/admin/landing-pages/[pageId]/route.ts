import { auth } from '@clerk/nextjs/server';
import { mobileSuccess, mobileError, handleMobileApiError } from '@/lib/api-mobile-utils';
import { currentProfile } from '@/lib/current-profile';
import { db } from '@/lib/db';
import { isTeacher } from '@/lib/teacher';

type Params = { params: Promise<{ pageId: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const teacherAccess = await isTeacher();
    if (!teacherAccess) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const { pageId } = await params;

    const page = await db.landingPage.findUnique({ where: { id: pageId } });
    if (!page) return mobileError('NOT_FOUND', 'Landing page not found', 404);

    return mobileSuccess(page);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_LANDING_PAGE_DETAIL', error);
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const profile = await currentProfile();
    if (!profile || (profile.role !== 'ADMIN' && profile.role !== 'TEACHER')) {
      return mobileError('FORBIDDEN', 'Forbidden', 403);
    }

    const { pageId } = await params;

    const page = await db.landingPage.findUnique({ where: { id: pageId } });
    if (!page) return mobileError('NOT_FOUND', 'Landing page not found', 404);

    if (profile.role !== 'ADMIN' && page.createdBy !== userId) {
      return mobileError('FORBIDDEN', 'Forbidden', 403);
    }

    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.slug !== undefined) data.slug = body.slug;
    if (body.htmlContent !== undefined) data.htmlContent = body.htmlContent;
    if (body.isPublished !== undefined) data.isPublished = body.isPublished;

    const updated = await db.landingPage.update({
      where: { id: pageId },
      data
    });

    return mobileSuccess(updated);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_LANDING_PAGE_UPDATE', error);
  }
}
