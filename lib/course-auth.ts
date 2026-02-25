import { db } from '@/lib/db';
import { apiError } from '@/lib/api-utils';

/**
 * Returns true if userId is allowed to edit the course identified by courseId.
 * Allowed if the user is:
 *   1. The course owner (course.userId === userId)
 *   2. An assigned instructor on the course (CourseInstructor record)
 *   3. An ADMIN in the Profile table
 */
export async function canEditCourse(userId: string, courseId: string): Promise<boolean> {
  const profile = await db.profile.findUnique({ where: { userId } });
  if (profile?.role === 'ADMIN') return true;

  const course = await db.course.findFirst({
    where: {
      id: courseId,
      OR: [{ userId }, { instructors: { some: { profile: { userId } } } }]
    },
    select: { id: true }
  });

  return !!course;
}

/**
 * Convenience wrapper — returns a 401/403 JSON response if the user
 * cannot edit the course, or null if they can.
 */
export async function checkCourseEdit(userId: string | null | undefined, courseId: string) {
  if (!userId) return apiError('Unauthorized', 401);

  const allowed = await canEditCourse(userId, courseId);
  if (!allowed) return apiError('Forbidden', 403);

  return null;
}
