'use client';

import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Trash2, Video, Zap } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmModal } from '@/components/modals/confirm-modal';
import {
  useCourseLiveSessions,
  useCreateLiveSession,
  useDeleteLiveSession,
  useEndLiveSession,
  useLiveSessionPreflight
} from '@/hooks/use-live-sessions';
import {
  formatApiErrorDetails,
  getApiErrorDetails,
  getApiErrorMessage
} from '@/lib/live-sessions/client';
import {
  ARTIFACT_SYNC_LABELS,
  HOST_CONFIG_LABELS,
  STATUS_LABELS,
  artifactSyncTone,
  canEndSession,
  filterSessionsForChapter,
  formatISTDateTimeShort,
  hostConfigTone,
  istLocalToIso,
  sessionStatusTone,
  validateScheduledTimes,
  type BadgeTone,
  type LiveSessionItem,
  type PreflightChecks,
  type PreflightStatus
} from '@/lib/live-sessions/ui';
import { SessionArtifacts } from './session-artifacts';
import { StatusBadge } from './status-badge';

const PREFLIGHT_LABELS: Record<keyof PreflightChecks, string> = {
  auth: 'Signed in',
  courseAccess: 'Course access',
  courseExists: 'Course exists',
  globalMeetEnabled: 'Platform Meet enabled',
  courseMeetEnabled: 'Course Meet enabled',
  instructorEmail: 'Instructor email',
  googleConfig: 'Google configuration',
  googleApiProbe: 'Google API probe'
};

const PREFLIGHT_TONES: Record<PreflightStatus, BadgeTone> = {
  PASS: 'success',
  WARN: 'warning',
  FAIL: 'danger'
};

interface InstructorLiveSessionsProps {
  courseId: string;
  chapterId?: string;
  meetAvailable: boolean;
}

