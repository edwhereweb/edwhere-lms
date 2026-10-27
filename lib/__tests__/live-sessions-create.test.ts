const mockAuth = jest.fn();
const mockCanEdit = jest.fn();
const mockCreateSpace = jest.fn();
const mockAddCohost = jest.fn();
const mockGetClient = jest.fn();

jest.mock('@clerk/nextjs/server', () => ({ auth: () => mockAuth() }));
jest.mock('@/lib/db', () => ({
  db: {
    course: { findUnique: jest.fn() },
    profile: { findUnique: jest.fn(), findMany: jest.fn() },
    purchase: { findMany: jest.fn() },
    chapter: { findFirst: jest.fn() },
    liveSession: { create: jest.fn() }
  }
}));
jest.mock('@/lib/course-auth', () => ({ canEditCourse: (...a: unknown[]) => mockCanEdit(...a) }));
jest.mock('@/lib/integrations/google/meet', () => ({
  createInstantSpace: (...a: unknown[]) => mockCreateSpace(...a),
  addCohost: (...a: unknown[]) => mockAddCohost(...a),
  addSpaceMembers: jest.fn()
}));
jest.mock('@/lib/integrations/google/calendar', () => ({
  createCalendarEventForMeet: jest.fn().mockResolvedValue('evt'),
  deleteCalendarEvent: jest.fn().mockResolvedValue(undefined)
}));
jest.mock('@/lib/integrations/google/auth', () => {
  const { isGoogleMeetEnabled } = jest.requireActual('@/lib/integrations/google/feature-flag');
  class GoogleConfigError extends Error {}
  class GoogleApiError extends Error {
    constructor(
      message: string,
      public readonly status?: number
    ) {
      super(message);
    }
  }
  return {
    GoogleConfigError,
    GoogleApiError,
    GOOGLE_SCOPES: { meetCreate: 'scope' },
    isGoogleMeetEnabled,
    getDelegatedAuthClient: (...a: unknown[]) => mockGetClient(...a)
  };
});

import { db } from '@/lib/db';
import { GoogleApiError, GoogleConfigError } from '@/lib/integrations/google/auth';
import { mapLiveSessionCreateError } from '@/lib/live-sessions/error-map';
import { LiveSessionError } from '@/lib/live-sessions/errors';
import { POST } from '@/app/api/live-sessions/route';
import { GET as preflight } from '@/app/api/live-sessions/preflight/[courseId]/route';

type MockDb = Record<string, Record<string, jest.Mock>>;
const mockDb = db as unknown as MockDb;

const courseId = 'a'.repeat(24);
const validBody = { courseId, title: 'Class', mode: 'INSTANT' };
const req = (body: unknown) =>
  new Request('http://localhost/api/live-sessions', { method: 'POST', body: JSON.stringify(body) });

function setupHappyDb() {
  mockAuth.mockResolvedValue({ userId: 'u1' });
  mockCanEdit.mockResolvedValue(true);
  mockDb.course.findUnique.mockResolvedValue({
    userId: 'u1',
    googleMeetEnabled: true,
    instructors: []
  });
  mockDb.profile.findUnique.mockResolvedValue({ email: 'teacher@x.com' });
  mockDb.purchase.findMany.mockResolvedValue([]);
  mockCreateSpace.mockResolvedValue({ spaceName: 'spaces/1', joinUrl: 'https://meet/x' });
  mockAddCohost.mockResolvedValue(undefined);
  mockDb.liveSession.create.mockImplementation(async ({ data }) => ({ id: 's1', ...data }));
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  process.env.GOOGLE_MEET_ENABLED = 'true';
  delete process.env.GOOGLE_MEET_STRICT_COHOST;
});

describe('mapLiveSessionCreateError', () => {
  it('maps known errors', () => {
    expect(
      mapLiveSessionCreateError(new GoogleConfigError('Google service account is not configured'))
        .code
    ).toBe('LIVE_CONFIG_MISSING');
    expect(mapLiveSessionCreateError(new GoogleApiError('no', 403)).code).toBe(
      'GOOGLE_PERMISSION_DENIED'
    );
    expect(mapLiveSessionCreateError(new GoogleApiError('no', 401)).code).toBe(
      'GOOGLE_PERMISSION_DENIED'
    );
    expect(
      mapLiveSessionCreateError(new LiveSessionError('Google Meet is not enabled', 403))
    ).toMatchObject({ code: 'MEET_DISABLED', status: 403 });
    expect(
      mapLiveSessionCreateError(new LiveSessionError('Instructor has no email on file', 400))
    ).toMatchObject({ code: 'INSTRUCTOR_EMAIL_MISSING', status: 400 });
    expect(mapLiveSessionCreateError(new Error('boom'))).toMatchObject({
      code: 'LIVE_CREATE_FAILED',
      status: 500
    });
  });
});

