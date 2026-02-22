import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { checkCourseEdit } from '@/lib/course-auth';
import { updateCourseSchema } from '@/lib/validations';
import { validateBody, handleApiError } from '@/lib/api-utils';
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
        chapters: {
          include: { muxData: true }
        }
      }
    });

    if (!course) {
      return new NextResponse('Not found', { status: 404 });
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
