import { db } from '@/lib/db';
import { canEditCourse } from '@/lib/course-auth';
import { isGoogleMeetEnabled } from '@/lib/integrations/google/auth';

export function canUseMeet(course: { googleMeetEnabled: boolean }): boolean {
  return isGoogleMeetEnabled() && course.googleMeetEnabled;
}

export type CourseLiveAccess =
  | { allowed: false; reason: 'NOT_FOUND' | 'MEET_DISABLED' | 'FORBIDDEN' }
  | { allowed: true; isInstructor: boolean };

/** LMS-side source of truth: only instructors/admins and enrolled learners may see sessions. */
export async function getCourseLiveAccess(
  userId: string,
  courseId: string
): Promise<CourseLiveAccess> {
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { id: true, googleMeetEnabled: true }
  });
  if (!course) return { allowed: false, reason: 'NOT_FOUND' };
  if (!canUseMeet(course)) return { allowed: false, reason: 'MEET_DISABLED' };

  if (await canEditCourse(userId, courseId)) return { allowed: true, isInstructor: true };

  const purchase = await db.purchase.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { id: true }
  });
  if (!purchase) return { allowed: false, reason: 'FORBIDDEN' };
  return { allowed: true, isInstructor: false };
}

export function accessErrorResponse(reason: 'NOT_FOUND' | 'MEET_DISABLED' | 'FORBIDDEN') {
  if (reason === 'NOT_FOUND') return { message: 'Not found', status: 404 };
  if (reason === 'MEET_DISABLED') return { message: 'Google Meet is not enabled', status: 403 };
  return { message: 'Forbidden', status: 403 };
}
