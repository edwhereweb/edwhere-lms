import Mux from '@mux/mux-node';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { canEditCourse } from '@/lib/course-auth';
import { apiOk, apiErr, validateRequest, handleRouteError } from '@/lib/api-response';
import { z } from 'zod';

function getMuxVideo() {
  const { Video } = new Mux(process.env.MUX_TOKEN_ID!, process.env.MUX_TOKEN_SECRET!);
  return Video;
}

const bodySchema = z.object({
  courseId: z.string().min(1),
  videos: z
    .array(z.object({ title: z.string().min(1).max(200) }))
    .min(1)
    .max(100)
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return apiErr('UNAUTHORIZED', 'Unauthorized', 401);

    const body = await req.json();
    const validation = validateRequest(bodySchema, body);
    if (!validation.success) return validation.response;

    const { courseId, videos } = validation.data;

    const allowed = await canEditCourse(userId, courseId);
    if (!allowed) return apiErr('FORBIDDEN', 'Forbidden', 403);

    const muxVideo = getMuxVideo();
    const results: { chapterId: string; uploadUrl: string; uploadId: string; title: string }[] = [];

    for (const video of videos) {
      // Create Mux Direct Upload — client PUTs the file directly to this URL
      const upload = await muxVideo.Uploads.create({
        cors_origin: '*',
        new_asset_settings: { playback_policy: ['public'] }
      });

      // Create a library-only chapter (isLibraryAsset keeps it out of the structure)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chapter = await (db.chapter.create as any)({
        data: {
          title: video.title,
          courseId,
          contentType: 'VIDEO_MUX',
          isLibraryAsset: true,
          isPublished: false,
          position: 0
        }
      });

      // MuxData placeholder — real assetId will be filled by the status poller
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db.muxData.create as any)({
        data: {
          chapterId: chapter.id,
          assetId: '',
          muxUploadId: upload.id
        }
      });

      results.push({
        chapterId: chapter.id,
        uploadUrl: upload.url,
        uploadId: upload.id,
        title: video.title
      });
    }

    return apiOk({ uploads: results });
  } catch (error) {
    return handleRouteError('ASSET_LIBRARY_MUX_UPLOAD_CREATE', error);
  }
}
