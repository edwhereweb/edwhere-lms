import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { handleApiError, apiError, validateBody } from '@/lib/api-utils';

const submitQuizSchema = z.object({
  attemptId: z.string().min(1),
  tabSwitches: z.number().int().min(0).optional()
});

export async function POST(
  req: Request,
  { params }: { params: { courseId: string; chapterId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const body = await req.json();
    const validation = validateBody(submitQuizSchema, body);
    if (!validation.success) return validation.response;

    const { attemptId, tabSwitches = 0 } = validation.data;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const attempt = await (db as any).quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: { include: { questions: true } },
        responses: true
      }
    });

    if (!attempt || attempt.userId !== userId) {
      return apiError('Attempt not found', 404);
    }

    if (attempt.isCompleted) {
       return NextResponse.json(attempt);
    }

    // Grade the quiz based on exact numeric matches in correctOptions
    const totalQuestions = attempt.quiz.questions.length;
    let correctCount = 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    attempt.quiz.questions.forEach((q: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = attempt.responses.find((r: any) => r.questionId === q.id);
        if (response) {
            const sortedResponse = [...response.selectedOptions].sort();
            const sortedAnswer = [...q.correctOptions].sort();
            
            if (JSON.stringify(sortedResponse) === JSON.stringify(sortedAnswer)) {
                correctCount++;
            }
        }
    });

    const scorePercentage = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

    // Finalize attempt
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalized = await (db as any).quizAttempt.update({
      where: { id: attempt.id },
      data: {
        isCompleted: true,
        submittedAt: new Date(),
        score: scorePercentage,
        tabSwitches: Math.max(attempt.tabSwitches, tabSwitches)
      }
    });

    // Only mark chapter complete if score meets passScore threshold (or no threshold set)
    const passScore = attempt.quiz.passScore;
    const passed = passScore == null || scorePercentage >= passScore;

    if (passed) {
      await db.userProgress.upsert({
        where: {
          userId_chapterId: {
            userId,
            chapterId: params.chapterId
          }
        },
        update: {
          isCompleted: true
        },
        create: {
          userId,
          chapterId: params.chapterId,
          isCompleted: true
        }
      });
    }

    return NextResponse.json({ ...finalized, passed });
  } catch (error) {
    return handleApiError('CHAPTER_QUIZ_SUBMIT', error);
  }
}
