import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError, handleApiError } from '@/lib/api-utils';
import { canEditCourse } from '@/lib/course-auth';

// GET /api/teacher/project-submissions/[courseId]
// Returns all HANDS_ON_PROJECT chapters with submission counts
export async function GET(_req: Request, { params }: { params: { courseId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const allowed = await canEditCourse(userId, params.courseId);
    if (!allowed) return apiError('Forbidden', 403);

    const chapters = await db.chapter.findMany({
      where: {
        courseId: params.courseId,
        contentType: 'HANDS_ON_PROJECT'
      },
      select: {
        id: true,
        title: true,
        isPublished: true,
        projectSubmissions: {
          select: { status: true }
        }
      },
      orderBy: { position: 'asc' }
    });

    const result = chapters.map((ch) => ({
      id: ch.id,
      title: ch.title,
      isPublished: ch.isPublished,
      pendingCount: ch.projectSubmissions.filter((s) => s.status === 'PENDING').length,
      approvedCount: ch.projectSubmissions.filter((s) => s.status === 'APPROVED').length,
      rejectedCount: ch.projectSubmissions.filter((s) => s.status === 'REJECTED').length,
      totalCount: ch.projectSubmissions.length
    }));

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError('PROJECT_SUBMISSIONS_COURSE', error);
  }
}
