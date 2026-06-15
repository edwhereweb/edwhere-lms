import { auth } from '@clerk/nextjs/server';
import { mobileSuccess, mobileError, handleMobileApiError } from '@/lib/api-mobile-utils';
import { currentProfile } from '@/lib/current-profile';
import { db } from '@/lib/db';
import { isTeacher } from '@/lib/teacher';

type Params = { params: Promise<{ chapterId: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const teacherAccess = await isTeacher();
    if (!teacherAccess) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const { chapterId } = await params;

    const chapter = await db.chapter.findFirst({
      where: { id: chapterId, isLibraryAsset: true },
      include: {
        muxData: true,
        course: { select: { title: true } }
      }
    });
    if (!chapter) return mobileError('NOT_FOUND', 'Asset not found', 404);

    return mobileSuccess(chapter);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_ASSET_DETAIL', error);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const profile = await currentProfile();
    if (!profile || profile.role !== 'ADMIN') {
      return mobileError('FORBIDDEN', 'Forbidden', 403);
    }

    const { chapterId } = await params;

    const chapter = await db.chapter.findFirst({
      where: { id: chapterId, isLibraryAsset: true }
    });
    if (!chapter) return mobileError('NOT_FOUND', 'Asset not found', 404);

    await db.chapter.delete({ where: { id: chapterId } });

    return mobileSuccess({ success: true });
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_ASSET_DELETE', error);
  }
}
