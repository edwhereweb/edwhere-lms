import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { apiOk, apiErr, handleRouteError } from '@/lib/api-response';
import { checkCourseEdit } from '@/lib/course-auth';

export async function POST(
  _req: Request,
  { params }: { params: { courseId: string; purchaseId: string; chapterId: string } }
) {
  try {
    const { userId: teacherUserId } = await auth();
    if (!teacherUserId) return apiErr('UNAUTHORIZED', 'Unauthorized', 401);

    const denied = await checkCourseEdit(teacherUserId, params.courseId);
    if (denied) return denied;

    const { purchaseId, chapterId } = params;

    const purchase = await db.purchase.findUnique({
      where: { id: purchaseId }
    });

    if (!purchase) return apiErr('NOT_FOUND', 'Purchase not found', 404);
    const studentId = purchase.userId;

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

    return apiOk({ success: true });
  } catch (error) {
    return handleRouteError('CHAPTER_PROGRESS_RESET', error);
  }
}
