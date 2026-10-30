import { auth } from '@clerk/nextjs/server';
import { mobileSuccess, mobileError, handleMobileApiError } from '@/lib/api-mobile-utils';
import { currentProfile } from '@/lib/current-profile';
import { db } from '@/lib/db';
import { isTeacher } from '@/lib/teacher';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const teacherAccess = await isTeacher();
    if (!teacherAccess) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const profile = await currentProfile();
    if (!profile) return mobileError('NOT_FOUND', 'Profile not found', 404);

    const [instructorRecords, ownedCourses] = await Promise.all([
      db.courseInstructor.findMany({
        where: { profileId: profile.id },
        include: {
          course: { select: { id: true, title: true } }
        }
      }),
      db.course.findMany({
        where: { userId },
        select: { id: true, title: true }
      })
    ]);

    const courseMap = new Map<string, { id: string; title: string }>();
    for (const r of instructorRecords) {
      courseMap.set(r.course.id, r.course);
    }
    for (const c of ownedCourses) {
      courseMap.set(c.id, c);
    }

    const courseIds = Array.from(courseMap.keys());

    const lastReads = await db.mentorLastRead.findMany({
      where: { instructorId: profile.id, courseId: { in: courseIds } }
    });

    const lastReadMap = new Map<string, Map<string | null, Date>>();
    for (const lr of lastReads) {
      if (!lastReadMap.has(lr.courseId)) lastReadMap.set(lr.courseId, new Map());
      lastReadMap.get(lr.courseId)!.set(lr.studentId, lr.lastReadAt);
    }

    const unreadFilters = courseIds.map((courseId) => {
      const courseLastReads = lastReadMap.get(courseId);
      let oldestRead = new Date(0);
      if (courseLastReads && courseLastReads.size > 0) {
        oldestRead = new Date(
          Math.min(...Array.from(courseLastReads.values()).map((d) => d.getTime()))
        );
      }
      return { courseId, createdAt: { gt: oldestRead } };
    });

    // One grouped query instead of one count per course.
    const unreadGroups = unreadFilters.length
      ? await db.courseMessage.groupBy({
          by: ['courseId'],
          where: { OR: unreadFilters, authorId: { not: profile.id } },
          _count: { _all: true }
        })
      : [];
    const unreadByCourse = new Map(unreadGroups.map((g) => [g.courseId, g._count._all]));

    const results = Array.from(courseMap.values()).map((course) => ({
      courseId: course.id,
      courseTitle: course.title,
      unreadCount: unreadByCourse.get(course.id) ?? 0
    }));

    return mobileSuccess(results);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_MENTOR_CONNECT_LIST', error);
  }
}
