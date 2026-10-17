import { getApiErrorMessage } from '../live-sessions/client';
import {
  canEndSession,
  getArtifactsEmptyMessage,
  getLearnerJoinState,
  istLocalToIso,
  shouldShowArtifacts,
  validateScheduledTimes,
  formatISTDateTimeShort,
  formatDuration,
  filterSessionsForChapter,
  liveSessionKeys
} from '../live-sessions/ui';

describe('learner join state', () => {
  it('shows join only when joinUrl is present', () => {
    expect(
      getLearnerJoinState({
        status: 'LIVE',
        joinUrl: 'https://meet.google.com/x',
        hostConfigStatus: 'READY'
      })
    ).toEqual({ kind: 'join', url: 'https://meet.google.com/x' });
  });

  it('explains why join is unavailable', () => {
    const msg = (status: 'SCHEDULED' | 'ENDED' | 'CANCELLED', host: 'PENDING' | 'READY') => {
      const s = getLearnerJoinState({ status, joinUrl: null, hostConfigStatus: host });
      return s.kind === 'unavailable' ? s.message : '';
    };
    expect(msg('ENDED', 'READY')).toMatch(/ended/);
    expect(msg('CANCELLED', 'READY')).toMatch(/cancelled/);
    expect(msg('SCHEDULED', 'PENDING')).toMatch(/Not ready/);
    expect(msg('SCHEDULED', 'READY')).toMatch(/unavailable/);
  });
});

describe('instructor actions', () => {
  it('allows ending only scheduled/live sessions', () => {
    expect(canEndSession({ status: 'SCHEDULED' })).toBe(true);
    expect(canEndSession({ status: 'LIVE' })).toBe(true);
    expect(canEndSession({ status: 'ENDED' })).toBe(false);
    expect(canEndSession({ status: 'CANCELLED' })).toBe(false);
  });
});

describe('artifact visibility', () => {
  const artifact = {
    id: '1',
    type: 'RECORDING' as const,
    title: null,
    mimeType: null,
    url: 'https://x',
    driveFileId: null,
    durationSec: 90,
    availableAt: null
  };

  it('hides artifacts from learners until sync is READY', () => {
    expect(
      shouldShowArtifacts({ artifactSyncStatus: 'PENDING', artifacts: [artifact] }, false)
    ).toBe(false);
    expect(shouldShowArtifacts({ artifactSyncStatus: 'READY', artifacts: [artifact] }, false)).toBe(
      true
    );
  });

  it('shows whatever exists to instructors and handles empty state', () => {
    expect(
      shouldShowArtifacts({ artifactSyncStatus: 'PENDING', artifacts: [artifact] }, true)
    ).toBe(true);
    expect(shouldShowArtifacts({ artifactSyncStatus: 'READY', artifacts: [] }, true)).toBe(false);
    expect(
      getArtifactsEmptyMessage({ artifactSyncStatus: 'READY', status: 'ENDED' }, false)
    ).toMatch(/No recordings/);
    expect(
      getArtifactsEmptyMessage({ artifactSyncStatus: 'PENDING', status: 'ENDED' }, false)
    ).toMatch(/processing/);
    expect(
      getArtifactsEmptyMessage({ artifactSyncStatus: 'FAILED_TIMEOUT', status: 'ENDED' }, true)
    ).toMatch(/timed out/);
  });
});

describe('time helpers', () => {
  it('interprets datetime-local as IST', () => {
    expect(istLocalToIso('2026-10-20T15:00')).toBe('2026-10-20T09:30:00.000Z');
    expect(istLocalToIso('')).toBeUndefined();
  });

  it('validates scheduled range', () => {
    expect(validateScheduledTimes('', '')).toBeDefined();
    expect(validateScheduledTimes('2026-10-20T15:00', '2026-10-20T14:00')).toMatch(/after/);
    expect(validateScheduledTimes('2026-10-20T15:00', '2026-10-20T16:00')).toBeUndefined();
  });

  it('formats in IST and durations', () => {
    expect(formatISTDateTimeShort('2026-10-20T09:30:00.000Z')).toMatch(/3:00 PM IST/);
    expect(formatISTDateTimeShort(null)).toBe('—');
    expect(formatDuration(3720)).toBe('1h 2m');
    expect(formatDuration(null)).toBeNull();
  });
});

describe('query keys', () => {
  it('scopes keys by course and session', () => {
    expect(liveSessionKeys.list('c1')).toEqual(['live-sessions', 'course', 'c1']);
    expect(liveSessionKeys.artifacts('s1')).toEqual(['live-sessions', 'artifacts', 's1']);
  });
});

describe('getApiErrorMessage', () => {
  it('extracts API error messages and falls back', () => {
    const axiosErr = (data: unknown) =>
      Object.assign(new Error('x'), { isAxiosError: true, response: { data } });
    expect(getApiErrorMessage(axiosErr({ error: 'Forbidden' }))).toBe('Forbidden');
    expect(getApiErrorMessage(axiosErr('Plain text'))).toBe('Plain text');
    expect(getApiErrorMessage(axiosErr({}))).toBe('Something went wrong');
    expect(getApiErrorMessage(new Error('boom'), 'Fallback')).toBe('Fallback');
  });
});

describe('filterSessionsForChapter', () => {
  const sessions = [
    { id: '1', chapterId: 'c1' },
    { id: '2', chapterId: 'c2' },
    { id: '3', chapterId: null },
    { id: '4' }
  ];

  it('returns only the sessions attached to the module item', () => {
    expect(filterSessionsForChapter(sessions, 'c1').map((s) => s.id)).toEqual(['1']);
    expect(filterSessionsForChapter(sessions, 'missing')).toEqual([]);
  });

  it('returns everything when no chapter is given', () => {
    expect(filterSessionsForChapter(sessions)).toHaveLength(4);
  });
});
