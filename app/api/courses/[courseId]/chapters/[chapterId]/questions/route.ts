import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkCourseEdit } from '@/lib/course-auth';
import { createQuestionSchema } from '@/lib/validations';
import { validateBody, handleApiError, apiError } from '@/lib/api-utils';

export async function POST(
  req: Request,
  { params }: { params: { courseId: string; chapterId: string } }
) {
  try {
    const { userId } = await auth();

    const denied = await checkCourseEdit(userId, params.courseId);
    if (denied) return denied;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quiz = await (db as any).quiz.findUnique({
      where: { chapterId: params.chapterId }
    });

    if (!quiz) {
      return apiError('Quiz settings must be saved first before adding questions.', 400);
    }

    const body = await req.json();
    const validation = validateBody(createQuestionSchema, body);
    if (!validation.success) return validation.response;

    // Single create
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const created = await (db as any).question.create({
      data: {
        quizId: quiz.id,
        body: validation.data.body,
        options: validation.data.options,
        correctOptions: validation.data.correctOptions,
        isMultipleChoice: validation.data.isMultipleChoice ?? false,
        imageUrl: validation.data.imageUrl ?? null
      }
    });

    return NextResponse.json(created);
  } catch (error) {
    return handleApiError('CHAPTER_QUIZ_QUESTION_CREATE', error);
  }
}
