import { db } from '@/lib/db';
import { logError } from '@/lib/debug';
import { SafeProfile } from '@/types';

export const getAnalytics = async (userId: string, profile: SafeProfile) => {
  try {
    const isAdmin = profile.role === 'ADMIN';

    const courseWhere = isAdmin
      ? {}
      : {
          OR: [{ userId }, { instructors: { some: { profileId: profile.id } } }]
        };

    const [courses, lastReads] = await Promise.all([
      db.course.findMany({
        where: courseWhere,
        select: { id: true, title: true, price: true }
      }),
      db.mentorLastRead.findMany({
        where: { instructorId: profile.id, studentId: { not: null } },
        select: { courseId: true, lastReadAt: true }
      })
    ]);
    const courseIds = courses.map((c) => c.id);

    // First last-read per course, matching the previous per-course lookup.
    const courseIdSet = new Set(courseIds);
    const lastReadByCourse = new Map<string, Date>();
    for (const lr of lastReads) {
      if (courseIdSet.has(lr.courseId) && !lastReadByCourse.has(lr.courseId)) {
        lastReadByCourse.set(lr.courseId, lr.lastReadAt);
      }
    }
    const unreadCourseIds = courseIds.filter((id) => !lastReadByCourse.has(id));
    const notMine = { NOT: { authorId: profile.id } };

    const [
      salesByCourse,
      unreadSinceLastRead,
      unreadNeverRead,
      pendingSubmissions,
      totalAttendance,
      presentAttendance,
      pendingApprovals
    ] = await Promise.all([
      db.purchase.groupBy({
        by: ['courseId'],
        where: { courseId: { in: courseIds } },
        _count: { _all: true }
      }),
      lastReadByCourse.size
        ? db.courseMessage.count({
            where: {
              OR: Array.from(lastReadByCourse, ([courseId, lastReadAt]) => ({
                courseId,
                createdAt: { gt: lastReadAt }
              })),
              ...notMine
            }
          })
        : 0,
      unreadCourseIds.length
        ? db.courseMessage.count({ where: { courseId: { in: unreadCourseIds }, ...notMine } })
        : 0,
      db.projectSubmission.count({
        where: {
          status: 'PENDING',
          ...(isAdmin ? {} : { chapter: { courseId: { in: courseIds } } })
        }
      }),
      db.sessionAttendance.count({
        where: isAdmin ? {} : { session: { instructorId: userId } }
      }),
      db.sessionAttendance.count({
        where: {
          status: { in: ['PRESENT', 'LATE'] },
          ...(isAdmin ? {} : { session: { instructorId: userId } })
        }
      }),
      isAdmin ? db.course.count({ where: { pendingApproval: true } }) : 0
    ]);

    // Revenue = list price x sales, grouped by title (same as before).
    const courseById = new Map(courses.map((c) => [c.id, c]));
    const grouped: Record<string, number> = {};
    let totalSales = 0;
    for (const row of salesByCourse) {
      const course = courseById.get(row.courseId);
      if (!course) continue;
      totalSales += row._count._all;
      grouped[course.title] = (grouped[course.title] ?? 0) + row._count._all * (course.price ?? 0);
    }
    const data = Object.entries(grouped).map(([name, total]) => ({ name, total }));
    const totalRevenue = data.reduce((acc, curr) => acc + curr.total, 0);

    const avgAttendance = totalAttendance
      ? Math.round((presentAttendance / totalAttendance) * 100)
      : 0;

    return {
      data,
      totalRevenue,
      totalSales,
      pendingMessages: unreadSinceLastRead + unreadNeverRead,
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
