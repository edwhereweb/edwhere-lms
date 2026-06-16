import { auth } from '@clerk/nextjs/server';
import { mobileSuccess, mobileError, handleMobileApiError } from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';
import { isTeacher } from '@/lib/teacher';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const teacherAccess = await isTeacher();
    if (!teacherAccess) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const now = new Date();

    const [
      totalCourses,
      totalStudents,
      activeBatches,
      recentPurchases,
      pendingApprovals,
      pendingReviews
    ] = await Promise.all([
      db.course.count(),
      db.profile.count({ where: { role: 'STUDENT' } }),
      db.batch.count({
        where: {
          startDate: { lte: now },
          OR: [{ endDate: { gte: now } }, { endDate: null }]
        }
      }),
      db.purchase.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          course: { select: { title: true } }
        }
      }),
      db.course.count({ where: { pendingApproval: true } }),
      db.projectSubmission.count({ where: { status: 'PENDING' } })
    ]);

    const studentUserIds = Array.from(new Set(recentPurchases.map((p) => p.userId)));
    const studentProfiles = await db.profile.findMany({
      where: { userId: { in: studentUserIds } },
      select: { userId: true, name: true }
    });
    const nameMap = new Map(studentProfiles.map((p) => [p.userId, p.name]));

    const recentEnrolments = recentPurchases.map((p) => ({
      id: p.id,
      studentName: nameMap.get(p.userId) ?? 'Unknown',
      courseTitle: p.course.title,
      date: p.createdAt.toISOString()
    }));

    return mobileSuccess({
      totalCourses,
      totalStudents,
      activeBatches,
      pendingReviews,
      recentEnrolments,
      pendingApprovals
    });
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_DASHBOARD', error);
  }
}