describe('POST /api/live-sessions', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null });
    expect((await POST(req(validBody))).status).toBe(401);
  });

  it('returns the session on success', async () => {
    setupHappyDb();
    const res = await POST(req(validBody));
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ id: 's1', hostConfigStatus: 'READY' });
  });

  it('returns error/code/requestId on failure', async () => {
    setupHappyDb();
    mockDb.profile.findUnique.mockResolvedValue({ email: null });
    const res = await POST(req(validBody));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body).toEqual({
      error: expect.any(String),
      code: 'INSTRUCTOR_EMAIL_MISSING',
      requestId: expect.stringMatching(/^[0-9a-f-]{36}$/)
    });
  });

  it('maps Google permission errors', async () => {
    setupHappyDb();
    mockCreateSpace.mockRejectedValue(new GoogleApiError('forbidden', 403));
    const res = await POST(req(validBody));
    expect((await res.json()).code).toBe('GOOGLE_PERMISSION_DENIED');
  });

  it('strict cohost (default) fails the create', async () => {
    setupHappyDb();
    mockAddCohost.mockRejectedValue(new GoogleApiError('forbidden', 403));
    const res = await POST(req(validBody));
    expect(res.status).toBe(502);
    expect(mockDb.liveSession.create).not.toHaveBeenCalled();
  });

  it('non-strict cohost persists with FAILED host config', async () => {
    setupHappyDb();
    process.env.GOOGLE_MEET_STRICT_COHOST = 'false';
    mockAddCohost.mockRejectedValue(new GoogleApiError('forbidden', 403));
    const res = await POST(req(validBody));
    expect(res.status).toBe(201);
    expect(mockDb.liveSession.create.mock.calls[0][0].data.hostConfigStatus).toBe('FAILED');
  });
});

describe('GET /api/live-sessions/preflight/[courseId]', () => {
  const call = () => preflight(new Request('http://localhost'), { params: { courseId } });
  const env = process.env;

  beforeEach(() => {
    setupHappyDb();
    env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL = 'sa@x.iam';
    env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = 'k';
    env.GOOGLE_DELEGATED_SUBJECT = 'admin@x.com';
    mockGetClient.mockReturnValue({ getAccessToken: jest.fn().mockResolvedValue({ token: 't' }) });
  });

  it('401 without auth', async () => {
    mockAuth.mockResolvedValue({ userId: null });
    expect((await call()).status).toBe(401);
  });

  it('passes on happy path', async () => {
    const body = await (await call()).json();
    expect(body.ok).toBe(true);
    expect(Object.values(body.checks)).toEqual(Array(8).fill('PASS'));
  });

  it('403 when the user cannot edit the course', async () => {
    mockCanEdit.mockResolvedValue(false);
    const res = await call();
    expect(res.status).toBe(403);
    expect((await res.json()).checks.courseAccess).toBe('FAIL');
  });

  it('404 when the course is missing', async () => {
    mockDb.course.findUnique.mockResolvedValue(null);
    const res = await call();
    expect(res.status).toBe(404);
    expect((await res.json()).checks.courseExists).toBe('FAIL');
  });

  it('fails on disabled flags, missing email and missing config', async () => {
    env.GOOGLE_MEET_ENABLED = 'false';
    mockDb.course.findUnique.mockResolvedValue({
      userId: 'u1',
      googleMeetEnabled: false,
      instructors: []
    });
    mockDb.profile.findUnique.mockResolvedValue({ email: null });
    delete env.GOOGLE_DELEGATED_SUBJECT;
    const body = await (await call()).json();
    expect(body.ok).toBe(false);
    expect(body.checks).toMatchObject({
      globalMeetEnabled: 'FAIL',
      courseMeetEnabled: 'FAIL',
      instructorEmail: 'FAIL',
      googleConfig: 'FAIL',
      googleApiProbe: 'FAIL'
    });
  });

  it('marks a failed probe as WARN without failing overall', async () => {
    mockGetClient.mockReturnValue({ getAccessToken: jest.fn().mockRejectedValue(new Error('x')) });
    const body = await (await call()).json();
    expect(body.ok).toBe(true);
    expect(body.checks.googleApiProbe).toBe('WARN');
  });
});
