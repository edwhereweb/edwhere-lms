import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handleApiError, apiError } from '@/lib/api-utils';

function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

function stringToSeed(str: string) {
  let h = 0xdeadbeef;
  for (let i = 0; i < str.length; i++)
    h = Math.imul(h ^ str.charCodeAt(i), 2654435761);
  return (h ^ h >>> 16) >>> 0;
}

function shuffleArray<T>(array: T[], randomFunc: () => number) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(randomFunc() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function GET(
  req: Request,
  { params }: { params: { courseId: string; chapterId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quiz = await (db as any).quiz.findUnique({
      where: { chapterId: params.chapterId },
      include: { 
        questions: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!quiz) return apiError('Quiz not found', 404);

    // Look for an incomplete attempt
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingAttempt = await (db as any).quizAttempt.findFirst({
      where: {
        userId,
        quizId: quiz.id,
        isCompleted: false
      },
      include: {
        responses: true
      }
    });

    if (existingAttempt) {
      // Check if time expired securely
      if (quiz.timeLimit) {
        const elapsedMinutes = (Date.now() - existingAttempt.startTime.getTime()) / 60000;
        if (elapsedMinutes >= quiz.timeLimit) {
           // eslint-disable-next-line @typescript-eslint/no-explicit-any
           await (db as any).quizAttempt.update({
             where: { id: existingAttempt.id },
             data: { isCompleted: true, submittedAt: new Date(), score: 0 }
           });
           return apiError('Time has expired.', 403);
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let processedQuestions = quiz.questions.map((q: any) => ({
        id: q.id,
        body: q.body,
        imageUrl: q.imageUrl,
        isMultipleChoice: q.isMultipleChoice,
        options: q.options.map((opt: string, i: number) => ({
          originalIndex: i,
          text: opt
        }))
      }));

      if (quiz.randomize) {
        const seed = stringToSeed(existingAttempt.id);
        const prng = mulberry32(seed);

        processedQuestions = shuffleArray(processedQuestions, prng);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        processedQuestions = processedQuestions.map((q: any) => ({
          ...q,
          options: shuffleArray(q.options, prng)
        }));
      }

      return NextResponse.json({ ...existingAttempt, questions: processedQuestions });
    }

    // No active attempt. But we need to know if they've taken it before.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const previousAttempts = await (db as any).quizAttempt.findMany({
       where: { userId, quizId: quiz.id, isCompleted: true },
       orderBy: { submittedAt: 'desc' },
       select: { id: true, score: true, submittedAt: true }
    });

    return NextResponse.json({ activeAttempt: null, previousAttempts });
  } catch (error) {
    return handleApiError('CHAPTER_QUIZ_START_GET', error);
  }
}

export async function POST(
  req: Request,
  { params }: { params: { courseId: string; chapterId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    // Verify course purchase or teacher status
    const purchase = await db.purchase.findUnique({
      where: { userId_courseId: { userId, courseId: params.courseId } }
    });

    const isOwner = await db.course.findUnique({ where: { id: params.courseId, userId } });
    if (!purchase && !isOwner) {
       return apiError('Unauthorized', 401);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quiz = await (db as any).quiz.findUnique({
      where: { chapterId: params.chapterId },
      include: { 
        questions: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!quiz) return apiError('Quiz not found', 404);

    // Look for an incomplete attempt
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingAttempt = await (db as any).quizAttempt.findFirst({
      where: {
        userId,
        quizId: quiz.id,
        isCompleted: false
      },
      include: {
        responses: true
      }
    });

    if (existingAttempt) {
      // Check if time expired securely
      if (quiz.timeLimit) {
        const elapsedMinutes = (Date.now() - existingAttempt.startTime.getTime()) / 60000;
        if (elapsedMinutes >= quiz.timeLimit) {
           // Auto-complete immediately
           // eslint-disable-next-line @typescript-eslint/no-explicit-any
           await (db as any).quizAttempt.update({
             where: { id: existingAttempt.id },
             data: { isCompleted: true, submittedAt: new Date(), score: 0 } // Real grading in submit endpoint
           });
           return apiError('Time has expired.', 403);
        }
      }

      // Process existing attempt before returning
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let processedQuestions = quiz.questions.map((q: any) => ({
        id: q.id,
        body: q.body,
        imageUrl: q.imageUrl,
        isMultipleChoice: q.isMultipleChoice,
        options: q.options.map((opt: string, i: number) => ({
          originalIndex: i,
          text: opt
        }))
      }));

      if (quiz.randomize) {
        const seed = stringToSeed(existingAttempt.id);
        const prng = mulberry32(seed);

        processedQuestions = shuffleArray(processedQuestions, prng);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        processedQuestions = processedQuestions.map((q: any) => ({
          ...q,
          options: shuffleArray(q.options, prng)
        }));
      }

      return NextResponse.json({ ...existingAttempt, questions: processedQuestions });
    }

    // Checking max attempts
    if (quiz.maxAttempts) {
       // eslint-disable-next-line @typescript-eslint/no-explicit-any
       const count = await (db as any).quizAttempt.count({
          where: { userId, quizId: quiz.id, isCompleted: true }
       });
       if (count >= quiz.maxAttempts) {
         return apiError('Maximum attempts reached.', 403);
       }
    }

    // Create a new attempt
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newAttempt = await (db as any).quizAttempt.create({
      data: {
        userId,
        quizId: quiz.id,
        startTime: new Date(),
        tabSwitches: 0
      },
      include: {
        responses: true
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let processedQuestions = quiz.questions.map((q: any) => ({
      id: q.id,
      body: q.body,
      imageUrl: q.imageUrl,
      isMultipleChoice: q.isMultipleChoice,
      options: q.options.map((opt: string, i: number) => ({
        originalIndex: i,
        text: opt
      }))
    }));

    if (quiz.randomize) {
      const seed = stringToSeed(newAttempt.id);
      const prng = mulberry32(seed);

      processedQuestions = shuffleArray(processedQuestions, prng);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      processedQuestions = processedQuestions.map((q: any) => ({
        ...q,
        options: shuffleArray(q.options, prng)
      }));
    }

    return NextResponse.json({ ...newAttempt, questions: processedQuestions });
  } catch (error) {
    return handleApiError('CHAPTER_QUIZ_START', error);
  }
}
