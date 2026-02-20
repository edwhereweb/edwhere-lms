import { db } from '@/lib/db';
import { type Course, type Purchase } from '@prisma/client';

type PurchaseWithCourse = Purchase & {
  course: Course;
};

const groupByCourse = (purchases: PurchaseWithCourse[]) => {
  const grouped: { [courseTitle: string]: number } = {};

  for (const purchase of purchases) {
    const courseTitle = purchase.course.title;
    grouped[courseTitle] = (grouped[courseTitle] || 0) + (purchase.course.price ?? 0);
  }

  return grouped;
};

export const getAnalytics = async (userId: string) => {
  try {
    const purchases = await db.purchase.findMany({
      where: {
        course: { userId }
      },
      include: {
        course: {
          select: { title: true, price: true }
        }
      }
    });

    const groupedEarnings = groupByCourse(purchases as PurchaseWithCourse[]);
    const data = Object.entries(groupedEarnings).map(([name, total]) => ({
      name,
      total
    }));

    const totalRevenue = data.reduce((acc, curr) => acc + curr.total, 0);
    const totalSales = purchases.length;

    return { data, totalRevenue, totalSales };
  } catch (error) {
    console.error('[GET_ANALYTICS]', error instanceof Error ? error.message : error);
    return { data: [], totalRevenue: 0, totalSales: 0 };
  }
};
