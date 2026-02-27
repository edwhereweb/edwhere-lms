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
    for (const key of r2KeysToDelete) {
      try {
        await deleteObject(key);
      } catch {
        // continue — object may already be gone
      }
    }

    const assetIdsInCourse = Array.from(
      new Set(course.chapters.flatMap((ch) => (ch.muxData?.assetId ? [ch.muxData.assetId] : [])))
    );

    for (const assetId of assetIdsInCourse) {
      // Check if any other course is using this exact assetId
      const isUsedElsewhere = await db.muxData.findFirst({
        where: {
          assetId,
          chapter: {
            courseId: { not: courseId }
          }
        }
      });

      if (!isUsedElsewhere) {
        try {
          await getMuxVideo().Assets.del(assetId);
        } catch {
          // ignore - might already be deleted on Mux
        }
      }
    }

    const deletedCourse = await db.course.delete({
      where: { id: courseId }
    });

    return NextResponse.json(deletedCourse);
  } catch (error) {
    return handleApiError('COURSE_ID_DELETE', error);
  }
}
