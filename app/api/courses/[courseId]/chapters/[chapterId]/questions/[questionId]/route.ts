import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkCourseEdit } from '@/lib/course-auth';
import { apiError, handleApiError } from '@/lib/api-utils';

export async function DELETE(
  req: Request,
  { params }: { params: { courseId: string; chapterId: string; questionId: string } }
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
      return apiError('Quiz not found', 404);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const deleted = await (db as any).question.delete({
      where: {
        id: params.questionId,
        quizId: quiz.id
      }
    });

    return NextResponse.json(deleted);
  } catch (error) {
    return handleApiError('CHAPTER_QUIZ_QUESTION_DELETE', error);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { courseId: string; chapterId: string; questionId: string } }
) {
  try {
    const { userId } = await auth();
    const denied = await checkCourseEdit(userId, params.courseId);
    if (denied) return denied;

    const values = await req.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quiz = await (db as any).quiz.findUnique({
      where: { chapterId: params.chapterId }
    });

    if (!quiz) {
      return apiError('Quiz not found', 404);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await (db as any).question.update({
      where: {
        id: params.questionId,
        quizId: quiz.id
      },
      data: {
        ...values
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError('CHAPTER_QUIZ_QUESTION_PATCH', error);
  }
}
