import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { isTeacher } from '@/lib/teacher';
import { createCourseSchema } from '@/lib/validations';
import { apiOk, apiErr, validateRequest, handleRouteError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return apiErr('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const teacherAccess = await isTeacher();
    if (!teacherAccess) {
      return apiErr('FORBIDDEN', 'Forbidden', 403);
    }

    const body = await req.json();
    const validation = validateRequest(createCourseSchema, body);
    if (!validation.success) return validation.response;

    const course = await db.course.create({
      data: {
        userId,
        title: validation.data.title
      }
    });

    return apiOk(course);
  } catch (error) {
    return handleRouteError('COURSES', error);
  }
}
