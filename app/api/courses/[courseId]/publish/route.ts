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
      where: { id: params.courseId },
      include: {
        chapters: {
          where: { isPublished: true },
          select: { id: true }
        }
      }
    });

    if (!course) {
      return apiError('Not found', 404);
    }

    if (
      !course.title ||
      !course.description ||
      !course.imageUrl ||
      !course.categoryId ||
      course.chapters.length === 0 ||
      course.price == null ||
      course.price <= 0
    ) {
      return apiError('Missing required fields', 400);
    }

    const updatedCourse = await db.course.update({
      where: { id: params.courseId },
      data: {
        pendingApproval: true,
        isPublished: false
      }
    });

    return NextResponse.json(updatedCourse);
  } catch (error) {
    return handleApiError('COURSE_ID_PUBLISH', error);
  }
}
