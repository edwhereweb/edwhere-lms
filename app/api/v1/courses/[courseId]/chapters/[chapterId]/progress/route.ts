import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { progressSchema } from '@/lib/validations';
import { apiOk, apiErr, validateRequest, handleRouteError } from '@/lib/api-response';

export async function PUT(
  req: Request,
  { params }: { params: { courseId: string; chapterId: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return apiErr('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const body = await req.json();
    const validation = validateRequest(progressSchema, body);
    if (!validation.success) return validation.response;

    const [chapter, purchase] = await Promise.all([
      db.chapter.findUnique({
        where: { id: params.chapterId, courseId: params.courseId, isPublished: true }
      }),
      db.purchase.findUnique({
        where: { userId_courseId: { userId, courseId: params.courseId } }
      })
    ]);

    if (!chapter) {
      return apiErr('NOT_FOUND', 'Not found', 404);
    }

    if (!chapter.isFree && !purchase) {
      return apiErr('FORBIDDEN', 'Forbidden', 403);
    }

    const userProgress = await db.userProgress.upsert({
      where: {
        userId_chapterId: { userId, chapterId: params.chapterId }
      },
      update: { isCompleted: validation.data.isCompleted },
      create: {
        userId,
        chapterId: params.chapterId,
        isCompleted: validation.data.isCompleted
      }
    });

    return apiOk(userProgress);
  } catch (error) {
    return handleRouteError('CHAPTER_ID_PROGRESS', error);
  }
}
