import Mux from '@mux/mux-node';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkCourseEdit } from '@/lib/course-auth';
import { apiError, handleApiError } from '@/lib/api-utils';

function getMuxVideo() {
  const { Video } = new Mux(process.env.MUX_TOKEN_ID!, process.env.MUX_TOKEN_SECRET!);
  return Video;
}

/**
 * POST /api/courses/[courseId]/chapters/[chapterId]/mux-upload
 *
 * Creates a Mux Direct Upload URL for a single chapter video.
 * The client uploads the file directly to Mux via PUT.
 * The status poller at /api/admin/asset-library/mux-upload/[uploadId]
 * then backfills assetId and playbackId when Mux finishes processing.
 */
export async function POST(
  _req: Request,
  { params }: { params: { courseId: string; chapterId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const denied = await checkCourseEdit(userId, params.courseId);
    if (denied) return denied;

    const chapter = await db.chapter.findUnique({
      where: { id: params.chapterId, courseId: params.courseId }
    });
    if (!chapter) return apiError('Chapter not found', 404);

    const muxVideo = getMuxVideo();

    // Delete old Mux asset if one exists
    const existingMuxData = await db.muxData.findUnique({
      where: { chapterId: params.chapterId }
    });
    if (existingMuxData) {
      if (existingMuxData.assetId) {
        const isUsedElsewhere = await db.muxData.findFirst({
          where: {
            assetId: existingMuxData.assetId,
            chapterId: { not: params.chapterId }
          }
        });

        if (!isUsedElsewhere) {
          try {
            await muxVideo.Assets.del(existingMuxData.assetId);
          } catch {
            // Asset may already be gone — safe to ignore
          }
        }
      }
      await db.muxData.delete({ where: { id: existingMuxData.id } });
    }

    // Create a Mux Direct Upload — client PUTs the video file straight to this URL
    const upload = await muxVideo.Uploads.create({
      cors_origin: '*',
      new_asset_settings: { playback_policy: 'public' }
    });

    // Store muxUploadId so the status poller can track it
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db.muxData.create as any)({
      data: {
        chapterId: params.chapterId,
        assetId: '',
        muxUploadId: upload.id
      }
    });

    // Clear old videoUrl while upload is in progress
    await db.chapter.update({
      where: { id: params.chapterId },
      data: { videoUrl: null }
    });

    return NextResponse.json({ uploadUrl: upload.url, uploadId: upload.id });
  } catch (error) {
    return handleApiError('CHAPTER_MUX_UPLOAD_CREATE', error);
  }
}
