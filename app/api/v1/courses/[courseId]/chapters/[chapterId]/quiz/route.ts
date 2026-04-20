import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { checkCourseEdit } from '@/lib/course-auth';
import { createQuizSchema } from '@/lib/validations';
import { apiOk, validateRequest, handleRouteError } from '@/lib/api-response';

export async function PATCH(
  req: Request,
  { params }: { params: { courseId: string; chapterId: string } }
) {
  try {
    const { userId } = await auth();

    const denied = await checkCourseEdit(userId, params.courseId);
    if (denied) return denied;

    const body = await req.json();
    const validation = validateRequest(createQuizSchema, body);
    if (!validation.success) return validation.response;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quiz = await (db as any).quiz.upsert({
      where: {
        chapterId: params.chapterId
      },
      update: {
        ...validation.data
      },
      create: {
        chapterId: params.chapterId,
        ...validation.data
      }
    });

    return apiOk(quiz);
  } catch (error) {
    return handleRouteError('CHAPTER_QUIZ', error);
  }
}
