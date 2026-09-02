import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError, handleApiError } from '@/lib/api-utils';
import { canEditCourse } from '@/lib/course-auth';
import { buildReviewPayload, canViewSubmissionReport } from '@/lib/quiz-review';

export async function GET(
  req: Request,
  { params }: { params: { courseId: string; chapterId: string; attemptId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const attempt = await (db as any).quizAttempt.findUnique({
      where: { id: params.attemptId },
      include: {
        quiz: { include: { questions: { orderBy: { createdAt: 'asc' } } } },
        responses: true
      }
    });

    if (!attempt || attempt.quiz.chapterId !== params.chapterId) {
      return apiError('Attempt not found', 404);
    }

    const isPrivileged = await canEditCourse(userId, params.courseId);

    const allowed = canViewSubmissionReport({
      quiz: attempt.quiz,
      attempt,
      requesterId: userId,
      isPrivileged
    });

    if (!allowed) return apiError('Forbidden', 403);

    const payload = buildReviewPayload(attempt.quiz, attempt);

    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError('QUIZ_ATTEMPT_REVIEW_GET', error);
  }
}