export const InstructorLiveSessions = ({
  courseId,
  chapterId,
  meetAvailable
}: InstructorLiveSessionsProps) => {
  const { data, error, isLoading, refetch, setData } = useCourseLiveSessions(
    courseId,
    meetAvailable
  );
  const create = useCreateLiveSession(courseId);
  const preflight = useLiveSessionPreflight(courseId);

  const applyOptimistic = useCallback(
    (sessionId: string) => {
      let previous: LiveSessionItem[] | undefined;
      setData((current) => {
        previous = current;
        return current?.map((s) => (s.id === sessionId ? { ...s, status: 'ENDED' as const } : s));
      });
      return () => {
        setData(() => previous);
        void refetch();
      };
    },
    [setData, refetch]
  );
  const end = useEndLiveSession(courseId, applyOptimistic);

  const applyOptimisticDelete = useCallback(
    (sessionId: string) => {
      let previous: LiveSessionItem[] | undefined;
      setData((current) => {
        previous = current;
        return current?.filter((s) => s.id !== sessionId);
      });
      return () => {
        setData(() => previous);
        void refetch();
      };
    },
    [setData, refetch]
  );
  const deleteSession = useDeleteLiveSession(courseId, applyOptimisticDelete);

  const [title, setTitle] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [autoRecord, setAutoRecord] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [openArtifacts, setOpenArtifacts] = useState<string | null>(null);

  if (!meetAvailable) {
    return (
      <div className="rounded-md border p-4 text-sm text-muted-foreground" role="status">
        Google Meet live sessions are not available for this course. Enable them in the course
        details settings (this also requires the feature to be turned on for the platform).
      </div>
    );
  }

  const preflightBlocked = preflight.result ? !preflight.result.ok : false;
  const blockedReason = preflightBlocked
    ? 'Diagnostics found problems. Resolve them and run diagnostics again.'
    : null;
  const trimmedTitle = title.trim();
  const sessions = filterSessionsForChapter(data ?? [], chapterId);

  const onSchedule = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (blockedReason) return setFormError(blockedReason);
    if (!trimmedTitle) return setFormError('Title is required');
    const timeError = validateScheduledTimes(startsAt, endsAt);
    if (timeError) return setFormError(timeError);
    try {
      await create.mutate({
        chapterId,
        title: trimmedTitle,
        mode: 'SCHEDULED',
        startsAt: istLocalToIso(startsAt),
        endsAt: istLocalToIso(endsAt),
        enableAutoRecording: autoRecord
      });
      toast.success('Live session scheduled');
      setTitle('');
      setStartsAt('');
      setEndsAt('');
    } catch (e) {
      const details = getApiErrorDetails(e);
      setFormError(formatApiErrorDetails(details));
      toast.error(details.message);
    }
  };

  const onInstant = async () => {
    setFormError(null);
    if (blockedReason) return setFormError(blockedReason);
    if (!trimmedTitle) return setFormError('Title is required');
    try {
      const created = await create.mutate({
        chapterId,
        title: trimmedTitle,
        mode: 'INSTANT',
        enableAutoRecording: autoRecord
      });
      toast.success('Instant session started');
      setTitle('');
      if (created?.joinUrl) {
        window.open(created.joinUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (e) {
      const details = getApiErrorDetails(e);
      setFormError(formatApiErrorDetails(details));
      toast.error(details.message);
    }
  };

  const onEnd = async (session: LiveSessionItem) => {
    try {
      await end.mutate(session.id);
      toast.success('Session ended');
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Failed to end session'));
    }
  };

  const onDelete = async (session: LiveSessionItem) => {
    try {
      await deleteSession.mutate(session.id);
      toast.success('Live session deleted');
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Failed to delete live session'));
    }
  };

  return (
    <div className="space-y-8">
      <form
        onSubmit={onSchedule}
        className="rounded-md border bg-slate-100 dark:bg-gray-800 p-4 space-y-4"
        aria-labelledby="new-session-heading"
        noValidate
      >
        <h2 id="new-session-heading" className="font-medium">
          New live session
        </h2>
        <div className="space-y-2">
          <Label htmlFor="live-session-title">Title</Label>
          <Input
            id="live-session-title"
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Week 3 doubt-clearing session"
            disabled={create.isPending}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="live-session-start">Starts (IST)</Label>
            <Input
              id="live-session-start"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              disabled={create.isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="live-session-end">Ends (IST)</Label>
            <Input
              id="live-session-end"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              disabled={create.isPending}
            />
          </div>
        </div>
        {formError && (
          <p role="alert" className="text-sm text-red-600">
            {formError}
          </p>
        )}
        <div className="flex items-center gap-2">
          <Checkbox
            id="live-session-auto-record"
            checked={autoRecord}
            onCheckedChange={(checked) => setAutoRecord(checked === true)}
            disabled={create.isPending}
          />
          <Label htmlFor="live-session-auto-record" className="cursor-pointer font-normal">
            Enable auto-recording
          </Label>
        </div>
        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void preflight.run()}
            disabled={preflight.isPending}
          >
            {preflight.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
            )}
            Run diagnostics
          </Button>
          {preflight.error && (
            <p role="alert" className="text-sm text-red-600">
              {preflight.error}
            </p>
          )}
          {preflight.result && (
            <div className="space-y-2" role="status">
              <ul className="flex flex-wrap gap-2">
                {(Object.keys(PREFLIGHT_LABELS) as (keyof PreflightChecks)[]).map((key) => (
                  <li key={key} className="flex items-center gap-1 text-xs">
                    {PREFLIGHT_LABELS[key]}:
                    <StatusBadge
                      label={preflight.result!.checks[key]}
                      tone={PREFLIGHT_TONES[preflight.result!.checks[key]]}
                    />
                  </li>
                ))}
              </ul>
              {preflight.result.messages.length > 0 && (
                <ul className="list-disc pl-5 text-sm text-muted-foreground">
                  {preflight.result.messages.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {blockedReason && <p className="text-sm text-red-600">{blockedReason}</p>}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={create.isPending || preflightBlocked}>
            {create.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
            )}
            Schedule session
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onInstant}
            disabled={create.isPending || preflightBlocked}
          >
            <Zap className="h-4 w-4 mr-2" aria-hidden="true" />
            Start instant session
          </Button>
        </div>
      </form>

      <section aria-labelledby="sessions-heading" className="space-y-4">
        <h2 id="sessions-heading" className="font-medium">
          Sessions
        </h2>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading sessions…
          </div>
        ) : error || !data ? (
          <div role="alert" className="text-sm space-y-2">
            <p className="text-red-600">{error ?? 'Failed to load sessions'}</p>
            <Button size="sm" variant="outline" onClick={() => void refetch()}>
              Try again
            </Button>
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No live sessions yet.</p>
        ) : (
          <ul className="space-y-4">
            {sessions.map((session) => {
              const showArtifacts = openArtifacts === session.id;
              return (
                <li key={session.id} className="rounded-md border p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="font-medium">{session.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        <time dateTime={session.startsAt}>
                          {formatISTDateTimeShort(session.startsAt)}
                        </time>
                        {' – '}
                        <time dateTime={session.endsAt}>
                          {formatISTDateTimeShort(session.endsAt)}
                        </time>
                        {session.mode === 'INSTANT' ? ' · Instant' : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge
                        label={STATUS_LABELS[session.status]}
                        tone={sessionStatusTone(session.status)}
                      />
                      <StatusBadge
                        label={HOST_CONFIG_LABELS[session.hostConfigStatus]}
                        tone={hostConfigTone(session.hostConfigStatus)}
                      />
                      <StatusBadge
                        label={ARTIFACT_SYNC_LABELS[session.artifactSyncStatus]}
                        tone={artifactSyncTone(session.artifactSyncStatus)}
                      />
                    </div>
                  </div>
                  {session.cohostAssignedAt && (
                    <p className="text-xs text-muted-foreground">
                      Cohost assigned {formatISTDateTimeShort(session.cohostAssignedAt)}
                    </p>
                  )}
                  {session.artifactLastError && (
                    <p className="text-xs text-red-600 break-words">
                      Last artifact error: {session.artifactLastError}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    {session.joinUrl &&
                    session.status !== 'ENDED' &&
                    session.status !== 'CANCELLED' ? (
                      <Button
                        asChild
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
                      >
                        <a href={session.joinUrl} target="_blank" rel="noopener noreferrer">
                          <Video className="h-4 w-4 mr-1.5" aria-hidden="true" />
                          Join as Instructor<span className="sr-only"> for {session.title}</span>
                        </a>
                      </Button>
                    ) : session.joinUrl ? (
                      <Button asChild size="sm" variant="outline">
                        <a href={session.joinUrl} target="_blank" rel="noopener noreferrer">
                          <Video className="h-4 w-4 mr-1.5" aria-hidden="true" />
                          Meet link<span className="sr-only"> for {session.title}</span>
                        </a>
                      </Button>
                    ) : null}
                    {canEndSession(session) && (
                      <ConfirmModal
                        title="End this live session?"
                        description="This closes the Meet space for everyone. This action cannot be undone."
                        confirmText="End session"
                        onConfirm={() => void onEnd(session)}
                      >
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={end.pendingId === session.id}
                        >
                          {end.pendingId === session.id && (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                          )}
                          End session<span className="sr-only"> {session.title}</span>
                        </Button>
                      </ConfirmModal>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-expanded={showArtifacts}
                      onClick={() => setOpenArtifacts(showArtifacts ? null : session.id)}
                    >
                      {showArtifacts ? 'Hide' : 'View'} artifacts
                    </Button>
                    <ConfirmModal
                      title="Delete this live session?"
                      description="This will permanently delete the live session and remove the scheduled Google Calendar event. This action cannot be undone."
                      confirmText="Delete session"
                      onConfirm={() => void onDelete(session)}
                    >
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                        disabled={deleteSession.pendingId === session.id}
                      >
                        {deleteSession.pendingId === session.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-1" aria-hidden="true" />
                        )}
                        Delete<span className="sr-only"> {session.title}</span>
                      </Button>
                    </ConfirmModal>
                  </div>
                  {showArtifacts && <SessionArtifacts sessionId={session.id} isInstructor />}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};
