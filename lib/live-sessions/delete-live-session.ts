import { db } from '@/lib/db';
import { debug } from '@/lib/debug';
import { canEditCourse } from '@/lib/course-auth';
import { deleteCalendarEvent } from '@/lib/integrations/google/calendar';
import { LiveSessionError } from './errors';

export async function deleteLiveSession(userId: string, sessionId: string) {
  const session = await db.liveSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new LiveSessionError('Live session not found', 404);
  if (!(await canEditCourse(userId, session.courseId))) {
    throw new LiveSessionError('Forbidden', 403);
  }

  // Best-effort removal of the associated Google Calendar event
  if (session.calendarEventId) {
    try {
      await deleteCalendarEvent(session.calendarEventId);
    } catch (error) {
      debug('LIVE_SESSION_DELETE_CALENDAR_FAILED', session.calendarEventId, error);
    }
  }

  return db.liveSession.delete({
    where: { id: sessionId }
  });
}
