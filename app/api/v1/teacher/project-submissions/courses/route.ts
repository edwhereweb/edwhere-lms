import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { apiOk, apiErr, handleRouteError } from '@/lib/api-response';

// GET /api/v1/teacher/project-submissions/courses
// Returns courses the current user can review that have ≥1 HANDS_ON_PROJECT chapter
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return apiErr('UNAUTHORIZED', 'Unauthorized', 401);

    const profile = await db.profile.findUnique({ where: { userId } });
    if (!profile || (profile.role !== 'ADMIN' && profile.role !== 'TEACHER'))
      return apiErr('FORBIDDEN', 'Forbidden', 403);

    const isAdmin = profile.role === 'ADMIN';

    const courses = await db.course.findMany({
      where: isAdmin
        ? {
            chapters: { some: { contentType: 'HANDS_ON_PROJECT' } }
          }
        : {
            chapters: { some: { contentType: 'HANDS_ON_PROJECT' } },
            OR: [{ userId }, { instructors: { some: { profile: { userId } } } }]
          },
      select: {
        id: true,
        title: true,
        imageUrl: true,
        _count: {
          select: {
            chapters: { where: { contentType: 'HANDS_ON_PROJECT' } }
          }
        }
      },
      orderBy: { title: 'asc' }
    });

    return apiOk(courses);
  } catch (error) {
    return handleRouteError('PROJECT_SUBMISSIONS_COURSES', error);
  }
}
