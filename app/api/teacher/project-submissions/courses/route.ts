import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError, handleApiError } from '@/lib/api-utils';

// GET /api/teacher/project-submissions/courses
// Returns courses the current user can review that have ≥1 HANDS_ON_PROJECT chapter
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await db.profile.findUnique({ where: { userId } });
    if (!profile || (profile.role !== 'ADMIN' && profile.role !== 'TEACHER'))
      return apiError('Forbidden', 403);

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

    return NextResponse.json(courses);
  } catch (error) {
    return handleApiError('PROJECT_SUBMISSIONS_COURSES', error);
  }
}
