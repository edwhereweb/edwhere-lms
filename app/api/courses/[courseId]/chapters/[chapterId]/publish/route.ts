import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
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

    if (!chapter || !chapter.title) {
      return apiError('Missing required fields', 400);
    }

    const contentType = chapter.contentType ?? 'VIDEO_MUX';

    if (contentType === 'HANDS_ON_PROJECT') {
      const htmlContent = (chapter as unknown as { htmlContent?: string }).htmlContent;
      if (!chapter.content && !htmlContent) {
        return apiError('Missing task statement', 400);
      }
    } else if (contentType === 'TEXT') {
      if (!chapter.description || !chapter.content) {
        return apiError('Missing required fields', 400);
      }
    } else if (contentType === 'VIDEO_YOUTUBE') {
      if (!chapter.description || !chapter.youtubeVideoId) {
        return apiError('Missing required fields', 400);
      }
    } else if (contentType === 'HTML_EMBED') {
      if (!chapter.description || !(chapter as unknown as { htmlContent?: string }).htmlContent) {
        return apiError('Missing required fields', 400);
      }
    } else if (contentType === 'PDF_DOCUMENT') {
      if (!chapter.description || !(chapter as unknown as { pdfUrl?: string }).pdfUrl) {
        return apiError('Missing required fields', 400);
      }
    } else {
      // VIDEO_MUX (default / legacy)
      const hasVideo = (!!chapter.videoUrl && !!muxData) || !!chapter.youtubeVideoId;
      if (!chapter.description || !hasVideo) {
        return apiError('Missing required fields', 400);
      }
    }

    const publishedChapter = await db.chapter.update({
      where: { id: params.chapterId, courseId: params.courseId },
      data: { isPublished: true }
    });

    revalidatePath(`/courses/${params.courseId}`);
    return NextResponse.json(publishedChapter);
  } catch (error) {
    return handleApiError('CHAPTER_PUBLISH', error);
  }
}
