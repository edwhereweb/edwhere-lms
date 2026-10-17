import { db } from '@/lib/db';
import { debug } from '@/lib/debug';
import { canEditCourse } from '@/lib/course-auth';
import { isWorkspaceEmail } from '@/lib/integrations/google/auth';
import { createScheduledMeetEvent, deleteCalendarEvent } from '@/lib/integrations/google/calendar';
import { addCohost, createInstantSpace, enableAutoRecording } from '@/lib/integrations/google/meet';
import { canUseMeet } from './access';
import { LiveSessionError } from './errors';

const INSTANT_DEFAULT_DURATION_MS = 60 * 60 * 1000;

export interface CreateLiveSessionInput {
  courseId: string;
  title: string;
  mode?: 'SCHEDULED' | 'INSTANT';
  startsAt?: Date;
  endsAt?: Date;
}

async function resolveInstructor(userId: string, courseId: string) {
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: {
      userId: true,
      googleMeetEnabled: true,
      instructors: { select: { profile: { select: { userId: true } } } }
    }
  });
  if (!course) throw new LiveSessionError('Course not found', 404);
  if (!canUseMeet(course)) throw new LiveSessionError('Google Meet is not enabled', 403);

  const isCourseInstructor =
    course.userId === userId || course.instructors.some((i) => i.profile.userId === userId);
  // Admins creating on behalf of a course get the course owner as cohost.
  const instructorUserId = isCourseInstructor ? userId : course.userId;

  const profile = await db.profile.findUnique({
    where: { userId: instructorUserId },
    select: { email: true }
  });
  if (!profile?.email) throw new LiveSessionError('Instructor has no email on file', 400);
  if (!isWorkspaceEmail(profile.email)) {
    throw new LiveSessionError('Instructor must use a Google Workspace account', 400);
  }
  return { instructorUserId, instructorEmail: profile.email };
}

/**
 * Creates a Meet session and assigns the course instructor as cohost.
 * Strict mode: if cohost setup fails the Google resources are rolled back and
 * nothing is persisted, so a session never exists without a configured cohost.
 */
export async function createLiveSession(userId: string, input: CreateLiveSessionInput) {
  const mode = input.mode ?? 'SCHEDULED';
  if (!(await canEditCourse(userId, input.courseId))) {
    throw new LiveSessionError('Forbidden', 403);
  }
  const { instructorUserId, instructorEmail } = await resolveInstructor(userId, input.courseId);

  const startsAt = mode === 'INSTANT' ? new Date() : input.startsAt!;
  const endsAt =
    mode === 'INSTANT'
      ? (input.endsAt ?? new Date(startsAt.getTime() + INSTANT_DEFAULT_DURATION_MS))
      : input.endsAt!;

  let eventId: string | null = null;
  let joinUrl: string;
  let spaceName: string;

  try {
    if (mode === 'SCHEDULED') {
      const meet = await createScheduledMeetEvent({
        title: input.title,
        startsAt,
        endsAt,
        instructorEmail
      });
      eventId = meet.eventId;
      joinUrl = meet.joinUrl;
      spaceName = `spaces/${meet.meetingCode}`;
    } else {
      const space = await createInstantSpace();
      joinUrl = space.joinUrl;
      spaceName = space.spaceName;
    }

    try {
      await addCohost(spaceName, instructorEmail);
    } catch (error) {
      debug('LIVE_SESSION_COHOST_FAILED', spaceName, error);
      throw new LiveSessionError('Could not assign the instructor as cohost', 502);
    }

    try {
      await enableAutoRecording(spaceName);
    } catch (error) {
      debug('LIVE_SESSION_AUTO_RECORD_FAILED', spaceName, error);
    }

    return await db.liveSession.create({
      data: {
        courseId: input.courseId,
        createdByUserId: userId,
        instructorUserId,
        instructorEmail,
        provider: 'GOOGLE_MEET',
        mode,
        status: mode === 'INSTANT' ? 'LIVE' : 'SCHEDULED',
        title: input.title,
        startsAt,
        endsAt,
        joinUrl,
        calendarEventId: eventId,
        meetSpaceName: spaceName,
        hostConfigStatus: 'READY',
        cohostAssignedAt: new Date()
      }
    });
  } catch (error) {
    if (eventId) {
      await deleteCalendarEvent(eventId).catch((e) => debug('LIVE_SESSION_ROLLBACK_FAILED', e));
    }
    if (error instanceof LiveSessionError) throw error;
    throw new LiveSessionError('Failed to create Google Meet session', 502);
  }
}
