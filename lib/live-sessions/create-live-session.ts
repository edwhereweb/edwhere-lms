import { db } from '@/lib/db';
import { debug, logError } from '@/lib/debug';
import { canEditCourse } from '@/lib/course-auth';
import {
  createCalendarEventForMeet,
  deleteCalendarEvent
} from '@/lib/integrations/google/calendar';
import { addCohost, addSpaceMembers, createInstantSpace } from '@/lib/integrations/google/meet';
import { canUseMeet } from './access';
import { LiveSessionError } from './errors';

const INSTANT_DEFAULT_DURATION_MS = 60 * 60 * 1000;

export interface CreateLiveSessionInput {
  courseId: string;
  chapterId?: string;
  title: string;
  mode?: 'SCHEDULED' | 'INSTANT';
  startsAt?: Date;
  endsAt?: Date;
  enableAutoRecording?: boolean;
}

async function resolveInstructor(userId: string, courseId: string) {
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: {
      userId: true,
      googleMeetEnabled: true,
      instructors: { select: { profile: { select: { userId: true, email: true } } } }
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

  const coInstructorEmails = course.instructors
    .map((i) => i.profile?.email)
    .filter((e): e is string => !!e && e.includes('@'));

  const allInstructorEmails = Array.from(
    new Set([profile.email, ...coInstructorEmails].map((e) => e.trim().toLowerCase()))
  );

  return { instructorUserId, instructorEmail: profile.email, allInstructorEmails };
}

/** Returns emails of all users enrolled in the course (excluding instructors). */
async function getEnrolledStudentEmails(
  courseId: string,
  excludeEmails: string[]
): Promise<string[]> {
  const purchases = await db.purchase.findMany({
    where: { courseId },
    select: { userId: true }
  });

  if (purchases.length === 0) return [];

  const userIds = purchases.map((p) => p.userId);
  const profiles = await db.profile.findMany({
    where: { userId: { in: userIds } },
    select: { email: true }
  });

  const excluded = new Set(excludeEmails.map((e) => e.trim().toLowerCase()));

  return profiles
    .map((p) => p.email?.trim().toLowerCase())
    .filter((email): email is string => !!email && email.includes('@') && !excluded.has(email));
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
  const { instructorUserId, instructorEmail, allInstructorEmails } = await resolveInstructor(
    userId,
    input.courseId
  );

  if (input.chapterId) {
    const chapter = await db.chapter.findFirst({
      where: { id: input.chapterId, courseId: input.courseId },
      select: { contentType: true }
    });
    if (!chapter) throw new LiveSessionError('Module content not found', 404);
    if (chapter.contentType !== 'LIVE_SESSION') {
      throw new LiveSessionError('This content item is not a live session', 400);
    }
  }

  const startsAt = mode === 'INSTANT' ? new Date() : input.startsAt!;
  const endsAt =
    mode === 'INSTANT'
      ? (input.endsAt ?? new Date(startsAt.getTime() + INSTANT_DEFAULT_DURATION_MS))
      : input.endsAt!;

  let eventId: string | null = null;
  let joinUrl: string;
  let spaceName: string;
  let cohostReady = false;

  try {
    // 1. Create Google Meet space with RESTRICTED access and auto-recording configured
    const space = await createInstantSpace({
      enableAutoRecording: input.enableAutoRecording
    });
    joinUrl = space.joinUrl;
    spaceName = space.spaceName;

    // 2. Set up instructors as cohosts first
    for (const email of allInstructorEmails) {
      try {
        await addCohost(spaceName, email);
        if (email.toLowerCase() === instructorEmail.toLowerCase()) {
          cohostReady = true;
        }
      } catch (error) {
        debug('LIVE_SESSION_COHOST_FAILED', spaceName, email, error);
      }
    }

    // 3. Add enrolled students as space members (excluding instructors)
    let studentEmails: string[] = [];
    try {
      studentEmails = await getEnrolledStudentEmails(input.courseId, allInstructorEmails);
      if (studentEmails.length > 0) {
        await addSpaceMembers(spaceName, studentEmails);
      }
    } catch (error) {
      debug('LIVE_SESSION_STUDENT_INVITE_FAILED', error);
    }

    // 4. Create Google Calendar event with email invitations for instructors and enrolled students
    try {
      eventId = await createCalendarEventForMeet({
        title: input.title,
        startsAt,
        endsAt,
        instructorEmail,
        attendeeEmails: Array.from(new Set([...allInstructorEmails, ...studentEmails])),
        joinUrl
      });
    } catch (error) {
      debug('LIVE_SESSION_CALENDAR_FAILED', error);
    }

    return await db.liveSession.create({
      data: {
        courseId: input.courseId,
        chapterId: input.chapterId,
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
        hostConfigStatus: cohostReady ? 'READY' : 'PENDING',
        cohostAssignedAt: cohostReady ? new Date() : undefined
      }
    });
  } catch (error) {
    if (eventId) {
      await deleteCalendarEvent(eventId).catch((e) => debug('LIVE_SESSION_ROLLBACK_FAILED', e));
    }
    logError('LIVE_SESSION_CREATE', error);
    if (error instanceof LiveSessionError) throw error;
    const detail = error instanceof Error ? `: ${error.message}` : '';
    throw new LiveSessionError(`Failed to create Google Meet session${detail}`, 502);
  }
}
