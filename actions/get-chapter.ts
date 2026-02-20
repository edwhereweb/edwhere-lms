import { db } from '@/lib/db';
import { type Attachment, type Chapter, type Module } from '@prisma/client';

interface GetChapterProps {
  userId: string;
  courseId: string;
  chapterId: string;
}

type ChapterWithModule = Chapter & { module: Module | null };

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
      const [mux, atts, allChapters] = await Promise.all([
        db.muxData.findUnique({ where: { chapterId } }),
        purchase ? db.attachment.findMany({ where: { courseId } }) : Promise.resolve([]),
        db.chapter.findMany({
          where: {
            courseId,
            isPublished: true
          },
          include: {
            module: true
          }
        }) as Promise<ChapterWithModule[]>
      ]);
      muxData = mux;
      attachments = atts;

      const sortedChapters = allChapters.sort((a, b) => {
        if (a.moduleId && b.moduleId) {
          if (a.moduleId === b.moduleId) return a.position - b.position;
          const moduleAPos = a.module?.position ?? 0;
          const moduleBPos = b.module?.position ?? 0;
          return moduleAPos - moduleBPos;
        }
        if (a.moduleId && !b.moduleId) return -1; // Module chapters come first
        if (!a.moduleId && b.moduleId) return 1;
        return a.position - b.position;
      });

      const currentIndex = sortedChapters.findIndex((c) => c.id === chapterId);
      nextChapter =
        currentIndex !== -1 && currentIndex + 1 < sortedChapters.length
          ? sortedChapters[currentIndex + 1]
          : null;
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
