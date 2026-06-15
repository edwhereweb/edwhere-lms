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

    const instructorRecords = await db.courseInstructor.findMany({
      where: { profileId: profile.id },
      include: {
        course: { select: { id: true, title: true } }
      }
    });

    const ownedCourses = await db.course.findMany({
      where: { userId },
      select: { id: true, title: true }
    });

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

    const results = await Promise.all(
      Array.from(courseMap.values()).map(async (course) => {
        const courseLastReads = lastReadMap.get(course.id);
        let oldestRead = new Date(0);
        if (courseLastReads && courseLastReads.size > 0) {
          oldestRead = new Date(
            Math.min(...Array.from(courseLastReads.values()).map((d) => d.getTime()))
          );
        }

        const unreadCount = await db.courseMessage.count({
          where: {
            courseId: course.id,
            createdAt: { gt: oldestRead },
            authorId: { not: profile.id }
          }
        });

        return {
          courseId: course.id,
          courseTitle: course.title,
          unreadCount
        };
      })
    );

    return mobileSuccess(results);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_MENTOR_CONNECT_LIST', error);
  }
}
