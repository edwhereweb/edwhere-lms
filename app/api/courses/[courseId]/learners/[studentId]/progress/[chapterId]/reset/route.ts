import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError, handleApiError } from '@/lib/api-utils';
import { checkCourseEdit } from '@/lib/course-auth';

export async function POST(
  req: Request,
  { params }: { params: { courseId: string; studentId: string; chapterId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const denied = await checkCourseEdit(userId, params.courseId);
    if (denied) return denied;

    const { studentId, chapterId } = params;

    // 1. Delete UserProgress
    await db.userProgress.deleteMany({
      where: {
        userId: studentId,
        chapterId: chapterId
      }
    });

    // 2. Delete QuizAttempts if there's a quiz for this chapter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quiz = await (db as any).quiz.findUnique({
      where: { chapterId }
    });

    if (quiz) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any).quizAttempt.deleteMany({
        where: {
          userId: studentId,
          quizId: quiz.id
        }
      });
    }

    // 3. Delete ProjectSubmission if it's a project chapter
    await db.projectSubmission.deleteMany({
      where: {
        userId: studentId,
        chapterId: chapterId
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError('CHAPTER_PROGRESS_RESET', error);
  }
}
