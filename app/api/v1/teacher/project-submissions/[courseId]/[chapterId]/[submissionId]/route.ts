import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { validateRequest, apiOk, apiErr, handleRouteError } from '@/lib/api-response';
import { canEditCourse } from '@/lib/course-auth';

const reviewSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  reviewNote: z.string().max(2000).optional()
});

// PATCH /api/v1/teacher/project-submissions/[courseId]/[chapterId]/[submissionId]
// Approve or reject a submission
export async function PATCH(
  req: Request,
  { params }: { params: { courseId: string; chapterId: string; submissionId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) return apiErr('UNAUTHORIZED', 'Unauthorized', 401);

    const allowed = await canEditCourse(userId, params.courseId);
    if (!allowed) return apiErr('FORBIDDEN', 'Forbidden', 403);

    const body = await req.json();
    const validation = validateRequest(reviewSchema, body);
    if (!validation.success) return validation.response;

    const submission = await db.projectSubmission.update({
      where: {
        id: params.submissionId,
        chapterId: params.chapterId,
        chapter: {
          courseId: params.courseId
        }
      },
      data: {
        status: validation.data.status,
        reviewNote: validation.data.reviewNote ?? null,
        reviewedAt: new Date(),
        reviewedBy: userId
      }
    });

    return apiOk(submission);
  } catch (error) {
    return handleRouteError('PROJECT_SUBMISSION_REVIEW', error);
  }
}
