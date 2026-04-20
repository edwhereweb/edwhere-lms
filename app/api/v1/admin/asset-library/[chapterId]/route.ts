import Mux from '@mux/mux-node';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import getSafeProfile from '@/actions/get-safe-profile';
import { apiOk, apiErr, validateRequest, handleRouteError } from '@/lib/api-response';
import { updateChapterSchema } from '@/lib/validations';

function getMuxVideo() {
  const { Video } = new Mux(process.env.MUX_TOKEN_ID!, process.env.MUX_TOKEN_SECRET!);
  return Video;
}

/** Return true if the current profile has access to the given chapter. */
async function canAccessChapter(
  chapterId: string,
  userId: string,
  profileId: string,
  isAdmin: boolean
): Promise<boolean> {
  if (isAdmin) return true;

  // Teacher: chapter must belong to a course they own or instruct
  const chapter = await db.chapter.findUnique({
    where: { id: chapterId },
    select: {
      course: {
        select: {
          userId: true,
          instructors: { select: { profileId: true } }
        }
      }
    }
  });

  if (!chapter) return false;
  const { course } = chapter;
  return course.userId === userId || course.instructors.some((i) => i.profileId === profileId);
}

export async function GET(_req: Request, { params }: { params: { chapterId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return apiErr('UNAUTHORIZED', 'Unauthorized', 401);

    const profile = await getSafeProfile();
    const isAdmin = profile?.role === 'ADMIN';
    const isTeacher = profile?.role === 'TEACHER';

    if (!profile || (!isAdmin && !isTeacher)) return apiErr('FORBIDDEN', 'Forbidden', 403);

    const hasAccess = await canAccessChapter(params.chapterId, userId, profile.id, isAdmin);
    if (!hasAccess) return apiErr('FORBIDDEN', 'Forbidden', 403);

    const chapter = await db.chapter.findUnique({
      where: { id: params.chapterId },
      include: {
        course: { select: { id: true, title: true } },
        muxData: true
      }
    });

    if (!chapter) return apiErr('NOT_FOUND', 'Not found', 404);

    return apiOk(chapter);
  } catch (error) {
    return handleRouteError('ASSET_LIBRARY_CHAPTER_GET', error);
  }
}

export async function PATCH(req: Request, { params }: { params: { chapterId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return apiErr('UNAUTHORIZED', 'Unauthorized', 401);

    const profile = await getSafeProfile();
    const isAdmin = profile?.role === 'ADMIN';
    const isTeacher = profile?.role === 'TEACHER';

    if (!profile || (!isAdmin && !isTeacher)) return apiErr('FORBIDDEN', 'Forbidden', 403);

    const hasAccess = await canAccessChapter(params.chapterId, userId, profile.id, isAdmin);
    if (!hasAccess) return apiErr('FORBIDDEN', 'Forbidden', 403);

    const body = await req.json();
    const validation = validateRequest(updateChapterSchema, body);
    if (!validation.success) return validation.response;

    const chapter = await db.chapter.update({
      where: { id: params.chapterId },
      data: {
        ...validation.data,
        youtubeVideoId: validation.data.youtubeVideoId ?? null
      }
    });

    return apiOk(chapter);
  } catch (error) {
    return handleRouteError('ASSET_LIBRARY_CHAPTER_PATCH', error);
  }
}

export async function DELETE(_req: Request, { params }: { params: { chapterId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return apiErr('UNAUTHORIZED', 'Unauthorized', 401);

    const profile = await getSafeProfile();
    const isAdmin = profile?.role === 'ADMIN';
    const isTeacher = profile?.role === 'TEACHER';

    if (!profile || (!isAdmin && !isTeacher)) return apiErr('FORBIDDEN', 'Forbidden', 403);

    const hasAccess = await canAccessChapter(params.chapterId, userId, profile.id, isAdmin);
    if (!hasAccess) return apiErr('FORBIDDEN', 'Forbidden', 403);

    const chapter = await db.chapter.findUnique({
      where: { id: params.chapterId },
      select: { id: true, courseId: true }
    });

    if (!chapter) return apiErr('NOT_FOUND', 'Not found', 404);

    const existingMuxData = await db.muxData.findFirst({
      where: { chapterId: params.chapterId }
    });

    if (existingMuxData) {
      const isUsedElsewhere = await db.muxData.findFirst({
        where: {
          assetId: existingMuxData.assetId,
          chapterId: { not: params.chapterId }
        }
      });

      if (!isUsedElsewhere) {
        try {
          await getMuxVideo().Assets.del(existingMuxData.assetId);
        } catch {
          // Mux asset may already be deleted.
        }
      }

      await db.muxData.delete({ where: { id: existingMuxData.id } });
    }

    const deletedChapter = await db.chapter.delete({
      where: { id: params.chapterId }
    });

    const publishedCount = await db.chapter.count({
      where: {
        courseId: chapter.courseId,
        isPublished: true
      }
    });

    if (publishedCount === 0) {
      await db.course.update({
        where: { id: chapter.courseId },
        data: { isPublished: false }
      });
    }

    return apiOk(deletedChapter);
  } catch (error) {
    return handleRouteError('ASSET_LIBRARY_CHAPTER_DELETE', error);
  }
}
