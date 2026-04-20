import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { currentProfile } from '@/lib/current-profile';
import { apiOk, apiErr, handleRouteError } from '@/lib/api-response';

interface Params {
  params: { courseId: string };
}

// POST /api/v1/courses/[courseId]/messages/read-student
export async function POST(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiErr('UNAUTHORIZED', 'Unauthorized', 401);

    const profile = await currentProfile();
    if (!profile) return apiErr('UNAUTHORIZED', 'Unauthorized', 401);

    await db.studentLastRead.upsert({
      where: {
        studentId_courseId: {
          studentId: profile.id,
          courseId: params.courseId
        }
      },
      update: { lastReadAt: new Date() },
      create: {
        studentId: profile.id,
        courseId: params.courseId,
        lastReadAt: new Date()
      }
    });

    return apiOk({ ok: true });
  } catch (error) {
    return handleRouteError('MESSAGES_READ_STUDENT_POST', error);
  }
}
