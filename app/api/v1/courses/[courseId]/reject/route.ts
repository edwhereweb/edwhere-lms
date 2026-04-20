import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { apiOk, apiErr, handleRouteError } from '@/lib/api-response';

export async function PATCH(_req: Request, { params }: { params: { courseId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return apiErr('UNAUTHORIZED', 'Unauthorized', 401);

    const profile = await db.profile.findUnique({ where: { userId } });
    if (profile?.role !== 'ADMIN') {
      return apiErr('FORBIDDEN', 'Forbidden', 403);
    }

    const course = await db.course.update({
      where: { id: params.courseId },
      data: {
        isPublished: false,
        pendingApproval: false
      }
    });

    return apiOk(course);
  } catch (error) {
    return handleRouteError('COURSE_REJECT', error);
  }
}
