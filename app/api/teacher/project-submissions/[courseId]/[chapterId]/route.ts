import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError, handleApiError } from '@/lib/api-utils';
import { canEditCourse } from '@/lib/course-auth';

// GET /api/teacher/project-submissions/[courseId]/[chapterId]
// Returns all submissions for a project chapter with student info
export async function GET(
  _req: Request,
  { params }: { params: { courseId: string; chapterId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const allowed = await canEditCourse(userId, params.courseId);
    if (!allowed) return apiError('Forbidden', 403);

    const submissions = await db.projectSubmission.findMany({
      where: { chapterId: params.chapterId },
      orderBy: { updatedAt: 'desc' }
    });

    // Fetch student profile info for each submission
    const userIds = submissions.map((s) => s.userId);
    const profiles = await db.profile.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, name: true, email: true, imageUrl: true }
    });
    const profileMap = Object.fromEntries(profiles.map((p) => [p.userId, p]));

    const result = submissions.map((s) => ({
      id: s.id,
      userId: s.userId,
      driveUrl: s.driveUrl,
      status: s.status,
      reviewNote: s.reviewNote,
      reviewedAt: s.reviewedAt,
      reviewedBy: s.reviewedBy,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      student: profileMap[s.userId] ?? {
        userId: s.userId,
        name: 'Unknown',
        email: '',
        imageUrl: null
      }
    }));

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError('PROJECT_SUBMISSIONS_CHAPTER', error);
  }
}
