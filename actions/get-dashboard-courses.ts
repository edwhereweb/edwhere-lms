import { db } from '@/lib/db';
import { type Category, type Chapter, type Course } from '@prisma/client';
import { getProgressBatch } from './get-progress';

type CourseWithProgressWithCategory = Course & {
  category: Category;
  chapters: Chapter[];
  progress: number | null;
};

type DashboardCourses = {
  completedCourses: CourseWithProgressWithCategory[];
  coursesInProgress: CourseWithProgressWithCategory[];
};

export const getDashboardCourses = async (userId: string): Promise<DashboardCourses> => {
  try {
    const purchasedCourses = await db.purchase.findMany({
      where: { userId },
      select: {
        course: {
          include: {
            category: true,
            chapters: {
              where: { isPublished: true }
            }
          }
        }
      }
    });

    const courses = purchasedCourses.map(
      (purchase) => purchase.course
    ) as CourseWithProgressWithCategory[];

    const courseIds = courses.map((c) => c.id);
    const progressMap = await getProgressBatch(userId, courseIds);

    for (const course of courses) {
      course.progress = progressMap.get(course.id) ?? 0;
    }

    const completedCourses = courses.filter((course) => course.progress === 100);
    const coursesInProgress = courses.filter((course) => (course.progress ?? 0) < 100);

    return { completedCourses, coursesInProgress };
  } catch (error) {
    console.error('[GET_DASHBOARD_COURSES]', error instanceof Error ? error.message : error);
    return { completedCourses: [], coursesInProgress: [] };
  }
};
