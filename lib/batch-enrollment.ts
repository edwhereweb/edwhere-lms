import { db } from '@/lib/db';
import { logError } from '@/lib/debug';

/**
 * Enrolls a student into a batch and grants access to every course in that batch.
 *
 * Side effects (in order):
 *   1. Creates (or silently no-ops) a BatchEnrollment record.
 *   2. For each course in the batch, upserts a Purchase with
 *      onboardingSource=BATCH_ENROLLMENT — preserving any existing paid purchase.
 *
 * Progress sharing is automatic: UserProgress is keyed by (userId, chapterId)
 * with no batch dimension, so completing a chapter in any batch context reflects
 * globally across all batches sharing that course.
 *
 * Dashboard deduplication is also automatic: Purchase has @@unique([userId, courseId]),
 * so a student who reaches the same course via multiple batches gets exactly one
 * Purchase row and sees the course once on their dashboard.
 */
export async function enrollStudentInBatch(
  batchId: string,
  studentUserId: string,
  enrolledByUserId: string
): Promise<{ enrolled: true } | { enrolled: false; reason: string }> {
  try {
    const batch = await db.batch.findUnique({
      where: { id: batchId },
      include: { courses: { select: { courseId: true } } }
    });

    if (!batch) {
      return { enrolled: false, reason: 'Batch not found' };
    }

    // Step 1: Record batch membership (idempotent)
    await db.batchEnrollment.upsert({
      where: { batchId_userId: { batchId, userId: studentUserId } },
      create: { batchId, userId: studentUserId, enrolledBy: enrolledByUserId },
      update: {}
    });

    // Step 2: Grant access to every course in the batch via Purchase (idempotent)
    // We use upsert so a pre-existing paid purchase is never overwritten.
    await Promise.all(
      batch.courses.map(({ courseId }) =>
        db.purchase.upsert({
          where: { userId_courseId: { userId: studentUserId, courseId } },
          create: {
            userId: studentUserId,
            courseId,
            onboardingSource: 'BATCH_ENROLLMENT'
          },
          update: {}
        })
      )
    );

    return { enrolled: true };
  } catch (error) {
    logError('ENROLL_STUDENT_IN_BATCH', error);
    return { enrolled: false, reason: 'Internal error during enrollment' };
  }
}

/**
 * Removes a student from a batch.
 *
 * Deliberately does NOT revoke Purchase records, because:
 *   - The student may have obtained access through another batch or direct purchase.
 *   - Revoking access on unenroll is a separate policy decision handled in Step 2+.
 *
 * Returns false only when the enrollment record didn't exist (already unenrolled).
 */
export async function unenrollStudentFromBatch(
  batchId: string,
  studentUserId: string
): Promise<boolean> {
  try {
    await db.batchEnrollment.delete({
      where: { batchId_userId: { batchId, userId: studentUserId } }
    });
    return true;
  } catch (error) {
    // P2025 = record not found — treat as a no-op
    if ((error as { code?: string }).code === 'P2025') return false;
    logError('UNENROLL_STUDENT_FROM_BATCH', error);
    return false;
  }
}
