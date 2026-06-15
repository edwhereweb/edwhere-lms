import { auth } from '@clerk/nextjs/server';
import { mobileSuccess, mobileError, handleMobileApiError } from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';
import { getProgress } from '@/actions/get-progress';

export async function GET(_req: Request, { params }: { params: { courseId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const course = await db.course.findUnique({
      where: { id: params.courseId },
      select: {
        id: true,
        title: true,
        modules: {
          orderBy: { position: 'asc' },
          select: {
            id: true,
            title: true,
            position: true,
            chapters: {
              where: { isPublished: true, isLibraryAsset: false },
              select: {
                id: true,
                title: true,
                position: true,
                isFree: true,
                contentType: true,
                userProgress: {
                  where: { userId },
                  select: { isCompleted: true }
                }
              },
              orderBy: { position: 'asc' }
            }
          }
        },
        chapters: {
          where: { isPublished: true, moduleId: null, isLibraryAsset: false },
          select: {
            id: true,
            title: true,
            position: true,
            isFree: true,
            contentType: true,
            userProgress: {
              where: { userId },
              select: { isCompleted: true }
            }
          },
          orderBy: { position: 'asc' }
        }
      }
    });

    if (!course) {
      return mobileError('NOT_FOUND', 'Not Found', 404);
    }

    const progress = await getProgress(userId, course.id);

    // Flatten userProgress for cleaner mobile consumption
    const mapChapter = (ch: {
      id: string;
      title: string;
      position: number;
      isFree: boolean;
      contentType: string | null;
      userProgress: { isCompleted: boolean }[];
    }) => ({
      id: ch.id,
      title: ch.title,
      position: ch.position,
      isFree: ch.isFree,
      contentType: ch.contentType,
      isCompleted: ch.userProgress[0]?.isCompleted ?? false
    });

    return mobileSuccess({
      course: {
        id: course.id,
        title: course.title
      },
      modules: course.modules.map((m) => ({
        id: m.id,
        title: m.title,
        position: m.position,
        chapters: m.chapters.map(mapChapter)
      })),
      standaloneChapters: course.chapters.map(mapChapter),
      progress
    });
  } catch (error) {
    return handleMobileApiError('MOBILE_SIDEBAR', error);
  }
}
