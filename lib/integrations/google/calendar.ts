import { randomUUID } from 'crypto';
import { GOOGLE_SCOPES, googleRequest, GoogleApiError } from './auth';

const CALENDAR_EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

interface CalendarEventResponse {
  id?: string;
  hangoutLink?: string;
  conferenceData?: { conferenceId?: string };
}

export interface ScheduledMeet {
  eventId: string;
  joinUrl: string;
  meetingCode: string;
}

export async function createScheduledMeetEvent(input: {
  title: string;
  startsAt: Date;
  endsAt: Date;
  instructorEmail: string;
  /** Additional attendees (e.g. enrolled students) to add to the Calendar invite. */
  attendeeEmails?: string[];
}): Promise<ScheduledMeet> {
  const allAttendees = [
    { email: input.instructorEmail },
    ...(input.attendeeEmails ?? []).map((email) => ({ email }))
  ];

  const event = await googleRequest<CalendarEventResponse>({
    url: CALENDAR_EVENTS_URL,
    method: 'POST',
    scopes: [GOOGLE_SCOPES.calendar],
    params: { conferenceDataVersion: 1, sendUpdates: 'none' },
    data: {
      summary: input.title,
      start: { dateTime: input.startsAt.toISOString() },
      end: { dateTime: input.endsAt.toISOString() },
      attendees: allAttendees,
      conferenceData: {
        createRequest: {
          requestId: randomUUID(),
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      }
    }
  });

  const meetingCode = event.conferenceData?.conferenceId;
  if (!event.id || !event.hangoutLink || !meetingCode) {
    throw new GoogleApiError('Calendar event was created without a Meet link');
  }
  return { eventId: event.id, joinUrl: event.hangoutLink, meetingCode };
}

export async function createCalendarEventForMeet(input: {
  title: string;
  startsAt: Date;
  endsAt: Date;
  instructorEmail: string;
  attendeeEmails?: string[];
  joinUrl: string;
}): Promise<string> {
  const uniqueEmails = Array.from(
    new Set(
      [input.instructorEmail, ...(input.attendeeEmails ?? [])]
        .map((e) => e.trim().toLowerCase())
        .filter((e) => !!e && e.includes('@'))
    )
  );

  const attendees = uniqueEmails.map((email) => ({ email }));

  try {
    const event = await googleRequest<{ id?: string }>({
      url: CALENDAR_EVENTS_URL,
      method: 'POST',
      scopes: [GOOGLE_SCOPES.calendar],
      params: { sendUpdates: 'all' },
      data: {
        summary: input.title,
        description: `Join Google Meet: ${input.joinUrl}`,
        location: input.joinUrl,
        start: { dateTime: input.startsAt.toISOString() },
        end: { dateTime: input.endsAt.toISOString() },
        attendees
      }
    });
    if (event?.id) return event.id;
  } catch {
    // If bulk invitation fails, fall back to inviting the instructor with sendUpdates: 'all'
    const fallback = await googleRequest<{ id?: string }>({
      url: CALENDAR_EVENTS_URL,
      method: 'POST',
      scopes: [GOOGLE_SCOPES.calendar],
      params: { sendUpdates: 'all' },
      data: {
        summary: input.title,
        description: `Join Google Meet: ${input.joinUrl}`,
        location: input.joinUrl,
        start: { dateTime: input.startsAt.toISOString() },
        end: { dateTime: input.endsAt.toISOString() },
        attendees: [{ email: input.instructorEmail }]
      }
    });
    if (fallback?.id) return fallback.id;
  }

  throw new GoogleApiError('Failed to create calendar event');
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  await googleRequest<unknown>({
    url: `${CALENDAR_EVENTS_URL}/${encodeURIComponent(eventId)}`,
    method: 'DELETE',
    scopes: [GOOGLE_SCOPES.calendar],
    params: { sendUpdates: 'none' }
  });
}
