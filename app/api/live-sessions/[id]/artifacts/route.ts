import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { liveSessionIdParamSchema } from '@/lib/validations';
import { accessErrorResponse, getCourseLiveAccess } from '@/lib/live-sessions/access';
import { triggerOpportunisticReconcile } from '@/lib/live-sessions/reconcile-artifacts';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const ids = validateBody(liveSessionIdParamSchema, params);
    if (!ids.success) return ids.response;

    const session = await db.liveSession.findUnique({
      where: { id: ids.data.id },
      select: {
        id: true,
        courseId: true,
        status: true,
        artifactSyncStatus: true,
        artifactRetryCount: true,
        artifactNextRetryAt: true,
        artifactsCheckedAt: true,
        artifacts: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            type: true,
            title: true,
            mimeType: true,
            url: true,
            driveFileId: true,
            durationSec: true,
            availableAt: true
          }
        }
      }
    });
    if (!session) return apiError('Live session not found', 404);

    const access = await getCourseLiveAccess(userId, session.courseId);
    if (!access.allowed) {
      const { message, status } = accessErrorResponse(access.reason);
      return apiError(message, status);
    }

    triggerOpportunisticReconcile();

    const visible =
      access.isInstructor || session.artifacts.length > 0 || session.artifactSyncStatus === 'READY';
    return NextResponse.json({
      id: session.id,
      status: session.status,
      artifactSyncStatus: session.artifactSyncStatus,
      artifactRetryCount: access.isInstructor ? session.artifactRetryCount : undefined,
      artifactNextRetryAt: access.isInstructor ? session.artifactNextRetryAt : undefined,
      artifactsCheckedAt: session.artifactsCheckedAt,
      artifacts: visible ? session.artifacts : []
    });
  } catch (error) {
    return handleApiError('LIVE_SESSIONS_ARTIFACTS', error);
  }
}
