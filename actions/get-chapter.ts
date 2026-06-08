import { db } from '@/lib/db';
import { logError } from '@/lib/debug';
import { type Attachment, type Chapter } from '@prisma/client';
import { sortChapters } from '@/lib/chapter-utils';

interface GetChapterProps {
  userId: string;
  courseId: string;
  chapterId: string;
}

type ChapterNavItem = {
  id: string;
  title: string;
  position: number;
  moduleId: string | null;
  module: { position: number } | null;
};

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
    let nextChapter: ChapterNavItem | null = null;

    const hasAccess = chapter.isFree || !!purchase;

    if (hasAccess) {
      const [mux, atts, allChapters] = await Promise.all([
        db.muxData.findUnique({ where: { chapterId } }),
        purchase ? db.attachment.findMany({ where: { courseId } }) : Promise.resolve([]),
        db.chapter.findMany({
          where: {
            courseId,
            isPublished: true,
            isLibraryAsset: false
          },
          select: {
            id: true,
            title: true,
            position: true,
            moduleId: true,
            module: { select: { position: true } }
          }
        }) as Promise<ChapterNavItem[]>
      ]);
      muxData = mux;
      attachments = atts;

      const sortedChapters = sortChapters(allChapters);

      const currentIndex = sortedChapters.findIndex((c) => c.id === chapterId);
      nextChapter =
        currentIndex !== -1 && currentIndex + 1 < sortedChapters.length
          ? sortedChapters[currentIndex + 1]
          : null;
    }

    return {
      chapter: hasAccess
        ? chapter
        : {
            ...chapter,
            description: null,
            content: null,
            htmlContent: null
          },
      course,
      muxData,
      attachments,
      nextChapter,
      userProgress,
      purchase
    };
  } catch (error) {
    logError('GET_CHAPTER', error);
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
