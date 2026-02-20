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
