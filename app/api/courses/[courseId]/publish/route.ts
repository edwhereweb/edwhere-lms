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

    const missingFields = [];
    if (!course.title) missingFields.push('title');
    if (!course.description) missingFields.push('description');
    if (!course.imageUrl) missingFields.push('imageUrl');
    if (!course.categoryId) missingFields.push('categoryId');
    if (course.chapters.length === 0)
      missingFields.push('chapters (at least one published chapter required)');
    if (course.price == null) missingFields.push('price (null)');
    else if (course.price <= 0) missingFields.push('price (<= 0)');

    if (missingFields.length > 0) {
      return new NextResponse(
        JSON.stringify({
          error: 'Missing required fields',
          missingFields
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
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
