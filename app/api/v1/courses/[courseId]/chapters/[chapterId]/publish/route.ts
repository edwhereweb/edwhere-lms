import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { checkCourseEdit } from '@/lib/course-auth';
import { apiOk, apiErr, handleRouteError } from '@/lib/api-response';

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
      return apiErr('VALIDATION', 'Missing required fields', 400);
    }

    const contentType = chapter.contentType ?? 'VIDEO_MUX';

    if (contentType === 'HANDS_ON_PROJECT') {
      const htmlContent = (chapter as unknown as { htmlContent?: string }).htmlContent;
      if (!chapter.content && !htmlContent) {
        return apiErr('VALIDATION', 'Missing task statement', 400);
      }
    } else if (contentType === 'TEXT') {
      if (!chapter.description || !chapter.content) {
        return apiErr('VALIDATION', 'Missing required fields', 400);
      }
    } else if (contentType === 'VIDEO_YOUTUBE') {
      if (!chapter.description || !chapter.youtubeVideoId) {
        return apiErr('VALIDATION', 'Missing required fields', 400);
      }
    } else if (contentType === 'HTML_EMBED') {
      if (!chapter.description || !(chapter as unknown as { htmlContent?: string }).htmlContent) {
        return apiErr('VALIDATION', 'Missing required fields', 400);
      }
    } else if (contentType === 'PDF_DOCUMENT') {
      if (!chapter.description || !(chapter as unknown as { pdfUrl?: string }).pdfUrl) {
        return apiErr('VALIDATION', 'Missing required fields', 400);
      }
    } else if (contentType === 'EVALUATION') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const quizWithQuestions = await (db as any).quiz.findUnique({
        where: { chapterId: params.chapterId },
        include: { questions: true }
      });
      if (!chapter.description || !quizWithQuestions?.questions?.length) {
        return apiErr('VALIDATION', 'Quiz must have at least one question', 400);
      }
    } else {
      // VIDEO_MUX (default / legacy)
      const hasVideo = (!!chapter.videoUrl && !!muxData) || !!chapter.youtubeVideoId;
      if (!chapter.description || !hasVideo) {
        return apiErr('VALIDATION', 'Missing required fields', 400);
      }
    }

    const publishedChapter = await db.chapter.update({
      where: { id: params.chapterId, courseId: params.courseId },
      data: { isPublished: true }
    });

    revalidatePath(`/courses/${params.courseId}`);
    return apiOk(publishedChapter);
  } catch (error) {
    return handleRouteError('CHAPTER_PUBLISH', error);
  }
}
