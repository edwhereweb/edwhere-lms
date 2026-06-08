import { db } from '@/lib/db';
import { logError } from '@/lib/debug';
import { type Course, type Purchase } from '@prisma/client';
import { SafeProfile } from '@/types';

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

export const getAnalytics = async (userId: string, profile: SafeProfile) => {
  try {
    const isAdmin = profile.role === 'ADMIN';

    const courseWhere = isAdmin
      ? {}
      : {
          OR: [{ userId }, { instructors: { some: { profileId: profile.id } } }]
        };

    // 1. Revenue & Sales
    const purchases = await db.purchase.findMany({
      where: {
        course: courseWhere
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

    // Get relevant course IDs for other queries
    const courses = await db.course.findMany({
      where: courseWhere,
      select: { id: true }
    });
    const courseIds = courses.map((c) => c.id);

    // 2. Pending Messages
    const lastReads = await db.mentorLastRead.findMany({
      where: {
        instructorId: profile.id,
        courseId: { in: courseIds },
        studentId: { not: null }
      }
    });

    const unreadCounts = await Promise.all(
      courseIds.map(async (courseId) => {
        const lastRead = lastReads.find((lr) => lr.courseId === courseId);
        return db.courseMessage.count({
          where: {
            courseId,
            ...(lastRead ? { createdAt: { gt: lastRead.lastReadAt } } : {}),
            NOT: { authorId: profile.id }
          }
        });
      })
    );
    const pendingMessages = unreadCounts.reduce((a, b) => a + b, 0);

    // 3. Pending Submissions
    const pendingSubmissions = await db.projectSubmission.count({
      where: {
        status: 'PENDING',
        ...(isAdmin ? {} : { chapter: { courseId: { in: courseIds } } })
      }
    });

    // 4. Average Attendance
    const attendances = await db.sessionAttendance.findMany({
      where: isAdmin ? {} : { session: { instructorId: userId } },
      select: { status: true }
    });

    let avgAttendance = 0;
    if (attendances.length > 0) {
      const presentOrLate = attendances.filter(
        (a) => a.status === 'PRESENT' || a.status === 'LATE'
      ).length;
      avgAttendance = Math.round((presentOrLate / attendances.length) * 100);
    }

    // 5. Pending Approvals (Admin only)
    const pendingApprovals = isAdmin
      ? await db.course.count({ where: { pendingApproval: true } })
      : 0;

    return {
      data,
      totalRevenue,
      totalSales,
      pendingMessages,
      pendingSubmissions,
      avgAttendance,
      pendingApprovals
    };
  } catch (error) {
    logError('GET_ANALYTICS', error);
    return {
      data: [],
      totalRevenue: 0,
      totalSales: 0,
      pendingMessages: 0,
      pendingSubmissions: 0,
      avgAttendance: 0,
      pendingApprovals: 0
    };
  }
};
