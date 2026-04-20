import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { submitFlagSchema } from '@/lib/validations';
import { apiOk, validateRequest, apiErr, handleRouteError } from '@/lib/api-response';

export async function POST(
  req: Request,
  { params }: { params: { courseId: string; chapterId: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return apiErr('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const body = await req.json();
    const validation = validateRequest(submitFlagSchema, body);
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

    // Verify flag
    const gamifiedFlag = (chapter as unknown as { gamifiedFlag?: string }).gamifiedFlag;

    if (!gamifiedFlag) {
      return apiErr('VALIDATION', 'This chapter does not have a flag configured.', 400);
    }

    const correctFlag = gamifiedFlag.trim().toLowerCase();
    const submittedFlag = validation.data.flag.trim().toLowerCase();

    if (submittedFlag !== correctFlag) {
      return apiErr('VALIDATION', 'Incorrect flag. Try again!', 400);
    }

    // Mark as completed
    const userProgress = await db.userProgress.upsert({
      where: {
        userId_chapterId: { userId, chapterId: params.chapterId }
      },
      update: { isCompleted: true },
      create: {
        userId,
        chapterId: params.chapterId,
        isCompleted: true
      }
    });

    return apiOk({ success: true, userProgress });
  } catch (error) {
    return handleRouteError('CHAPTER_SUBMIT_FLAG', error);
  }
}
