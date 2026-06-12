import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { checkCourseEdit } from '@/lib/course-auth';
import { apiError, handleApiError } from '@/lib/api-utils';

export async function PATCH(
  req: Request,
  { params }: { params: { courseId: string; moduleId: string } }
) {
  try {
    const { userId } = await auth();

    const denied = await checkCourseEdit(userId, params.courseId);
    if (denied) return denied;

    const courseModule = await db.module.findUnique({
      where: {
        id: params.moduleId,
        courseId: params.courseId
      },
      include: {
        chapters: {
          where: {
            isPublished: true
          }
        }
      }
    });

    if (!courseModule) {
      return apiError('Not found', 404);
    }

    if (!courseModule.title || courseModule.chapters.length === 0) {
      return apiError('Missing required fields or no published chapters', 400);
    }

    const publishedModule = await db.module.update({
      where: {
        id: params.moduleId,
        courseId: params.courseId
      },
      data: {
        isPublished: true
      }
    });

    return NextResponse.json(publishedModule);
  } catch (error) {
    return handleApiError('MODULE_PUBLISH', error);
  }
}
