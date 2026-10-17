'use client';

import { useState } from 'react';
import { ExternalLink, FileText, Loader2, Play, Video } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useSessionArtifacts } from '@/hooks/use-live-sessions';
import {
  ARTIFACT_SYNC_LABELS,
  ARTIFACT_TYPE_LABELS,
  artifactSyncTone,
  formatDuration,
  formatISTDateTimeShort,
  getArtifactsEmptyMessage,
  shouldShowArtifacts
} from '@/lib/live-sessions/ui';
import { StatusBadge } from './status-badge';

interface SessionArtifactsProps {
  sessionId: string;
  isInstructor: boolean;
}

const isHttpUrl = (url: string | null): url is string => !!url && /^https?:\/\//i.test(url);

export const SessionArtifacts = ({ sessionId, isInstructor }: SessionArtifactsProps) => {
  const { data, error, isLoading, refetch } = useSessionArtifacts(sessionId);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div
        className="flex items-center gap-2 text-sm text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Loading artifacts…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div role="alert" className="flex items-center gap-3 text-sm text-red-600">
        <span>{error ?? 'Failed to load artifacts'}</span>
        <Button size="sm" variant="outline" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {isInstructor && (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <div className="flex gap-2">
            <dt>Sync status:</dt>
            <dd>
              <StatusBadge
                label={ARTIFACT_SYNC_LABELS[data.artifactSyncStatus]}
                tone={artifactSyncTone(data.artifactSyncStatus)}
              />
            </dd>
          </div>
          <div className="flex gap-2">
            <dt>Last checked:</dt>
            <dd>{formatISTDateTimeShort(data.artifactsCheckedAt)}</dd>
          </div>
          <div className="flex gap-2">
            <dt>Retry count:</dt>
            <dd>{data.artifactRetryCount ?? 0}</dd>
          </div>
          <div className="flex gap-2">
            <dt>Next retry:</dt>
            <dd>{formatISTDateTimeShort(data.artifactNextRetryAt)}</dd>
          </div>
        </dl>
      )}

      {shouldShowArtifacts(data, isInstructor) ? (
        <ul className="space-y-2">
          {data.artifacts.map((artifact) => {
            const Icon = artifact.type === 'RECORDING' ? Video : FileText;
            const duration = formatDuration(artifact.durationSec);
            const label = artifact.title || ARTIFACT_TYPE_LABELS[artifact.type];
            return (
              <li key={artifact.id} className="rounded-md border p-3 text-sm space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{label}</p>
                      <p className="text-xs text-muted-foreground">
                        {ARTIFACT_TYPE_LABELS[artifact.type]}
                        {duration ? ` · ${duration}` : ''}
                        {isInstructor && artifact.availableAt
                          ? ` · available ${formatISTDateTimeShort(artifact.availableAt)}`
                          : ''}
                      </p>
                      {isInstructor && artifact.mimeType && (
                        <p className="text-xs text-muted-foreground">{artifact.mimeType}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {artifact.type === 'RECORDING' && isHttpUrl(artifact.url) && (
                      <Button
                        size="sm"
                        variant={activeVideo === artifact.id ? 'secondary' : 'default'}
                        onClick={() =>
                          setActiveVideo(activeVideo === artifact.id ? null : artifact.id)
                        }
                      >
                        <Play className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                        {activeVideo === artifact.id ? 'Hide video' : 'Watch recording'}
                      </Button>
                    )}
                    {isHttpUrl(artifact.url) ? (
                      <Button asChild size="sm" variant="outline">
                        <a href={artifact.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                          Open<span className="sr-only"> {label}</span>
                        </a>
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Link unavailable</span>
                    )}
                  </div>
                </div>
                {activeVideo === artifact.id && (
                  <div className="w-full mt-3 overflow-hidden rounded-md border bg-black shadow-sm">
                    <div className="relative aspect-video w-full">
                      <iframe
                        src={
                          artifact.driveFileId
                            ? `https://drive.google.com/file/d/${artifact.driveFileId}/preview`
                            : artifact.url?.replace(/\/view(\?.*)?$/, '/preview')
                        }
                        title={label}
                        className="h-full w-full border-0"
                        allow="autoplay; fullscreen"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          {getArtifactsEmptyMessage(data, isInstructor)}
        </p>
      )}
    </div>
  );
};
