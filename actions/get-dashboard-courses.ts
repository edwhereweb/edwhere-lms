import { db } from '@/lib/db';
import { logError } from '@/lib/debug';
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

    const rawCourses = purchasedCourses.map((purchase) => purchase.course);

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
