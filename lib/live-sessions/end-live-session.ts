import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { canEditCourse } from '@/lib/course-auth';
import { LiveSessionError } from './errors';

export async function endLiveSession(userId: string, sessionId: string) {
  const session = await db.liveSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new LiveSessionError('Live session not found', 404);
  if (!(await canEditCourse(userId, session.courseId))) {
    throw new LiveSessionError('Forbidden', 403);
  }
  if (session.status === 'ENDED' || session.status === 'CANCELLED') {
    throw new LiveSessionError('Live session is already closed', 409);
  }

  const now = new Date();
  return db.liveSession.update({
    where: { id: sessionId },
    data: {
      status: 'ENDED',
      endedAt: now,
      artifactSyncStatus: 'PENDING',
      artifactRetryCount: 0,
      artifactLastError: null,
      artifactNextRetryAt: new Date(
        now.getTime() + env.GOOGLE_MEET_RECONCILE_INITIAL_DELAY_MIN * 60 * 1000
      )
    }
  });
}
