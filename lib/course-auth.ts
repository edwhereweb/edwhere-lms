import { db } from '@/lib/db';
import { apiErr } from '@/lib/api-response';

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
 * Returns a 401/403 JSON response if the user cannot edit the course, or null if they can.
 */
export async function checkCourseEdit(userId: string | null | undefined, courseId: string) {
  if (!userId) return apiErr('UNAUTHORIZED', 'Unauthorized', 401);

  const allowed = await canEditCourse(userId, courseId);
  if (!allowed) return apiErr('FORBIDDEN', 'Forbidden', 403);

  return null;
}
