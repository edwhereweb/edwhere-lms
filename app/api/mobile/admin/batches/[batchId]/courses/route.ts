import { auth } from '@clerk/nextjs/server';
import {
  mobileError,
  validateMobileBody,
  handleMobileApiError,
  mobileCreated
} from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';
import { canManageBatch } from '@/lib/batch-auth';
import { batchCourseSchema } from '@/lib/validations';

type Params = { params: Promise<{ batchId: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const allowed = await canManageBatch(userId);
    if (!allowed) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const { batchId } = await params;

    const body = await req.json();
    const result = validateMobileBody(batchCourseSchema, body);
    if (!result.success) return result.response;

    // Verify batch exists
    const batch = await db.batch.findUnique({ where: { id: batchId } });
    if (!batch) return mobileError('NOT_FOUND', 'Batch not found', 404);

    // Verify course exists
    const course = await db.course.findUnique({ where: { id: result.data.courseId } });
    if (!course) return mobileError('NOT_FOUND', 'Course not found', 404);

    const batchCourse = await db.batchCourse.create({
      data: {
        batchId,
        courseId: result.data.courseId
      }
    });

    return mobileCreated(batchCourse);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_BATCH_COURSE_ADD', error);
  }
}
