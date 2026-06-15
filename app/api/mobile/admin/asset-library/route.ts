import { auth } from '@clerk/nextjs/server';
import { mobileSuccess, mobileError, handleMobileApiError } from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';
import { isTeacher } from '@/lib/teacher';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const teacherAccess = await isTeacher();
    if (!teacherAccess) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');

    const chapters = await db.chapter.findMany({
      where: {
        isLibraryAsset: true,
        ...(search ? { title: { contains: search, mode: 'insensitive' as const } } : {})
      },
      include: { muxData: true },
      orderBy: { createdAt: 'desc' }
    });

    const assets = chapters.map((ch) => ({
      id: ch.id,
      title: ch.title,
      contentType: ch.contentType,
      isPublished: ch.isPublished,
      createdAt: ch.createdAt,
      muxData: ch.muxData ? { playbackId: ch.muxData.playbackId } : null
    }));

    return mobileSuccess(assets);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_ASSET_LIBRARY_LIST', error);
  }
}
