import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkCourseEdit } from '@/lib/course-auth';
import { apiError, handleApiError } from '@/lib/api-utils';

export async function PATCH(
  req: Request,
  { params }: { params: { courseId: string; chapterId: string } }
) {
  try {
    const { userId } = await auth();

    const denied = await checkCourseEdit(userId, params.courseId);
    if (denied) return denied;

    const [chapter, muxData] = await Promise.all([
      db.chapter.findUnique({
        where: { id: params.chapterId, courseId: params.courseId }
      }),
      db.muxData.findUnique({
        where: { chapterId: params.chapterId }
      })
    ]);

    if (!chapter || !chapter.title || !chapter.description) {
      return apiError('Missing required fields', 400);
    }

    const hasVideo = (!!chapter.videoUrl && !!muxData) || !!chapter.youtubeVideoId;

    if (!hasVideo) {
      return apiError('Missing required fields', 400);
    }

    const publishedChapter = await db.chapter.update({
      where: { id: params.chapterId, courseId: params.courseId },
      data: { isPublished: true }
    });

    return NextResponse.json(publishedChapter);
  } catch (error) {
    return handleApiError('CHAPTER_PUBLISH', error);
  }
}
