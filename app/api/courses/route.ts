import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { isTeacher } from '@/lib/teacher';
import { createCourseSchema } from '@/lib/validations';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return apiError('Unauthorized', 401);
    }

    const teacherAccess = await isTeacher();
    if (!teacherAccess) {
      return apiError('Forbidden', 403);
    }

    const body = await req.json();
    const validation = validateBody(createCourseSchema, body);
    if (!validation.success) return validation.response;

    const course = await db.course.create({
      data: {
        userId,
        title: validation.data.title
      }
    });

    return NextResponse.json(course);
  } catch (error) {
    return handleApiError('COURSES', error);
  }
}
