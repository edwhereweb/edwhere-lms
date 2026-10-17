'use client';

import { useState } from 'react';
import { Loader2, Lock, Video } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useCourseLiveSessions } from '@/hooks/use-live-sessions';
import {
  STATUS_LABELS,
  formatISTDateTimeShort,
  getLearnerJoinState,
  sessionStatusTone
} from '@/lib/live-sessions/ui';
import { SessionArtifacts } from './session-artifacts';
import { StatusBadge } from './status-badge';

interface LearnerLiveSessionsProps {
  courseId: string;
  hasAccess: boolean;
}

export const LearnerLiveSessions = ({ courseId, hasAccess }: LearnerLiveSessionsProps) => {
  const { data, error, isLoading, refetch } = useCourseLiveSessions(courseId, hasAccess);
  const [openArtifacts, setOpenArtifacts] = useState<string | null>(null);

  if (!hasAccess) {
    return (
      <div className="rounded-md border p-6 text-center space-y-2" role="status">
        <Lock className="h-6 w-6 mx-auto text-muted-foreground" aria-hidden="true" />
        <p className="font-medium">Live sessions are locked</p>
        <p className="text-sm text-muted-foreground">
          Enroll in this course to see and join its live sessions.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Loading live sessions…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div role="alert" className="rounded-md border border-red-200 p-4 text-sm space-y-2">
        <p className="text-red-600">{error ?? 'Failed to load live sessions'}</p>
        <Button size="sm" variant="outline" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
        No live sessions have been scheduled for this course yet.
      </div>
    );
  }

  return (
    <ul className="space-y-4" aria-label="Live sessions">
      {data.map((session) => {
        const join = getLearnerJoinState(session);
        const showArtifacts = openArtifacts === session.id;
        return (
          <li key={session.id} className="rounded-md border p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <h3 className="font-medium flex items-center gap-2">
                  <Video className="h-4 w-4" aria-hidden="true" />
                  {session.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  <time dateTime={session.startsAt}>
                    {formatISTDateTimeShort(session.startsAt)}
                  </time>
                  {' – '}
                  <time dateTime={session.endsAt}>{formatISTDateTimeShort(session.endsAt)}</time>
                </p>
              </div>
              <StatusBadge
                label={STATUS_LABELS[session.status]}
                tone={sessionStatusTone(session.status)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {join.kind === 'join' ? (
                <Button asChild>
                  <a href={join.url} target="_blank" rel="noopener noreferrer">
                    Join live session<span className="sr-only"> {session.title}</span>
                  </a>
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">{join.message}</p>
              )}
              {session.status === 'ENDED' && (
                <Button
                  variant="outline"
                  size="sm"
                  aria-expanded={showArtifacts}
                  onClick={() => setOpenArtifacts(showArtifacts ? null : session.id)}
                >
                  {showArtifacts ? 'Hide' : 'View'} recordings &amp; transcripts
                </Button>
              )}
            </div>
            {showArtifacts && <SessionArtifacts sessionId={session.id} isInstructor={false} />}
          </li>
        );
      })}
    </ul>
  );
};
