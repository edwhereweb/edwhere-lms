import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkCourseEdit, canEditCourse } from '@/lib/course-auth';
import { apiError, handleApiError } from '@/lib/api-utils';
import { z } from 'zod';

const importSchema = z.object({
  sourceChapterId: z.string().min(1)
});

// Map of which chapter fields to copy per content type
const CONTENT_FIELD_MAP: Record<string, string[]> = {
  VIDEO_MUX: ['videoUrl'],
  VIDEO_YOUTUBE: ['youtubeVideoId'],
  TEXT: ['content'],
  HTML_EMBED: ['htmlContent'],
  PDF_DOCUMENT: ['pdfUrl']
};

export async function POST(
  req: Request,
  { params }: { params: { courseId: string; chapterId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    // Must be able to edit the target course
    const denied = await checkCourseEdit(userId, params.courseId);
    if (denied) return denied;

    const body = await req.json();
    const parsed = importSchema.safeParse(body);
    if (!parsed.success) return apiError('sourceChapterId is required', 400);

    const { sourceChapterId } = parsed.data;

    // Fetch target chapter
    const targetChapter = await db.chapter.findUnique({
      where: { id: params.chapterId, courseId: params.courseId },
      select: { id: true, contentType: true }
    });
    if (!targetChapter) return apiError('Target chapter not found', 404);

    const contentType = targetChapter.contentType ?? 'VIDEO_MUX';
    const fields = CONTENT_FIELD_MAP[contentType];
    if (!fields) return apiError('Unsupported content type', 400);

    // Fetch source chapter including its MuxData for VIDEO_MUX
    const sourceChapter = await db.chapter.findUnique({
      where: { id: sourceChapterId },
      select: {
        videoUrl: true,
        youtubeVideoId: true,
        content: true,
        htmlContent: true,
        pdfUrl: true,
        muxData: {
          select: { assetId: true, playbackId: true }
        },
        course: {
          select: {
            id: true,
            userId: true,
            instructors: { select: { profileId: true } }
          }
        }
      }
    });
    if (!sourceChapter) return apiError('Source chapter not found', 404);

    // Verify the caller can read the source course
    const canReadSource = await canEditCourse(userId, sourceChapter.course.id);
    if (!canReadSource) return apiError('Forbidden: no access to source asset', 403);

    // Build update payload from allowed fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};
    for (const field of fields) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updateData[field] = (sourceChapter as any)[field] ?? null;
    }

    const updated = await db.chapter.update({
      where: { id: params.chapterId },
      data: updateData
    });

    // For VIDEO_MUX: also copy MuxData so the Mux player works immediately
    if (contentType === 'VIDEO_MUX' && sourceChapter.muxData?.assetId) {
      const { assetId, playbackId } = sourceChapter.muxData;

      // Remove existing MuxData on the target chapter (if any)
      await db.muxData.deleteMany({ where: { chapterId: params.chapterId } });

      // Create a new MuxData record pointing to the same Mux asset
      await db.muxData.create({
        data: {
          chapterId: params.chapterId,
          assetId,
          playbackId: playbackId ?? undefined
        }
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError('IMPORT_ASSET', error);
  }
}
