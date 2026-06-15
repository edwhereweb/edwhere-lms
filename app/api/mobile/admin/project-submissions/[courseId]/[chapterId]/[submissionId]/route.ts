import { auth } from '@clerk/nextjs/server';
import {
  mobileSuccess,
  mobileError,
  validateMobileBody,
  handleMobileApiError
} from '@/lib/api-mobile-utils';
import { isTeacher } from '@/lib/teacher';
import { db } from '@/lib/db';
import { z } from 'zod';

type Params = {
  params: Promise<{ courseId: string; chapterId: string; submissionId: string }>;
};

const reviewSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  reviewNote: z.string().max(5000).optional()
});

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const teacherAccess = await isTeacher();
    if (!teacherAccess) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const { submissionId } = await params;

    const body = await req.json();
    const result = validateMobileBody(reviewSchema, body);
    if (!result.success) return result.response;

    const submission = await db.projectSubmission.findUnique({
      where: { id: submissionId }
    });
    if (!submission) return mobileError('NOT_FOUND', 'Submission not found', 404);

    const updated = await db.projectSubmission.update({
      where: { id: submissionId },
      data: {
        status: result.data.status,
        reviewNote: result.data.reviewNote ?? null,
        reviewedAt: new Date(),
        reviewedBy: userId
      }
    });

    return mobileSuccess(updated);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_PROJECT_SUBMISSION_REVIEW', error);
  }
}
