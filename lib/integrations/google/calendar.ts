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
}): Promise<ScheduledMeet> {
  const event = await googleRequest<CalendarEventResponse>({
    url: CALENDAR_EVENTS_URL,
    method: 'POST',
    scopes: [GOOGLE_SCOPES.calendar],
    params: { conferenceDataVersion: 1, sendUpdates: 'none' },
    data: {
      summary: input.title,
      start: { dateTime: input.startsAt.toISOString() },
      end: { dateTime: input.endsAt.toISOString() },
      attendees: [{ email: input.instructorEmail }],
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

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  await googleRequest<unknown>({
    url: `${CALENDAR_EVENTS_URL}/${encodeURIComponent(eventId)}`,
    method: 'DELETE',
    scopes: [GOOGLE_SCOPES.calendar],
    params: { sendUpdates: 'none' }
  });
}
