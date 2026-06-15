import { auth } from '@clerk/nextjs/server';
import {
  mobileError,
  validateMobileBody,
  handleMobileApiError,
  mobileCreated
} from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';
import { canEnrollInBatch } from '@/lib/batch-auth';
import { batchBulkEnrollSchema } from '@/lib/validations';

type Params = { params: Promise<{ batchId: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const allowed = await canEnrollInBatch(userId);
    if (!allowed) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const { batchId } = await params;

    const body = await req.json();
    const result = validateMobileBody(batchBulkEnrollSchema, body);
    if (!result.success) return result.response;

    const batch = await db.batch.findUnique({
      where: { id: batchId },
      include: { courses: true }
    });
    if (!batch) return mobileError('NOT_FOUND', 'Batch not found', 404);

    const enrolled: string[] = [];
    const skipped: string[] = [];
    const created: string[] = [];

    for (const email of result.data.emails) {
      // Find or create profile
      let profile = await db.profile.findFirst({ where: { email } });
      if (!profile) {
        profile = await db.profile.create({
          data: {
            userId: `pending_${email}`,
            name: email.split('@')[0],
            email,
            role: 'STUDENT'
          }
        });
        created.push(email);
      }

      // Check if already enrolled
      const existing = await db.batchEnrollment.findUnique({
        where: { batchId_userId: { batchId, userId: profile.userId } }
      });
      if (existing) {
        skipped.push(email);
        continue;
      }

      // Create enrollment
      await db.batchEnrollment.create({
        data: {
          batchId,
          userId: profile.userId,
          enrolledBy: userId
        }
      });

      // Create Purchase records for all batch courses
      for (const bc of batch.courses) {
        await db.purchase.upsert({
          where: {
            userId_courseId: {
              userId: profile.userId,
              courseId: bc.courseId
            }
          },
          create: {
            userId: profile.userId,
            courseId: bc.courseId
          },
          update: {}
        });
      }

      enrolled.push(email);
    }

    return mobileCreated({
      enrolled,
      skipped,
      created,
      total: result.data.emails.length
    });
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_BATCH_BULK_ENROLL', error);
  }
}
