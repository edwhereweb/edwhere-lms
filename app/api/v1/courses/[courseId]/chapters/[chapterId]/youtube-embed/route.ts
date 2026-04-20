import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { apiOk, apiErr, handleRouteError } from '@/lib/api-response';

export async function GET(
  req: Request,
  { params }: { params: { courseId: string; chapterId: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return apiErr('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const chapter = await db.chapter.findUnique({
      where: { id: params.chapterId, courseId: params.courseId }
    });

    if (!chapter || !chapter.youtubeVideoId) {
      return apiErr('NOT_FOUND', 'Not found', 404);
    }

    const embedUrl = `https://www.youtube-nocookie.com/embed/${chapter.youtubeVideoId}?rel=0&modestbranding=1&iv_load_policy=3&controls=1`;

    if (chapter.isFree) {
      return apiOk({ embedUrl });
    }

    const purchase = await db.purchase.findUnique({
      where: {
        userId_courseId: { userId, courseId: params.courseId }
      }
    });

    if (!purchase) {
      return apiErr('FORBIDDEN', 'Forbidden', 403);
    }

    return apiOk({ embedUrl });
  } catch (error) {
    return handleRouteError('YOUTUBE_EMBED', error);
  }
}
