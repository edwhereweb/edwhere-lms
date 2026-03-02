import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiError, handleApiError, validateBody } from '@/lib/api-utils';
import { canEditCourse } from '@/lib/course-auth';

const reviewSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  reviewNote: z.string().max(2000).optional()
});

// PATCH /api/teacher/project-submissions/[courseId]/[chapterId]/[submissionId]
// Approve or reject a submission
export async function PATCH(
  req: Request,
  { params }: { params: { courseId: string; chapterId: string; submissionId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const allowed = await canEditCourse(userId, params.courseId);
    if (!allowed) return apiError('Forbidden', 403);

    const body = await req.json();
    const validation = validateBody(reviewSchema, body);
    if (!validation.success) return validation.response;

    const submission = await db.projectSubmission.update({
      where: { id: params.submissionId, chapterId: params.chapterId },
      data: {
        status: validation.data.status,
        reviewNote: validation.data.reviewNote ?? null,
        reviewedAt: new Date(),
        reviewedBy: userId
      }
    });

    return NextResponse.json(submission);
  } catch (error) {
    return handleApiError('PROJECT_SUBMISSION_REVIEW', error);
  }
}
