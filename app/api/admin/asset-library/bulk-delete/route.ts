import Mux from '@mux/mux-node';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import getSafeProfile from '@/actions/get-safe-profile';
import { apiError, handleApiError, validateBody } from '@/lib/api-utils';
import { urlToR2Key, deleteObject } from '@/lib/r2';
import { z } from 'zod';

function getMuxVideo() {
  const { Video } = new Mux(process.env.MUX_TOKEN_ID!, process.env.MUX_TOKEN_SECRET!);
  return Video;
}

const bodySchema = z.object({
  assetIds: z.array(z.string().min(1)).min(1).max(50)
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await getSafeProfile();
    const isAdmin = profile?.role === 'ADMIN';
    const isTeacher = profile?.role === 'TEACHER';

    if (!profile || (!isAdmin && !isTeacher)) return apiError('Forbidden', 403);

    const body = await req.json();
    const parsed = validateBody(bodySchema, body);
    if (!parsed.success) return parsed.response;

    const { assetIds } = parsed.data;

    let allowedCourseIds: string[] = [];

    // If teacher, fetch courses they hold access to (either explicitly as owner or instructors)
    if (isTeacher && !isAdmin) {
      const teacherCourses = await db.course.findMany({
        where: {
          OR: [{ userId }, { instructors: { some: { profileId: profile.id } } }]
        },
        select: { id: true }
      });
      allowedCourseIds = teacherCourses.map((c) => c.id);
    }

    const muxVideo = getMuxVideo();
    let deletedCount = 0;

    // We process each deletion sequentially to guarantee proper cleanup logic and auth checks per chapter
    for (const chapterId of assetIds) {
      const chapter = await db.chapter.findUnique({
        where: { id: chapterId },
        include: { muxData: true }
      });

      if (!chapter) continue;

      // Access Check: Admin can delete anything, Teachers can only delete from allowed courses
      if (!isAdmin && !allowedCourseIds.includes(chapter.courseId)) {
        continue;
      }

      // 1. R2 Cleanup (PDFs)
      const chapterPdfUrl = (chapter as { pdfUrl?: string }).pdfUrl;
      const pdfKey = urlToR2Key(chapterPdfUrl);
      if (pdfKey) {
        try {
          await deleteObject(pdfKey);
        } catch {
          // ignore
        }
      }

      // 2. Mux Cleanup
      if (chapter.videoUrl && chapter.muxData) {
        const isUsedElsewhere = await db.muxData.findFirst({
          where: {
            assetId: chapter.muxData.assetId,
            chapterId: { not: chapterId }
          }
        });

        if (!isUsedElsewhere) {
          try {
            await muxVideo.Assets.del(chapter.muxData.assetId);
          } catch {
            // Mux asset may already be missing / not strictly an error
          }
        }
        await db.muxData.delete({ where: { id: chapter.muxData.id } });
      }

      // 3. Database Cleanup
      await db.chapter.delete({
        where: { id: chapterId }
      });

      // 4. Course Publishing Rules: Must have at least 1 published chapter
      const publishedCount = await db.chapter.count({
        where: { courseId: chapter.courseId, isPublished: true }
      });

      if (publishedCount === 0) {
        await db.course.update({
          where: { id: chapter.courseId },
          data: { isPublished: false }
        });
      }

      deletedCount++;
    }

    return NextResponse.json({ success: true, deletedCount });
  } catch (error) {
    return handleApiError('ASSET_LIBRARY_BULK_DELETE', error);
  }
}
