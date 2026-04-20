import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { handleRouteError, apiErr, validateRequest, apiOk } from '@/lib/api-response';

const saveResponseSchema = z.object({
  attemptId: z.string().min(1),
  questionId: z.string().min(1),
  selectedOptions: z.array(z.number())
});

export async function POST(
  req: Request,
  { params: _params }: { params: { courseId: string; chapterId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) return apiErr('UNAUTHORIZED', 'Unauthorized', 401);

    const body = await req.json();
    const validation = validateRequest(saveResponseSchema, body);
    if (!validation.success) return validation.response;

    const { attemptId, questionId, selectedOptions } = validation.data;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const attempt = await (db as any).quizAttempt.findUnique({
      where: { id: attemptId },
      include: { quiz: true }
    });

    if (!attempt || attempt.userId !== userId) {
      return apiErr('NOT_FOUND', 'Attempt not found', 404);
    }

    if (attempt.isCompleted) {
      return apiErr('VALIDATION', 'Attempt already completed', 400);
    }

    if (attempt.quiz.timeLimit) {
      const elapsedMinutes = (Date.now() - attempt.startTime.getTime()) / 60000;
      if (elapsedMinutes >= attempt.quiz.timeLimit) {
        // Automatically lock it
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (db as any).quizAttempt.update({
          where: { id: attemptId },
          data: { isCompleted: true, submittedAt: new Date(), score: 0 }
        });
        return apiErr('FORBIDDEN', 'Time has expired.', 403);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (db as any).questionResponse.upsert({
      where: {
        attemptId_questionId: {
          attemptId,
          questionId
        }
      },
      update: {
        selectedOptions
      },
      create: {
        attemptId,
        questionId,
        selectedOptions
      }
    });

    return apiOk(response);
  } catch (error) {
    return handleRouteError('CHAPTER_QUIZ_SAVE', error);
  }
}
