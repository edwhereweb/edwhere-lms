import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { progressSchema } from '@/lib/validations';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { awardXp, XP_REWARDS } from '@/lib/gamification';

export async function PUT(
  req: Request,
  { params }: { params: { courseId: string; chapterId: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return apiError('Unauthorized', 401);
    }

    const body = await req.json();
    const validation = validateBody(progressSchema, body);
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
      return apiError('Not Found', 404);
    }

    if (!chapter.isFree && !purchase) {
      return apiError('Forbidden', 403);
    }

    const wasAlreadyCompleted = await db.userProgress.findUnique({
      where: { userId_chapterId: { userId, chapterId: params.chapterId } },
      select: { isCompleted: true }
    });

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

    // Award XP only when newly completing (not un-completing or re-completing)
    let xpResult = null;
    if (validation.data.isCompleted && !wasAlreadyCompleted?.isCompleted) {
      const contentType = chapter.contentType ?? 'VIDEO_MUX';
      let xpAmount: number = XP_REWARDS.VIDEO_COMPLETE;
      if (contentType === 'TEXT') xpAmount = XP_REWARDS.TEXT_COMPLETE;
      else if (contentType === 'PDF_DOCUMENT') xpAmount = XP_REWARDS.PDF_COMPLETE;
      else if (contentType === 'HTML_EMBED') xpAmount = XP_REWARDS.HTML_EMBED_COMPLETE;
      xpResult = await awardXp(userId, xpAmount);
    }

    return NextResponse.json({ ...userProgress, xp: xpResult });
  } catch (error) {
    return handleApiError('CHAPTER_ID_PROGRESS', error);
  }
}
