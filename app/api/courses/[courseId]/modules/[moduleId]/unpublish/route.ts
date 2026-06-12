import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { checkCourseEdit } from '@/lib/course-auth';
import { handleApiError } from '@/lib/api-utils';

export async function PATCH(
  req: Request,
  { params }: { params: { courseId: string; moduleId: string } }
) {
  try {
    const { userId } = await auth();

    const denied = await checkCourseEdit(userId, params.courseId);
    if (denied) return denied;

    const courseModule = await db.module.update({
      where: {
        id: params.moduleId,
        courseId: params.courseId
      },
      data: {
        isPublished: false
      }
    });

    return NextResponse.json(courseModule);
  } catch (error) {
    return handleApiError('MODULE_UNPUBLISH', error);
  }
}
