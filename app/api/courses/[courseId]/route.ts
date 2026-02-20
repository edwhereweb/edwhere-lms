import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { checkCourseEdit } from '@/lib/course-auth';
import { updateCourseSchema } from '@/lib/validations';
import { validateBody, handleApiError } from '@/lib/api-utils';

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

    // Since we're deleting, we might want to clean up Mux assets (omitted for brevity, can be added if Video.js wrapper exists)
    // The cascade delete in Prisma (if configured) will handle the DB rows.
    // Here we explicitly perform the delete.
    const deletedCourse = await db.course.delete({
      where: { id: courseId }
    });

    return NextResponse.json(deletedCourse);
  } catch (error) {
    return handleApiError('COURSE_ID_DELETE', error);
  }
}
