import { getProgressBatch } from '@/actions/get-progress';
import { db } from '@/lib/db';
import { CourseWithProgressWithCategory } from '@/types';

type GetCourses = {
  userId: string;
  title?: string;
  categoryId?: string;
};

export const getCourses = async ({
  userId,
  title,
  categoryId
}: GetCourses): Promise<CourseWithProgressWithCategory[]> => {
  try {
    const courses = await db.course.findMany({
      where: {
        isPublished: true,
        ...(title && {
          title: { contains: title, mode: 'insensitive' as const }
        }),
        ...(categoryId === 'uncategorized'
          ? { categoryId: null }
          : categoryId
            ? { categoryId }
            : {})
      },
      include: {
        category: true,
        chapters: {
          where: { isPublished: true },
          select: { id: true }
        },
        purchases: {
          where: { userId }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const purchasedCourseIds = courses.filter((c) => c.purchases.length > 0).map((c) => c.id);

    const progressMap = await getProgressBatch(userId, purchasedCourseIds);

    return courses.map((course) => ({
      ...course,
      progress: course.purchases.length === 0 ? null : (progressMap.get(course.id) ?? 0)
    }));
  } catch (error) {
    console.error('[GET_COURSES]', error instanceof Error ? error.message : error);
    return [];
  }
};
