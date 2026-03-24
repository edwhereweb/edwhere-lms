import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { handleApiError, apiError, validateBody } from '@/lib/api-utils';

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
    if (!userId) return apiError('Unauthorized', 401);

    const body = await req.json();
    const validation = validateBody(saveResponseSchema, body);
    if (!validation.success) return validation.response;

    const { attemptId, questionId, selectedOptions } = validation.data;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const attempt = await (db as any).quizAttempt.findUnique({
      where: { id: attemptId },
      include: { quiz: true }
    });

    if (!attempt || attempt.userId !== userId) {
      return apiError('Attempt not found', 404);
    }

    if (attempt.isCompleted) {
      return apiError('Attempt already completed', 400);
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
         return apiError('Time has expired.', 403);
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

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError('CHAPTER_QUIZ_SAVE', error);
  }
}
