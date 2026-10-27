import { GoogleApiError, GoogleConfigError } from '@/lib/integrations/google/auth';
import { LiveSessionError } from './errors';

export interface MappedLiveSessionError {
  code: string;
  message: string;
  status: number;
}

export function mapLiveSessionCreateError(error: unknown): MappedLiveSessionError {
  const text = error instanceof Error ? error.message : '';

  if (
    error instanceof GoogleConfigError ||
    text.includes('Google service account is not configured')
  ) {
    return {
      code: 'LIVE_CONFIG_MISSING',
      message: 'Google Meet is not configured on the server. Please contact an administrator.',
      status: 503
    };
  }
  if (error instanceof GoogleApiError && (error.status === 401 || error.status === 403)) {
    return {
      code: 'GOOGLE_PERMISSION_DENIED',
      message:
        'Google denied the request. Check the service account delegation and permissions, then try again.',
      status: 502
    };
  }
  if (text.includes('Google Meet is not enabled')) {
    return {
      code: 'MEET_DISABLED',
      message: 'Google Meet is not enabled for this course.',
      status: 403
    };
  }
  if (text.includes('Instructor has no email on file')) {
    return {
      code: 'INSTRUCTOR_EMAIL_MISSING',
      message: 'The course instructor has no email on file. Add an email to their profile.',
      status: 400
    };
  }
  if (error instanceof LiveSessionError) {
    return { code: 'LIVE_CREATE_FAILED', message: error.message, status: error.status };
  }
  return { code: 'LIVE_CREATE_FAILED', message: 'Failed to create live session', status: 500 };
}
