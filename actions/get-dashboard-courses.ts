import { db } from '@/lib/db';
import { logError } from '@/lib/debug';
import { type Category, type Course } from '@prisma/client';
import { getProgressBatch } from './get-progress';
import { sortChapters } from '@/lib/chapter-utils';

type CourseWithProgressWithCategory = Course & {
  category: Category;
  chapters: { id: string }[];
  progress: number | null;
  resumeChapterId?: string | null;
  resumeChapterTitle?: string | null;
};

type DashboardCourses = {
  completedCourses: CourseWithProgressWithCategory[];
  coursesInProgress: CourseWithProgressWithCategory[];
};

export const getDashboardCourses = async (userId: string): Promise<DashboardCourses> => {
  try {
    // 1. Courses acquired via direct purchase (includes resume state)
    const purchasedCourses = await db.purchase.findMany({
      where: { userId },
      select: {
        lastVisitedChapterId: true,
        lastVisitedAt: true,
        course: {
          include: {
            category: true,
            chapters: {
              where: { isPublished: true },
              select: {
                id: true,
                title: true,
                position: true,
                moduleId: true,
                module: { select: { position: true } }
              }
            }
          }
        }
      }
    });

    // 2. Courses acquired via batch enrollment
    const batchEnrollments = await db.batchEnrollment.findMany({
      where: { userId },
      select: {
        batch: {
          select: {
            courses: {
              select: {
                course: {
                  include: {
                    category: true,
                    chapters: {
                      where: { isPublished: true },
                      select: {
                        id: true,
                        title: true,
                        position: true,
                        moduleId: true,
                        module: { select: { position: true } }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    // Collect all batch courses into a flat list, de-duplicate by courseId
    const batchCourseMap = new Map<string, (typeof purchasedCourses)[number]['course']>();
    for (const enrollment of batchEnrollments) {
      for (const bc of enrollment.batch.courses) {
        if (!batchCourseMap.has(bc.course.id)) {
          batchCourseMap.set(bc.course.id, bc.course);
        }
      }
    }

    // Merge: purchased courses take precedence; add batch courses not already purchased
    const purchasedIds = new Set(purchasedCourses.map((p) => p.course.id));

    const rawCourses = [
      ...purchasedCourses.map((p) => p.course),
      ...Array.from(batchCourseMap.values()).filter((c) => !purchasedIds.has(c.id))
    ];

    const courseIds = rawCourses.map((c) => c.id);
    const { progressMap, completedSet } = await getProgressBatch(userId, courseIds);

    // Build resume map for purchased courses
    const resumeMap = new Map<string, { chapterId: string | null; title: string | null }>();
    for (const p of purchasedCourses) {
      const sortedChapters = sortChapters(p.course.chapters);

      let targetChapter = null;
      if (p.lastVisitedChapterId && !completedSet.has(p.lastVisitedChapterId)) {
        targetChapter = sortedChapters.find((c) => c.id === p.lastVisitedChapterId);
      }

      // Fallback to first incomplete if last visited is completed or doesn't exist
      if (!targetChapter) {
        targetChapter = sortedChapters.find((c) => !completedSet.has(c.id));
      }

      if (targetChapter) {
        resumeMap.set(p.course.id, {
          chapterId: targetChapter.id,
          title: targetChapter.title
        });
      }
    }

    const courses = rawCourses.map((course) => {
      const resume = resumeMap.get(course.id);
      return {
        ...course,
        progress: progressMap.get(course.id) ?? 0,
        resumeChapterId: resume?.chapterId ?? null,
        resumeChapterTitle: resume?.title ?? null
      };
    }) as CourseWithProgressWithCategory[];

    const completedCourses = courses.filter((course) => course.progress === 100);
    const coursesInProgress = courses.filter((course) => (course.progress ?? 0) < 100);

    return { completedCourses, coursesInProgress };
  } catch (error) {
    logError('GET_DASHBOARD_COURSES', error);
    return { completedCourses: [], coursesInProgress: [] };
  }
};
