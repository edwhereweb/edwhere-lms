import Mux from '@mux/mux-node';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { apiOk, apiErr, handleRouteError } from '@/lib/api-response';

function getMuxVideo() {
  const { Video } = new Mux(process.env.MUX_TOKEN_ID!, process.env.MUX_TOKEN_SECRET!);
  return Video;
}

export async function GET(_req: Request, { params }: { params: { uploadId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return apiErr('UNAUTHORIZED', 'Unauthorized', 401);

    // Find the MuxData record via muxUploadId
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const muxData = await (db.muxData.findFirst as any)({
      where: { muxUploadId: params.uploadId },
      include: {
        chapter: {
          select: {
            id: true,
            courseId: true,
            course: {
              select: {
                userId: true,
                instructors: { select: { profileId: true } }
              }
            }
          }
        }
      }
    });

    if (!muxData) return apiErr('NOT_FOUND', 'Not found', 404);

    // Access check
    const profile = await db.profile.findUnique({ where: { userId } });
    const isAdmin = profile?.role === 'ADMIN';
    const isOwner = muxData.chapter.course.userId === userId;
    const isInstructor = muxData.chapter.course.instructors.some(
      (i: { profileId: string }) => i.profileId === profile?.id
    );
    if (!isAdmin && !isOwner && !isInstructor) return apiErr('FORBIDDEN', 'Forbidden', 403);

    const muxVideo = getMuxVideo();
    const upload = await muxVideo.Uploads.get(params.uploadId);

    // If Mux created the asset and we haven't stored it yet, persist it
    if (upload.asset_id && (!muxData.assetId || muxData.assetId === '')) {
      try {
        const asset = await muxVideo.Assets.get(upload.asset_id);
        const playbackId = asset.playback_ids?.[0]?.id ?? null;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (db.muxData.update as any)({
          where: { id: muxData.id },
          data: {
            assetId: upload.asset_id,
            playbackId: playbackId ?? undefined,
            muxUploadId: null
          }
        });

        if (playbackId) {
          await db.chapter.update({
            where: { id: muxData.chapter.id },
            data: { videoUrl: `https://stream.mux.com/${playbackId}.m3u8` }
          });
        }

        return apiOk({ status: 'asset_created', playbackId });
      } catch {
        // Asset not quite ready — stay as waiting
        return apiOk({ status: 'waiting' });
      }
    }

    const statusMap: Record<string, string> = {
      waiting: 'waiting',
      asset_created: 'asset_created',
      errored: 'errored',
      timed_out: 'errored'
    };

    return apiOk({
      status: statusMap[upload.status] ?? 'waiting',
      playbackId: muxData.playbackId ?? null
    });
  } catch (error) {
    return handleRouteError('ASSET_LIBRARY_MUX_UPLOAD_STATUS', error);
  }
}
