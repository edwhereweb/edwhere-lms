import { formatISTDate, formatISTTime } from '@/lib/format';

export type LiveSessionStatus = 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED';
export type HostConfigStatus = 'PENDING' | 'READY' | 'FAILED';
export type ArtifactSyncStatus = 'PENDING' | 'READY' | 'FAILED_TIMEOUT';
export type LiveSessionMode = 'SCHEDULED' | 'INSTANT';
export type SessionArtifactType = 'RECORDING' | 'TRANSCRIPT' | 'NOTES';

export interface LiveSessionItem {
  id: string;
  courseId: string;
  chapterId?: string | null;
  title: string;
  mode: LiveSessionMode;
  status: LiveSessionStatus;
  startsAt: string;
  endsAt: string;
  joinUrl: string | null;
  hostConfigStatus: HostConfigStatus;
  cohostAssignedAt: string | null;
  artifactSyncStatus: ArtifactSyncStatus;
  artifactLastError?: string | null;
}

export interface SessionArtifact {
  id: string;
  type: SessionArtifactType;
  title: string | null;
  mimeType: string | null;
  url: string | null;
  driveFileId: string | null;
  durationSec: number | null;
  availableAt: string | null;
}

export interface SessionArtifactsResponse {
  id: string;
  status: LiveSessionStatus;
  artifactSyncStatus: ArtifactSyncStatus;
  artifactRetryCount?: number;
  artifactNextRetryAt?: string | null;
  artifactsCheckedAt: string | null;
  artifacts: SessionArtifact[];
}

export interface CreateLiveSessionPayload {
  courseId: string;
  chapterId?: string;
  title: string;
  mode: LiveSessionMode;
  startsAt?: string;
  endsAt?: string;
  enableAutoRecording?: boolean;
}

/** Module context shows only the sessions attached to that content item; no chapterId = all. */
export function filterSessionsForChapter<T extends { chapterId?: string | null }>(
  sessions: T[],
  chapterId?: string
): T[] {
  return chapterId ? sessions.filter((s) => s.chapterId === chapterId) : sessions;
}

export const liveSessionKeys = {
  all: ['live-sessions'] as const,
  list: (courseId: string) => ['live-sessions', 'course', courseId] as const,
  artifacts: (sessionId: string) => ['live-sessions', 'artifacts', sessionId] as const
};

export const STATUS_LABELS: Record<LiveSessionStatus, string> = {
  SCHEDULED: 'Scheduled',
  LIVE: 'Live',
  ENDED: 'Ended',
  CANCELLED: 'Cancelled'
};

export const HOST_CONFIG_LABELS: Record<HostConfigStatus, string> = {
  PENDING: 'Host setup pending',
  READY: 'Host ready',
  FAILED: 'Host setup failed'
};

export const ARTIFACT_SYNC_LABELS: Record<ArtifactSyncStatus, string> = {
  PENDING: 'Artifacts pending',
  READY: 'Artifacts ready',
  FAILED_TIMEOUT: 'Artifacts timed out'
};

export const ARTIFACT_TYPE_LABELS: Record<SessionArtifactType, string> = {
  RECORDING: 'Recording',
  TRANSCRIPT: 'Transcript',
  NOTES: 'Notes'
};

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  danger: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  info: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300'
};

export function sessionStatusTone(status: LiveSessionStatus): BadgeTone {
  if (status === 'LIVE') return 'danger';
  if (status === 'SCHEDULED') return 'info';
  return 'neutral';
}

export function hostConfigTone(status: HostConfigStatus): BadgeTone {
  if (status === 'READY') return 'success';
  return status === 'FAILED' ? 'danger' : 'warning';
}

export function artifactSyncTone(status: ArtifactSyncStatus): BadgeTone {
  if (status === 'READY') return 'success';
  return status === 'FAILED_TIMEOUT' ? 'danger' : 'warning';
}

export function canEndSession(session: Pick<LiveSessionItem, 'status'>): boolean {
  return session.status === 'SCHEDULED' || session.status === 'LIVE';
}

export type LearnerJoinState =
  | { kind: 'join'; url: string }
  | { kind: 'unavailable'; message: string };

/** Learners can only join when the backend supplied a joinUrl; everything else is explanatory copy. */
export function getLearnerJoinState(
  session: Pick<LiveSessionItem, 'status' | 'joinUrl' | 'hostConfigStatus'>
): LearnerJoinState {
  if (session.joinUrl) return { kind: 'join', url: session.joinUrl };
  if (session.status === 'ENDED') {
    return { kind: 'unavailable', message: 'This session has ended.' };
  }
  if (session.status === 'CANCELLED') {
    return { kind: 'unavailable', message: 'This session was cancelled.' };
  }
  if (session.hostConfigStatus !== 'READY') {
    return {
      kind: 'unavailable',
      message: 'Not ready yet — the host is still setting up. Check back soon.'
    };
  }
  return { kind: 'unavailable', message: 'The join link is currently unavailable.' };
}

/** Learners and instructors see artifacts as soon as recordings or transcripts exist. */
export function shouldShowArtifacts(
  data: Pick<SessionArtifactsResponse, 'artifactSyncStatus' | 'artifacts'>,
  _isInstructor?: boolean
): boolean {
  return data.artifacts.length > 0;
}

export function getArtifactsEmptyMessage(
  data: Pick<SessionArtifactsResponse, 'artifactSyncStatus' | 'status'>,
  isInstructor: boolean
): string {
  if (data.artifactSyncStatus === 'FAILED_TIMEOUT') {
    return isInstructor
      ? 'Artifact sync timed out. Check the diagnostics above.'
      : 'Recordings and transcripts are unavailable for this session.';
  }
  if (data.artifactSyncStatus === 'PENDING') {
    return data.status === 'ENDED'
      ? 'Recordings and transcripts are still processing. Check back later.'
      : 'Recordings and transcripts will appear after the session ends.';
  }
  return 'No recordings or transcripts were found for this session.';
}

export function formatISTDateTimeShort(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return `${formatISTDate(date)}, ${formatISTTime(date)} IST`;
}

/** Converts a `datetime-local` value (entered as IST wall-clock time) to an ISO string. */
export function istLocalToIso(value: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}:00+05:30`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function formatDuration(totalSec: number | null | undefined): string | null {
  if (!totalSec || totalSec <= 0) return null;
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${Math.max(m, 1)}m`;
}

export function validateScheduledTimes(
  startsAtLocal: string,
  endsAtLocal: string
): string | undefined {
  const start = istLocalToIso(startsAtLocal);
  const end = istLocalToIso(endsAtLocal);
  if (!start || !end) return 'Start and end times are required';
  if (new Date(end) <= new Date(start)) return 'End time must be after start time';
  return undefined;
}
