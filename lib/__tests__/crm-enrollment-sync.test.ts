import type { CrmEnrollmentSync } from '@prisma/client';

const mockDb = {
  crmEnrollmentSync: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    upsert: jest.fn()
  },
  profile: { findUnique: jest.fn() },
  course: { findUnique: jest.fn() },
  purchase: { findMany: jest.fn() }
};
const mockSend = jest.fn();
let mockConfigured = true;

jest.mock('@/lib/db', () => ({
  get db() {
    return mockDb;
  }
}));
jest.mock('@clerk/nextjs/server', () => ({ clerkClient: jest.fn() }));
jest.mock('@/lib/wacrm', () => ({
  sendEnrollmentWhatsApp: (...args: unknown[]) => mockSend(...args),
  isEnrollmentCrmConfigured: () => mockConfigured
}));

import {
  backfillMissingSyncRecords,
  enqueueEnrollmentSync,
  processSyncJob
} from '../crm-enrollment-sync';
import {
  buildDedupeKey,
  computeBackoffSeconds,
  computeNextAttemptAt,
  errorCodeForStatus,
  isRetryable,
  normalizePhone
} from '../crm-sync-utils';

function makeJob(overrides: Partial<CrmEnrollmentSync> = {}): CrmEnrollmentSync {
  return {
    id: 'sync1',
    dedupeKey: buildDedupeKey('user_1', 'course_1'),
    userId: 'user_1',
    courseId: 'course_1',
    purchaseId: null,
    batchId: null,
    phoneRaw: null,
    phoneNormalized: null,
    syncStatus: 'PENDING',
    attempts: 0,
    nextAttemptAt: null,
    lockedUntil: null,
    lastAttemptAt: null,
    lastSuccessAt: null,
    lastErrorCode: null,
    lastErrorMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  } as CrmEnrollmentSync;
}

beforeEach(() => {
  jest.resetAllMocks();
  mockConfigured = true;
  delete process.env.CRM_SYNC_MAX_ATTEMPTS;
  delete process.env.CRM_SYNC_BACKOFF_BASE_SECONDS;
  jest.spyOn(console, 'info').mockImplementation(() => {});
  mockDb.crmEnrollmentSync.updateMany.mockResolvedValue({ count: 1 });
  mockDb.profile.findUnique.mockResolvedValue({ name: 'Asha', phoneNumber: '+91 73565-43520' });
  mockDb.course.findUnique.mockResolvedValue({ title: 'Course', whatsappGroupUrl: null });
});

describe('crm-sync-utils', () => {
  it('normalizes phones to digits only', () => {
    expect(normalizePhone('+91 73565-43520')).toBe('917356543520');
    expect(normalizePhone(null)).toBe('');
  });

  it('backs off exponentially and caps the delay', () => {
    expect(computeBackoffSeconds(1, 60)).toBe(60);
    expect(computeBackoffSeconds(2, 60)).toBe(120);
    expect(computeBackoffSeconds(3, 60)).toBe(240);
    expect(computeBackoffSeconds(30, 60)).toBe(6 * 60 * 60);
  });

  it('stops scheduling retries at max attempts (env configurable)', () => {
    process.env.CRM_SYNC_MAX_ATTEMPTS = '3';
    const now = new Date('2026-01-01T00:00:00Z');
    expect(isRetryable(2)).toBe(true);
    expect(computeNextAttemptAt(2, now)).toEqual(new Date(now.getTime() + 120_000));
    expect(isRetryable(3)).toBe(false);
    expect(computeNextAttemptAt(3, now)).toBeNull();
  });

  it('maps status codes to error codes', () => {
    expect(errorCodeForStatus(0)).toBe('NETWORK_ERROR');
    expect(errorCodeForStatus(502)).toBe('HTTP_502');
  });
});

describe('enqueueEnrollmentSync', () => {
  it('upserts on the dedupe key so repeated enqueues do not duplicate', async () => {
    mockDb.crmEnrollmentSync.upsert.mockResolvedValue(makeJob());
    await enqueueEnrollmentSync({ userId: 'user_1', courseId: 'course_1' });
    await enqueueEnrollmentSync({ userId: 'user_1', courseId: 'course_1' });
    const calls = mockDb.crmEnrollmentSync.upsert.mock.calls;
    expect(calls[0][0].where).toEqual({ dedupeKey: 'enrollment:user_1:course_1' });
    expect(calls[0][0].update).toEqual({});
    expect(calls[1][0].where).toEqual(calls[0][0].where);
  });

  it('never throws', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockDb.crmEnrollmentSync.upsert.mockRejectedValue(new Error('db down'));
    await expect(enqueueEnrollmentSync({ userId: 'u', courseId: 'c' })).resolves.toBeNull();
  });
});

