import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError, handleApiError } from '@/lib/api-utils';
import { debug } from '@/lib/debug';
import { canEditCourse } from '@/lib/course-auth';
import {
  GOOGLE_SCOPES,
  getDelegatedAuthClient,
  isGoogleMeetEnabled
} from '@/lib/integrations/google/auth';
import type { PreflightChecks, PreflightResponse } from '@/lib/live-sessions/ui';

function hasGoogleConfig(): boolean {
  return !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL &&
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY &&
    process.env.GOOGLE_DELEGATED_SUBJECT
  );
}

export async function GET(_req: Request, { params }: { params: { courseId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const { courseId } = params;
    const messages: string[] = [];
    const checks: PreflightChecks = {
      auth: 'PASS',
      courseAccess: 'FAIL',
      courseExists: 'FAIL',
      globalMeetEnabled: 'FAIL',
      courseMeetEnabled: 'FAIL',
      instructorEmail: 'FAIL',
      googleConfig: 'FAIL',
      googleApiProbe: 'FAIL'
    };
    const respond = (status = 200) => {
      const body: PreflightResponse = {
        ok: Object.values(checks).every((c) => c !== 'FAIL'),
        checks,
        messages
      };
      return NextResponse.json(body, { status });
    };

    if (!(await canEditCourse(userId, courseId))) {
      messages.push('You do not have permission to manage live sessions for this course.');
      return respond(403);
    }
    checks.courseAccess = 'PASS';

    const course = await db.course.findUnique({
      where: { id: courseId },
      select: {
        userId: true,
        googleMeetEnabled: true,
        instructors: { select: { profile: { select: { userId: true } } } }
      }
    });
    if (!course) {
      messages.push('Course not found.');
      return respond(404);
    }
    checks.courseExists = 'PASS';

    if (isGoogleMeetEnabled()) {
      checks.globalMeetEnabled = 'PASS';
    } else {
      messages.push('Google Meet is turned off for the platform (GOOGLE_MEET_ENABLED).');
    }

    if (course.googleMeetEnabled) {
      checks.courseMeetEnabled = 'PASS';
    } else {
      messages.push('Enable Google Meet in this course’s settings.');
    }

    const isCourseInstructor =
      course.userId === userId || course.instructors.some((i) => i.profile.userId === userId);
    const instructorUserId = isCourseInstructor ? userId : course.userId;
    const profile = await db.profile.findUnique({
      where: { userId: instructorUserId },
      select: { email: true }
    });
    if (profile?.email && profile.email.includes('@')) {
      checks.instructorEmail = 'PASS';
    } else {
      messages.push('The course instructor has no valid email on their profile.');
    }

    if (hasGoogleConfig()) {
      checks.googleConfig = 'PASS';
    } else {
      messages.push('Google service account credentials are not fully configured on the server.');
    }

    if (checks.googleConfig === 'PASS') {
      try {
        await getDelegatedAuthClient([GOOGLE_SCOPES.meetCreate]).getAccessToken();
        checks.googleApiProbe = 'PASS';
      } catch (error) {
        debug('LIVE_PREFLIGHT_PROBE_FAILED', error instanceof Error ? error.message : 'unknown');
        checks.googleApiProbe = 'WARN';
        messages.push(
          'Could not obtain a Google access token. Check domain-wide delegation; creating a session may fail.'
        );
      }
    } else {
      messages.push('Google API probe skipped because configuration is missing.');
    }

    return respond();
  } catch (error) {
    return handleApiError('LIVE_SESSIONS_PREFLIGHT', error);
  }
}
