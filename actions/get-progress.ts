import { db } from '@/lib/db';

export const getProgress = async (userId: string, courseId: string): Promise<number> => {
  try {
    const publishedChapters = await db.chapter.findMany({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where: { courseId, isPublished: true, isLibraryAsset: false } as any,
      select: { id: true }
    });

    if (publishedChapters.length === 0) return 0;

    const publishedChapterIds = publishedChapters.map((chapter) => chapter.id);

    const validCompletedChapters = await db.userProgress.count({
      where: {
        userId,
        chapterId: { in: publishedChapterIds },
        isCompleted: true
      }
    });

    return (validCompletedChapters / publishedChapters.length) * 100;
  } catch (error) {
    console.error('[GET_PROGRESS]', error instanceof Error ? error.message : error);
    return 0;
  }
};

export const getProgressBatch = async (
  userId: string,
  courseIds: string[]
): Promise<Map<string, number>> => {
  try {
    if (courseIds.length === 0) return new Map();

    const chapters = await db.chapter.findMany({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where: { courseId: { in: courseIds }, isPublished: true, isLibraryAsset: false } as any,
      select: { id: true, courseId: true }
    });

    const chaptersByCourse = new Map<string, string[]>();
    for (const ch of chapters) {
      const list = chaptersByCourse.get(ch.courseId) || [];
      list.push(ch.id);
      chaptersByCourse.set(ch.courseId, list);
    }

    const allChapterIds = chapters.map((ch) => ch.id);
    const completedProgress = await db.userProgress.findMany({
      where: {
        userId,
        chapterId: { in: allChapterIds },
        isCompleted: true
      },
      select: { chapterId: true }
    });

    const completedSet = new Set(completedProgress.map((p) => p.chapterId));

    const result = new Map<string, number>();
    for (const courseId of courseIds) {
      const courseChapters = chaptersByCourse.get(courseId) || [];
      if (courseChapters.length === 0) {
        result.set(courseId, 0);
        continue;
      }
      const completed = courseChapters.filter((id) => completedSet.has(id)).length;
      result.set(courseId, (completed / courseChapters.length) * 100);
    }

    return result;
  } catch (error) {
    console.error('[GET_PROGRESS_BATCH]', error instanceof Error ? error.message : error);
    return new Map();
  }
};
