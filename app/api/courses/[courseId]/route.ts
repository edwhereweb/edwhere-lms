import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { checkCourseEdit } from '@/lib/course-auth';
import { updateCourseSchema } from '@/lib/validations';
import { validateBody, handleApiError } from '@/lib/api-utils';
import { urlToR2Key, deleteObject } from '@/lib/r2';
import Mux from '@mux/mux-node';

function getMuxVideo() {
  const { Video } = new Mux(process.env.MUX_TOKEN_ID!, process.env.MUX_TOKEN_SECRET!);
  return Video;
}

export async function PATCH(req: Request, { params }: { params: { courseId: string } }) {
  try {
    const { userId } = await auth();
    const { courseId } = params;

    const denied = await checkCourseEdit(userId, courseId);
    if (denied) return denied;

    const body = await req.json();
    const validation = validateBody(updateCourseSchema, body);
    if (!validation.success) return validation.response;

    // Enforce slug uniqueness at app level (MongoDB can't do unique on nullable)
    if (validation.data.slug) {
      const existing = await db.course.findFirst({
        where: { slug: validation.data.slug, NOT: { id: courseId } }
      });
      if (existing) {
        return new NextResponse(
          JSON.stringify({ error: 'This slug is already in use by another course' }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    if (validation.data.imageUrl !== undefined) {
      const existing = await db.course.findUnique({
        where: { id: courseId },
        select: { imageUrl: true }
      });
      const oldKey = urlToR2Key(existing?.imageUrl ?? null);
      const newUrl = validation.data.imageUrl;
      if (oldKey && newUrl !== existing?.imageUrl) {
        try {
          await deleteObject(oldKey);
        } catch {
          // continue — object may already be gone
        }
      }
    }

    const course = await db.course.update({
      where: { id: courseId },
      data: validation.data
    });

    return NextResponse.json(course);
  } catch (error) {
    return handleApiError('COURSE_ID', error);
  }
}

export async function DELETE(req: Request, { params }: { params: { courseId: string } }) {
  try {
    const { userId } = await auth();
    const { courseId } = params;

    const denied = await checkCourseEdit(userId, courseId);
    if (denied) return denied;

    const course = await db.course.findUnique({
      where: { id: courseId },
      include: {
        attachments: true,
        chapters: {
          include: { muxData: true }
        }
      }
    });

    if (!course) {
      return new NextResponse('Not found', { status: 404 });
    }

    const r2KeysToDelete: string[] = [];
    const courseImageKey = urlToR2Key(course.imageUrl);
    if (courseImageKey) r2KeysToDelete.push(courseImageKey);
    for (const att of course.attachments) {
      const k = urlToR2Key(att.url);
      if (k) r2KeysToDelete.push(k);
    }
    for (const ch of course.chapters) {
      const pdfKey = urlToR2Key((ch as { pdfUrl?: string }).pdfUrl);
      if (pdfKey) r2KeysToDelete.push(pdfKey);
    }
    // allSettled: a missing object must not stop the rest of the cleanup.
    await Promise.allSettled(r2KeysToDelete.map(async (key) => deleteObject(key)));

    const assetIdsInCourse = Array.from(
      new Set(course.chapters.flatMap((ch) => (ch.muxData?.assetId ? [ch.muxData.assetId] : [])))
    );

    // One lookup for which assets other courses still use, instead of one per asset.
    const sharedAssets = assetIdsInCourse.length
      ? await db.muxData.findMany({
          where: {
            assetId: { in: assetIdsInCourse },
            chapter: { courseId: { not: courseId } }
          },
          select: { assetId: true }
        })
      : [];
    const sharedAssetIds = new Set(sharedAssets.map((m) => m.assetId));

    // allSettled: an asset already deleted on Mux must not stop the rest.
    await Promise.allSettled(
      assetIdsInCourse
        .filter((assetId) => !sharedAssetIds.has(assetId))
        .map(async (assetId) => getMuxVideo().Assets.del(assetId))
    );

    const deletedCourse = await db.course.delete({
      where: { id: courseId }
    });

    return NextResponse.json(deletedCourse);
  } catch (error) {
    return handleApiError('COURSE_ID_DELETE', error);
  }
}
