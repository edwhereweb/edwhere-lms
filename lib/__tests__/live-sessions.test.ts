import { computeBackoffMs, hasExhaustedRetries } from '../live-sessions/backoff';
import { createLiveSessionSchema, reconcileLiveSessionsSchema } from '../validations';

const cfg = { initialDelayMin: 5, maxDelayMin: 60, maxRetries: 6 };

describe('live session backoff', () => {
  it('doubles the delay and caps it', () => {
    const mins = [0, 1, 2, 3, 4, 5].map((n) => computeBackoffMs(n, cfg) / 60000);
    expect(mins).toEqual([5, 10, 20, 40, 60, 60]);
  });

  it('exhausts on max retries', () => {
    expect(hasExhaustedRetries(5, null, new Date(), cfg)).toBe(false);
    expect(hasExhaustedRetries(6, null, new Date(), cfg)).toBe(true);
  });

  it('exhausts after the time window', () => {
    const endedAt = new Date('2026-01-01T00:00:00Z');
    expect(hasExhaustedRetries(1, endedAt, new Date('2026-01-01T03:00:00Z'), cfg)).toBe(false);
    expect(hasExhaustedRetries(1, endedAt, new Date('2026-01-01T04:01:00Z'), cfg)).toBe(true);
  });
});

describe('live session schemas', () => {
  const courseId = 'a'.repeat(24);

  it('requires times for scheduled sessions', () => {
    expect(createLiveSessionSchema.safeParse({ courseId, title: 'Class' }).success).toBe(false);
  });

  it('accepts a valid scheduled session and an instant one without times', () => {
    expect(
      createLiveSessionSchema.safeParse({
        courseId,
        title: 'Class',
        startsAt: '2026-01-01T10:00:00Z',
        endsAt: '2026-01-01T11:00:00Z'
      }).success
    ).toBe(true);
    expect(
      createLiveSessionSchema.safeParse({ courseId, title: 'Now', mode: 'INSTANT' }).success
    ).toBe(true);
  });

  it('rejects end before start', () => {
    expect(
      createLiveSessionSchema.safeParse({
        courseId,
        title: 'Class',
        startsAt: '2026-01-01T11:00:00Z',
        endsAt: '2026-01-01T10:00:00Z'
      }).success
    ).toBe(false);
  });

  it('validates reconcile bodies', () => {
    expect(reconcileLiveSessionsSchema.safeParse({}).success).toBe(true);
    expect(reconcileLiveSessionsSchema.safeParse({ batchSize: 0 }).success).toBe(false);
  });
});

describe('module-context live sessions', () => {
  const courseId = 'a'.repeat(24);
  const chapterId = 'b'.repeat(24);

  it('accepts an optional chapterId and rejects malformed ones', () => {
    const base = { courseId, title: 'Class', mode: 'INSTANT' };
    expect(createLiveSessionSchema.safeParse({ ...base, chapterId }).success).toBe(true);
    expect(createLiveSessionSchema.safeParse(base).success).toBe(true);
    expect(createLiveSessionSchema.safeParse({ ...base, chapterId: 'nope' }).success).toBe(false);
  });
});
