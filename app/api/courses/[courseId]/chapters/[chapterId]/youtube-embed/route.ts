import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError, handleApiError } from '@/lib/api-utils';

export async function GET(
  req: Request,
  { params }: { params: { courseId: string; chapterId: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return apiError('Unauthorized', 401);
    }

    const chapter = await db.chapter.findUnique({
      where: { id: params.chapterId, courseId: params.courseId }
    });

    if (!chapter || !chapter.youtubeVideoId) {
      return apiError('Not Found', 404);
    }

    const embedUrl = `https://www.youtube-nocookie.com/embed/${chapter.youtubeVideoId}?rel=0&modestbranding=1&iv_load_policy=3&controls=1`;

    if (chapter.isFree) {
      return NextResponse.json({ embedUrl });
    }

    const purchase = await db.purchase.findUnique({
      where: {
        userId_courseId: { userId, courseId: params.courseId }
      }
    });

    if (!purchase) {
      return apiError('Forbidden', 403);
    }

    return NextResponse.json({ embedUrl });
  } catch (error) {
    return handleApiError('YOUTUBE_EMBED', error);
  }
}