describe('processSyncJob', () => {
  it('pending → sent on success, storing normalized phone', async () => {
    mockDb.crmEnrollmentSync.findUnique.mockResolvedValue(makeJob());
    mockSend.mockResolvedValue({ ok: true, status: 201, body: '' });

    expect(await processSyncJob('sync1')).toBe('sent');

    expect(mockSend.mock.calls[0][0]).toMatchObject({
      phone: '917356543520',
      idempotencyKey: 'enrollment:user_1:course_1'
    });
    const data = mockDb.crmEnrollmentSync.update.mock.calls[0][0].data;
    expect(data).toMatchObject({
      syncStatus: 'SENT',
      attempts: 1,
      phoneNormalized: '917356543520',
      lastErrorCode: null
    });
    expect(data.lastSuccessAt).toBeInstanceOf(Date);
  });

  it('pending → failed on error, with attempts, error details and backoff', async () => {
    mockDb.crmEnrollmentSync.findUnique.mockResolvedValue(makeJob());
    mockSend.mockResolvedValue({ ok: false, status: 401, body: 'bad secret' });

    expect(await processSyncJob('sync1')).toBe('failed');

    const data = mockDb.crmEnrollmentSync.update.mock.calls[0][0].data;
    expect(data).toMatchObject({
      syncStatus: 'FAILED',
      attempts: 1,
      lastErrorCode: 'HTTP_401',
      lastErrorMessage: 'bad secret'
    });
    expect(data.nextAttemptAt).toBeInstanceOf(Date);
  });

  it('keeps failed with a clear reason once max attempts are exhausted', async () => {
    process.env.CRM_SYNC_MAX_ATTEMPTS = '2';
    mockDb.crmEnrollmentSync.findUnique.mockResolvedValue(
      makeJob({ syncStatus: 'FAILED', attempts: 1 })
    );
    mockSend.mockResolvedValue({ ok: false, status: 500, body: 'boom' });

    await processSyncJob('sync1');

    const data = mockDb.crmEnrollmentSync.update.mock.calls[0][0].data;
    expect(data.syncStatus).toBe('FAILED');
    expect(data.attempts).toBe(2);
    expect(data.nextAttemptAt).toBeNull();
    expect(data.lastErrorMessage).toContain('Max attempts (2) exceeded');
  });

  it('does not call the CRM once attempts are exhausted', async () => {
    process.env.CRM_SYNC_MAX_ATTEMPTS = '2';
    mockDb.crmEnrollmentSync.findUnique.mockResolvedValue(
      makeJob({ syncStatus: 'FAILED', attempts: 2 })
    );
    expect(await processSyncJob('sync1')).toBe('exhausted');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('respects backoff unless ignoreBackoff is set', async () => {
    mockDb.crmEnrollmentSync.findUnique.mockResolvedValue(
      makeJob({ syncStatus: 'FAILED', attempts: 1, nextAttemptAt: new Date(Date.now() + 60_000) })
    );
    expect(await processSyncJob('sync1')).toBe('not_due');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('is idempotent: reprocessing a SENT record never calls the CRM', async () => {
    mockDb.crmEnrollmentSync.findUnique.mockResolvedValue(makeJob({ syncStatus: 'SENT' }));
    expect(await processSyncJob('sync1')).toBe('already_sent');
    expect(await processSyncJob('sync1')).toBe('already_sent');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('skips when another worker holds the lease', async () => {
    mockDb.crmEnrollmentSync.findUnique.mockResolvedValue(makeJob());
    mockDb.crmEnrollmentSync.updateMany.mockResolvedValue({ count: 0 });
    expect(await processSyncJob('sync1')).toBe('locked');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('fails with NO_PHONE when the student has no phone', async () => {
    mockDb.crmEnrollmentSync.findUnique.mockResolvedValue(makeJob({ userId: 'pending_a@b.c' }));
    mockDb.profile.findUnique.mockResolvedValue({ name: 'A', phoneNumber: null });
    expect(await processSyncJob('sync1')).toBe('failed');
    expect(mockSend).not.toHaveBeenCalled();
    expect(mockDb.crmEnrollmentSync.update.mock.calls[0][0].data.lastErrorCode).toBe('NO_PHONE');
  });

  it('leaves the job untouched when CRM env is not configured', async () => {
    mockConfigured = false;
    mockDb.crmEnrollmentSync.findUnique.mockResolvedValue(makeJob());
    expect(await processSyncJob('sync1')).toBe('not_configured');
    expect(mockDb.crmEnrollmentSync.update).not.toHaveBeenCalled();
  });
});

describe('backfillMissingSyncRecords', () => {
  const purchases = [
    { id: 'p1', userId: 'u1', courseId: 'c1' },
    { id: 'p2', userId: 'u2', courseId: 'c1' }
  ];

  it('dry run counts missing records without writing', async () => {
    mockDb.purchase.findMany.mockResolvedValue(purchases);
    mockDb.crmEnrollmentSync.findMany.mockResolvedValue([{ dedupeKey: 'enrollment:u1:c1' }]);
    const result = await backfillMissingSyncRecords({ dryRun: true });
    expect(result).toMatchObject({ scanned: 2, missing: 1, created: 0 });
    expect(mockDb.crmEnrollmentSync.upsert).not.toHaveBeenCalled();
  });

  it('creates only missing records and is a no-op on a second run', async () => {
    mockDb.purchase.findMany.mockResolvedValue(purchases);
    mockDb.crmEnrollmentSync.findMany.mockResolvedValueOnce([]);
    mockDb.crmEnrollmentSync.upsert.mockResolvedValue(makeJob());
    const first = await backfillMissingSyncRecords();
    expect(first).toMatchObject({ missing: 2, created: 2 });

    mockDb.crmEnrollmentSync.upsert.mockClear();
    mockDb.crmEnrollmentSync.findMany.mockResolvedValueOnce([
      { dedupeKey: 'enrollment:u1:c1' },
      { dedupeKey: 'enrollment:u2:c1' }
    ]);
    const second = await backfillMissingSyncRecords();
    expect(second).toMatchObject({ missing: 0, created: 0 });
    expect(mockDb.crmEnrollmentSync.upsert).not.toHaveBeenCalled();
  });
});
