import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import getSafeProfile from '@/actions/get-safe-profile';
import { apiError, handleApiError, validateBody } from '@/lib/api-utils';
import { updateChapterSchema } from '@/lib/validations';

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
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await getSafeProfile();
    const isAdmin = profile?.role === 'ADMIN';
    const isTeacher = profile?.role === 'TEACHER';

    if (!profile || (!isAdmin && !isTeacher)) return apiError('Forbidden', 403);

    const hasAccess = await canAccessChapter(params.chapterId, userId, profile.id, isAdmin);
    if (!hasAccess) return apiError('Forbidden', 403);

    const chapter = await db.chapter.findUnique({
      where: { id: params.chapterId },
      include: {
        course: { select: { id: true, title: true } },
        muxData: true
      }
    });

    if (!chapter) return apiError('Not Found', 404);

    return NextResponse.json(chapter);
  } catch (error) {
    return handleApiError('ASSET_LIBRARY_CHAPTER_GET', error);
  }
}

export async function PATCH(req: Request, { params }: { params: { chapterId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await getSafeProfile();
    const isAdmin = profile?.role === 'ADMIN';
    const isTeacher = profile?.role === 'TEACHER';

    if (!profile || (!isAdmin && !isTeacher)) return apiError('Forbidden', 403);

    const hasAccess = await canAccessChapter(params.chapterId, userId, profile.id, isAdmin);
    if (!hasAccess) return apiError('Forbidden', 403);

    const body = await req.json();
    const validation = validateBody(updateChapterSchema, body);
    if (!validation.success) return validation.response;

    const chapter = await db.chapter.update({
      where: { id: params.chapterId },
      data: {
        ...validation.data,
        youtubeVideoId: validation.data.youtubeVideoId ?? null
      }
    });

    return NextResponse.json(chapter);
  } catch (error) {
    return handleApiError('ASSET_LIBRARY_CHAPTER_PATCH', error);
  }
}
