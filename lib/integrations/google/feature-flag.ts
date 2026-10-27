import { parseEnvBoolean } from '@/lib/parse-env-boolean';

/**
 * Single source of truth for the platform-wide Google Meet flag. Read from process.env on every
 * call (never cached) so pages, API routes and workers always agree.
 */
export function isGoogleMeetEnabled(): boolean {
  return parseEnvBoolean(process.env.GOOGLE_MEET_ENABLED);
}

/** Live sessions are usable only when both the platform flag and the course flag are on. */
export function isGoogleMeetAvailableForCourse(courseEnabled: boolean | null | undefined): boolean {
  return isGoogleMeetEnabled() && courseEnabled === true;
}
