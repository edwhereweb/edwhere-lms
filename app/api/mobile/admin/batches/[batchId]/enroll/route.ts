import { auth } from '@clerk/nextjs/server';
import {
  mobileError,
  validateMobileBody,
  handleMobileApiError,
  mobileSuccess,
  mobileCreated
} from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';
import { canEnrollInBatch, hasBatchAccess } from '@/lib/batch-auth';
import { batchEnrollSchema } from '@/lib/validations';

type Params = { params: Promise<{ batchId: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { batchId } = await params;

    const hasAccess = await hasBatchAccess(batchId, userId);
    if (!hasAccess) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const enrollments = await db.batchEnrollment.findMany({
      where: { batchId },
      orderBy: { createdAt: 'desc' }
    });

    const enrolledUserIds = enrollments.map((e) => e.userId);
    const profiles = await db.profile.findMany({
      where: { userId: { in: enrolledUserIds } },
      select: { userId: true, name: true, email: true }
    });
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    const enriched = enrollments.map((e) => ({
      ...e,
      name: profileMap.get(e.userId)?.name || 'Unknown',
      email: profileMap.get(e.userId)?.email || 'No Email'
    }));

    return mobileSuccess(enriched);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_BATCH_ENROLL_LIST', error);
  }
}

export async function POST(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const allowed = await canEnrollInBatch(userId);
    if (!allowed) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const { batchId } = await params;

    const body = await req.json();
    const result = validateMobileBody(batchEnrollSchema, body);
    if (!result.success) return result.response;

    let studentUserId = result.data.userId;

    if (!studentUserId && result.data.email) {
      const profile = await db.profile.findFirst({ where: { email: result.data.email } });
      if (!profile) return mobileError('NOT_FOUND', 'No user found with this email', 404);
      studentUserId = profile.userId;
    }

    if (!studentUserId) return mobileError('VALIDATION', 'Either userId or email is required', 400);

    // Verify batch exists
    const batch = await db.batch.findUnique({
      where: { id: batchId },
      include: { courses: true }
    });
    if (!batch) return mobileError('NOT_FOUND', 'Batch not found', 404);

    // Create enrollment
    const enrollment = await db.batchEnrollment.create({
      data: {
        batchId,
        userId: studentUserId,
        enrolledBy: userId
      }
    });

    // Create Purchase records for all batch courses
    for (const bc of batch.courses) {
      await db.purchase.upsert({
        where: {
          userId_courseId: {
            userId: studentUserId,
            courseId: bc.courseId
          }
        },
        create: {
          userId: studentUserId,
          courseId: bc.courseId
        },
        update: {}
      });
    }

    return mobileCreated(enrollment);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_BATCH_ENROLL', error);
  }
}
