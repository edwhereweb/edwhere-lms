import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkCourseEdit } from '@/lib/course-auth';
import { apiError, handleApiError } from '@/lib/api-utils';

export async function PATCH(req: Request, { params }: { params: { courseId: string } }) {
  try {
    const { userId } = await auth();

    const denied = await checkCourseEdit(userId, params.courseId);
    if (denied) return denied;

    const course = await db.course.findUnique({
      where: { id: params.courseId }
    });

    if (!course) {
      return apiError('Not found', 404);
    }

    const unpublishedCourse = await db.course.update({
      where: { id: params.courseId },
      data: { isPublished: false }
    });

    return NextResponse.json(unpublishedCourse);
  } catch (error) {
    return handleApiError('COURSE_ID_UNPUBLISH', error);
  }
}
