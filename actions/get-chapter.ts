import { db } from '@/lib/db';
import { type Attachment, type Chapter } from '@prisma/client';

interface GetChapterProps {
  userId: string;
  courseId: string;
  chapterId: string;
}

export const getChapter = async ({ userId, courseId, chapterId }: GetChapterProps) => {
  try {
    const [purchase, course, chapter, userProgress] = await Promise.all([
      db.purchase.findUnique({
        where: { userId_courseId: { userId, courseId } }
      }),
      db.course.findUnique({
        where: { isPublished: true, id: courseId },
        select: { price: true }
      }),
      db.chapter.findUnique({
        where: { id: chapterId, isPublished: true }
      }),
      db.userProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId } }
      })
    ]);

    if (!chapter || !course) {
      throw new Error('Chapter or course not found');
    }

    let muxData = null;
    let attachments: Attachment[] = [];
    let nextChapter: Chapter | null = null;

    const hasAccess = chapter.isFree || !!purchase;

    if (hasAccess) {
      const [mux, atts, next] = await Promise.all([
        db.muxData.findUnique({ where: { chapterId } }),
        purchase ? db.attachment.findMany({ where: { courseId } }) : Promise.resolve([]),
        db.chapter.findFirst({
          where: {
            courseId,
            isPublished: true,
            position: { gt: chapter.position }
          },
          orderBy: { position: 'asc' }
        })
      ]);
      muxData = mux;
      attachments = atts;
      nextChapter = next;
    }

    return {
      chapter,
      course,
      muxData,
      attachments,
      nextChapter,
      userProgress,
      purchase
    };
  } catch (error) {
    console.error('[GET_CHAPTER]', error instanceof Error ? error.message : error);
    return {
      chapter: null,
      course: null,
      muxData: null,
      attachments: null,
      nextChapter: null,
      userProgress: null,
      purchase: null
    };
  }
};
