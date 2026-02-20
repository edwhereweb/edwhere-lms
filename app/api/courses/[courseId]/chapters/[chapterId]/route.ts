import Mux from '@mux/mux-node';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkCourseEdit } from '@/lib/course-auth';
import { updateChapterSchema } from '@/lib/validations';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';

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
      return apiError('Not Found', 404);
    }

    if (chapter.videoUrl) {
      const existingMuxData = await db.muxData.findFirst({
        where: { chapterId: params.chapterId }
      });

      if (existingMuxData) {
        try {
          await getMuxVideo().Assets.del(existingMuxData.assetId);
        } catch {
          // Mux asset may already be deleted — safe to continue
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

    return NextResponse.json(deletedChapter);
  } catch (error) {
    return handleApiError('CHAPTER_ID_DELETE', error);
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
    const validation = validateBody(updateChapterSchema, body);
    if (!validation.success) return validation.response;

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
        try {
          await getMuxVideo().Assets.del(existingMuxData.assetId);
        } catch {
          // Mux asset may already be deleted
        }
        await db.muxData.delete({ where: { id: existingMuxData.id } });
      }

      try {
        const asset = await getMuxVideo().Assets.create({
          input: validation.data.videoUrl,
          playback_policy: 'public',
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

    return NextResponse.json(chapter);
  } catch (error) {
    return handleApiError('COURSES_CHAPTER_ID', error);
  }
}
