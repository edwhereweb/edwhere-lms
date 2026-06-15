import { auth } from '@clerk/nextjs/server';
import {
  mobileCreated,
  mobileError,
  validateMobileBody,
  handleMobileApiError
} from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';
import { checkCourseEdit } from '@/lib/course-auth';
import { createQuestionSchema } from '@/lib/validations';

type Params = { params: Promise<{ courseId: string; chapterId: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { courseId, chapterId } = await params;
    const denied = await checkCourseEdit(userId, courseId);
    if (denied) return denied;

    const body = await req.json();
    const result = validateMobileBody(createQuestionSchema, body);
    if (!result.success) return result.response;

    let quiz = await db.quiz.findUnique({ where: { chapterId } });
    if (!quiz) {
      quiz = await db.quiz.create({ data: { chapterId } });
    }

    const question = await db.question.create({
      data: {
        quizId: quiz.id,
        body: result.data.body,
        imageUrl: result.data.imageUrl ?? undefined,
        options: result.data.options,
        correctOptions: result.data.correctOptions,
        isMultipleChoice: result.data.isMultipleChoice ?? false
      }
    });

    return mobileCreated(question);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_QUESTION_CREATE', error);
  }
}
