import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError, handleApiError } from '@/lib/api-utils';

export async function PATCH(req: Request, { params }: { params: { courseId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await db.profile.findUnique({ where: { userId } });
    if (profile?.role !== 'ADMIN') {
      return apiError('Forbidden', 403);
    }

    const course = await db.course.update({
      where: { id: params.courseId },
      data: {
        isPublished: true,
        pendingApproval: false
      }
    });

    return NextResponse.json(course);
  } catch (error) {
    return handleApiError('COURSE_APPROVE', error);
  }
}
