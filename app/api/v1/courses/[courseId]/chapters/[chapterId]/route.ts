import Mux from '@mux/mux-node';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { checkCourseEdit } from '@/lib/course-auth';
import { updateChapterSchema } from '@/lib/validations';
import { apiOk, apiErr, validateRequest, handleRouteError } from '@/lib/api-response';
import { urlToR2Key, deleteObject } from '@/lib/r2';

function getMuxVideo() {
  const { Video } = new Mux(process.env.MUX_TOKEN_ID!, process.env.MUX_TOKEN_SECRET!);
  return Video;
}

export async function DELETE(
  req: Request,
  { params }: { params: { courseId: string; chapterId: string } }
) {
  try {
    const { userId } = await auth();

    const denied = await checkCourseEdit(userId, params.courseId);
    if (denied) return denied;

    const chapter = await db.chapter.findUnique({
      where: {
        id: params.chapterId,
        courseId: params.courseId
      }
    });

    if (!chapter) {
      return apiErr('NOT_FOUND', 'Not found', 404);
    }

    const chapterPdfUrl = (chapter as { pdfUrl?: string }).pdfUrl;
    const pdfKey = urlToR2Key(chapterPdfUrl);
    if (pdfKey) {
      try {
        await deleteObject(pdfKey);
      } catch {
        // continue — object may already be gone
      }
    }

    if (chapter.videoUrl) {
      const existingMuxData = await db.muxData.findFirst({
        where: { chapterId: params.chapterId }
      });

      if (existingMuxData) {
        const isUsedElsewhere = await db.muxData.findFirst({
          where: {
            assetId: existingMuxData.assetId,
            chapterId: { not: params.chapterId }
          }
        });

        if (!isUsedElsewhere) {
          try {
            await getMuxVideo().Assets.del(existingMuxData.assetId);
          } catch {
            // Mux asset may already be deleted — safe to continue
          }
        }
        await db.muxData.delete({ where: { id: existingMuxData.id } });
      }
    }

    const deletedChapter = await db.chapter.delete({
      where: { id: params.chapterId }
    });

    const publishedCount = await db.chapter.count({
      where: { courseId: params.courseId, isPublished: true }
    });

    if (publishedCount === 0) {
      await db.course.update({
        where: { id: params.courseId },
        data: { isPublished: false }
      });
    }

    return apiOk(deletedChapter);
  } catch (error) {
    return handleRouteError('CHAPTER_ID_DELETE', error);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { courseId: string; chapterId: string } }
) {
  try {
    const { userId } = await auth();

    const denied = await checkCourseEdit(userId, params.courseId);
    if (denied) return denied;

    const body = await req.json();
    const validation = validateRequest(updateChapterSchema, body);
    if (!validation.success) return validation.response;

    if (validation.data.pdfUrl !== undefined) {
      const existing = await db.chapter.findUnique({
        where: {
          id: params.chapterId,
          courseId: params.courseId
        },
        select: { pdfUrl: true }
      });
      const existingPdfUrl = (existing as { pdfUrl?: string } | null)?.pdfUrl ?? null;
      const newPdfUrl = validation.data.pdfUrl ?? null;
      if (existingPdfUrl !== newPdfUrl) {
        const oldKey = urlToR2Key(existingPdfUrl);
        if (oldKey) {
          try {
            await deleteObject(oldKey);
          } catch {
            // continue — object may already be gone
          }
        }
      }
    }

    const safeData = {
      ...validation.data,
      youtubeVideoId: validation.data.youtubeVideoId ?? null
    };

    const chapter = await db.chapter.update({
      where: {
        id: params.chapterId,
        courseId: params.courseId
      },
      data: safeData
    });

    if (validation.data.videoUrl) {
      const existingMuxData = await db.muxData.findFirst({
        where: { chapterId: params.chapterId }
      });

      if (existingMuxData) {
        const isUsedElsewhere = await db.muxData.findFirst({
          where: {
            assetId: existingMuxData.assetId,
            chapterId: { not: params.chapterId }
          }
        });

        if (!isUsedElsewhere) {
          try {
            await getMuxVideo().Assets.del(existingMuxData.assetId);
          } catch {
            // Mux asset may already be deleted
          }
        }
        await db.muxData.delete({ where: { id: existingMuxData.id } });
      }

      try {
        const asset = await getMuxVideo().Assets.create({
          input: validation.data.videoUrl,
          playback_policy: ['public'],
          test: false
        });

        if (asset) {
          await db.muxData.create({
            data: {
              chapterId: params.chapterId,
              assetId: asset.id,
              playbackId: asset.playback_ids?.[0]?.id
            }
          });
        }
      } catch (error) {
        console.error('[MUX_ASSET_CREATE]', error instanceof Error ? error.message : error);
      }
    }

    return apiOk(chapter);
  } catch (error) {
    return handleRouteError('COURSES_CHAPTER_ID', error);
  }
}
