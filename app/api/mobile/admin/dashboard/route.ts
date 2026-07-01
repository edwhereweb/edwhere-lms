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
      recentSubmissionsData,
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
      db.projectSubmission.findMany({
        where: { status: 'PENDING' },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          chapter: {
            select: {
              title: true,
              course: { select: { id: true, title: true } }
            }
          }
        }
      }),
      db.course.count({ where: { pendingApproval: true } }),
      db.projectSubmission.count({ where: { status: 'PENDING' } })
    ]);

    const studentUserIds = Array.from(new Set(recentSubmissionsData.map((s) => s.userId)));
    const studentProfiles = await db.profile.findMany({
      where: { userId: { in: studentUserIds } },
      select: { userId: true, name: true }
    });
    const nameMap = new Map(studentProfiles.map((p) => [p.userId, p.name]));

    const recentSubmissions = recentSubmissionsData.map((s) => ({
      id: s.id,
      studentName: nameMap.get(s.userId) ?? 'Unknown',
      courseTitle: s.chapter.course.title,
      courseId: s.chapter.course.id,
      chapterId: s.chapterId,
      chapterTitle: s.chapter.title,
      driveUrl: s.driveUrl,
      status: s.status,
      date: s.createdAt.toISOString()
    }));

    return mobileSuccess({
      totalCourses,
      totalStudents,
      activeBatches,
      pendingReviews,
      recentSubmissions,
      pendingApprovals
    });
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_DASHBOARD', error);
  }
}
