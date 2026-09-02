import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { apiError, handleApiError } from '@/lib/api-utils';
import { canEditCourse } from '@/lib/course-auth';
import {
  buildReviewCsv,
  buildReviewPayload,
  buildReviewWorkbook,
  canViewSubmissionReport
} from '@/lib/quiz-review';

export async function GET(
  req: Request,
  { params }: { params: { courseId: string; chapterId: string; attemptId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') === 'xlsx' ? 'xlsx' : 'csv';

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
    const filename = `quiz-review-${attempt.id}`;

    if (format === 'xlsx') {
      const workbook = buildReviewWorkbook(payload);
      const buffer = await workbook.xlsx.writeBuffer();

      return new Response(buffer as ArrayBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}.xlsx"`
        }
      });
    }

    const csv = buildReviewCsv(payload);

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}.csv"`
      }
    });
  } catch (error) {
    return handleApiError('QUIZ_ATTEMPT_REVIEW_EXPORT_GET', error);
  }
}
