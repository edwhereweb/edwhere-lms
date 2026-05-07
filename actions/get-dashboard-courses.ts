import { db } from '@/lib/db';
import { logError } from '@/lib/debug';
import { type Category, type Course } from '@prisma/client';
import { getProgressBatch } from './get-progress';

type CourseWithProgressWithCategory = Course & {
  category: Category;
  chapters: { id: string }[];
  progress: number | null;
};

type DashboardCourses = {
  completedCourses: CourseWithProgressWithCategory[];
  coursesInProgress: CourseWithProgressWithCategory[];
};

export const getDashboardCourses = async (userId: string): Promise<DashboardCourses> => {
  try {
    // 1. Courses acquired via direct purchase
    const purchasedCourses = await db.purchase.findMany({
      where: { userId },
      select: {
        course: {
          include: {
            category: true,
            chapters: {
              where: { isPublished: true },
              select: { id: true }
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
                      select: { id: true }
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
    const progressMap = await getProgressBatch(userId, courseIds);

    const courses = rawCourses.map((course) => ({
      ...course,
      progress: progressMap.get(course.id) ?? 0
    })) as CourseWithProgressWithCategory[];

    const completedCourses = courses.filter((course) => course.progress === 100);
    const coursesInProgress = courses.filter((course) => (course.progress ?? 0) < 100);

    return { completedCourses, coursesInProgress };
  } catch (error) {
    logError('GET_DASHBOARD_COURSES', error);
    return { completedCourses: [], coursesInProgress: [] };
  }
};
