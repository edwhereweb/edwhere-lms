import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { courseIdParamSchema } from '@/lib/validations';
import { accessErrorResponse, getCourseLiveAccess } from '@/lib/live-sessions/access';
import { triggerOpportunisticReconcile } from '@/lib/live-sessions/reconcile-artifacts';

export async function GET(_req: Request, { params }: { params: { courseId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const ids = validateBody(courseIdParamSchema, params);
    if (!ids.success) return ids.response;
    const { courseId } = ids.data;

    const access = await getCourseLiveAccess(userId, courseId);
    if (!access.allowed) {
      const { message, status } = accessErrorResponse(access.reason);
      return apiError(message, status);
    }

    triggerOpportunisticReconcile();

    const sessions = await db.liveSession.findMany({
      where: access.isInstructor ? { courseId } : { courseId, status: { not: 'CANCELLED' } },
      orderBy: { startsAt: 'asc' },
      select: {
        id: true,
        courseId: true,
        title: true,
        mode: true,
        status: true,
        startsAt: true,
        endsAt: true,
        joinUrl: true,
        hostConfigStatus: true,
        cohostAssignedAt: true,
        artifactSyncStatus: true,
        artifactLastError: access.isInstructor
      }
    });

    // Learners only receive a join link once host setup is confirmed and the session is open.
    return NextResponse.json(
      sessions.map((s) => {
        const joinable =
          s.hostConfigStatus === 'READY' && (s.status === 'SCHEDULED' || s.status === 'LIVE');
        return { ...s, joinUrl: joinable ? s.joinUrl : null };
      })
    );
  } catch (error) {
    return handleApiError('COURSE_LIVE_SESSIONS', error);
  }
}
