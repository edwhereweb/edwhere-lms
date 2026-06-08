import { db } from '@/lib/db';

/**
 * Returns true if the given Clerk userId can create/update/delete batches.
 * Both ADMIN and TEACHER roles are permitted to manage batches.
 * Enrollment (adding students) is a separate check — see canEnrollInBatch.
 */
export async function canManageBatch(userId: string): Promise<boolean> {
  const profile = await db.profile.findUnique({ where: { userId }, select: { role: true } });
  return profile?.role === 'ADMIN' || profile?.role === 'TEACHER';
}

/**
 * Returns true if the given Clerk userId can enroll or remove students from a batch.
 * Per requirements, only ADMIN and TEACHER roles may enroll students — students cannot self-enroll.
 */
export async function canEnrollInBatch(userId: string): Promise<boolean> {
  const profile = await db.profile.findUnique({ where: { userId }, select: { role: true } });
  return profile?.role === 'ADMIN' || profile?.role === 'TEACHER';
}

/**
 * Returns true if the given Clerk userId is allowed to toggle allowSameDayOfflineSession on a Course.
 * This is an ADMIN-only capability.
 */
export async function canToggleSameDayOffline(userId: string): Promise<boolean> {
  const profile = await db.profile.findUnique({ where: { userId }, select: { role: true } });
  return profile?.role === 'ADMIN';
}

/**
 * Returns true if the given Clerk userId is authorized to view or manage the batch
 * (either they are an ADMIN, the Batch Creator, a CourseInstructor for any of the batch's courses,
 * or a SessionCoInstructor for any session in the batch).
 */
export async function hasBatchAccess(batchId: string, userId: string): Promise<boolean> {
  const profile = await db.profile.findUnique({
    where: { userId },
    select: { id: true, role: true }
  });
  if (!profile) return false;
  if (profile.role === 'ADMIN') return true;

  const batch = await db.batch.findUnique({ where: { id: batchId }, select: { createdBy: true } });
  if (!batch) return false;
  if (batch.createdBy === userId) return true;

  // Check if they are a CourseInstructor for any course linked to this batch
  const batchCourses = await db.batchCourse.findMany({
    where: { batchId },
    select: { courseId: true }
  });
  const courseIds = batchCourses.map((bc) => bc.courseId);

  const isCourseInstructor = await db.courseInstructor.findFirst({
    where: {
      courseId: { in: courseIds },
      profileId: profile.id
    }
  });
  if (isCourseInstructor) return true;

  // Check if they are a co-instructor for any session in the batch
  const isCoInstructor = await db.sessionCoInstructor.findFirst({
    where: {
      userId,
      session: {
        item: {
          module: {
            batchId
          }
        }
      }
    }
  });
  if (isCoInstructor) return true;

  return false;
}
