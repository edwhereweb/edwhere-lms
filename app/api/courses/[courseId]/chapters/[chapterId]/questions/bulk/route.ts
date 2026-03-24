import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkCourseEdit } from '@/lib/course-auth';
import { z } from 'zod';
import { createQuestionSchema } from '@/lib/validations';
import { validateBody, handleApiError, apiError } from '@/lib/api-utils';

const bulkUploadSchema = z.object({
  questions: z.array(createQuestionSchema).max(200)
});

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
      return apiError('Quiz settings must be saved first before importing questions.', 400);
    }

    const body = await req.json();
    const validation = validateBody(bulkUploadSchema, body);
    if (!validation.success) return validation.response;

    // Bulk create
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const created = await (db as any).question.createMany({
      data: validation.data.questions.map(q => ({
        quizId: quiz.id,
        body: q.body,
        options: q.options,
        correctOptions: q.correctOptions,
        isMultipleChoice: q.isMultipleChoice ?? false,
        imageUrl: q.imageUrl ?? null
      }))
    });

    return NextResponse.json(created);
  } catch (error) {
    return handleApiError('CHAPTER_QUIZ_BULK_QUESTIONS', error);
  }
}
