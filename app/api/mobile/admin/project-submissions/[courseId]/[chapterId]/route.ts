import { auth } from '@clerk/nextjs/server';
import { mobileSuccess, mobileError, handleMobileApiError } from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';
import { isTeacher } from '@/lib/teacher';

type Params = { params: Promise<{ courseId: string; chapterId: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const teacherAccess = await isTeacher();
    if (!teacherAccess) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const { chapterId } = await params;

    const submissions = await db.projectSubmission.findMany({
      where: { chapterId },
      orderBy: { createdAt: 'desc' }
    });

    const studentUserIds = [...new Set(submissions.map((s) => s.userId))];
    const profiles = await db.profile.findMany({
      where: { userId: { in: studentUserIds } },
      select: { userId: true, name: true }
    });
    const nameMap = new Map(profiles.map((p) => [p.userId, p.name]));

    const result = submissions.map((s) => ({
      ...s,
      studentName: nameMap.get(s.userId) ?? 'Unknown'
    }));

    return mobileSuccess(result);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_PROJECT_SUBMISSIONS_BY_CHAPTER', error);
  }
}
