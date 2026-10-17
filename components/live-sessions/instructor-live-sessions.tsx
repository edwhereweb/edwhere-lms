'use client';

import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Zap } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmModal } from '@/components/modals/confirm-modal';
import {
  useCourseLiveSessions,
  useCreateLiveSession,
  useEndLiveSession
} from '@/hooks/use-live-sessions';
import { getApiErrorMessage } from '@/lib/live-sessions/client';
import {
  ARTIFACT_SYNC_LABELS,
  HOST_CONFIG_LABELS,
  STATUS_LABELS,
  artifactSyncTone,
  canEndSession,
  formatISTDateTimeShort,
  hostConfigTone,
  istLocalToIso,
  sessionStatusTone,
  validateScheduledTimes,
  type LiveSessionItem
} from '@/lib/live-sessions/ui';
import { SessionArtifacts } from './session-artifacts';
import { StatusBadge } from './status-badge';

interface InstructorLiveSessionsProps {
  courseId: string;
  meetAvailable: boolean;
}

export const InstructorLiveSessions = ({
  courseId,
  meetAvailable
}: InstructorLiveSessionsProps) => {
  const { data, error, isLoading, refetch, setData } = useCourseLiveSessions(
    courseId,
    meetAvailable
  );
  const create = useCreateLiveSession(courseId);

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

  const [title, setTitle] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
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

  const trimmedTitle = title.trim();

  const onSchedule = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!trimmedTitle) return setFormError('Title is required');
    const timeError = validateScheduledTimes(startsAt, endsAt);
    if (timeError) return setFormError(timeError);
    try {
      await create.mutate({
        title: trimmedTitle,
        mode: 'SCHEDULED',
        startsAt: istLocalToIso(startsAt),
        endsAt: istLocalToIso(endsAt)
      });
      toast.success('Live session scheduled');
      setTitle('');
      setStartsAt('');
      setEndsAt('');
    } catch (e) {
      const message = getApiErrorMessage(e);
      setFormError(message);
      toast.error(message);
    }
  };

  const onInstant = async () => {
    setFormError(null);
    if (!trimmedTitle) return setFormError('Title is required');
    try {
      await create.mutate({ title: trimmedTitle, mode: 'INSTANT' });
      toast.success('Instant session started');
      setTitle('');
    } catch (e) {
      const message = getApiErrorMessage(e);
      setFormError(message);
      toast.error(message);
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
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={create.isPending}>
            {create.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
            )}
            Schedule session
          </Button>
          <Button type="button" variant="outline" onClick={onInstant} disabled={create.isPending}>
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
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No live sessions yet.</p>
        ) : (
          <ul className="space-y-4">
            {data.map((session) => {
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
                    {session.joinUrl && (
                      <Button asChild size="sm" variant="outline">
                        <a href={session.joinUrl} target="_blank" rel="noopener noreferrer">
                          Open Meet<span className="sr-only"> for {session.title}</span>
                        </a>
                      </Button>
                    )}
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
