'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createLiveSessionRequest,
  endLiveSessionRequest,
  fetchCourseLiveSessions,
  fetchSessionArtifacts,
  getApiErrorMessage
} from '@/lib/live-sessions/client';
import {
  liveSessionKeys,
  type CreateLiveSessionPayload,
  type LiveSessionItem,
  type SessionArtifactsResponse
} from '@/lib/live-sessions/ui';

type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();

const keyOf = (key: readonly string[]) => key.join('|');

function subscribe(key: readonly string[], listener: Listener) {
  const k = keyOf(key);
  if (!listeners.has(k)) listeners.set(k, new Set());
  listeners.get(k)!.add(listener);
  return () => {
    listeners.get(k)?.delete(listener);
  };
}

/** Refetches every mounted hook whose key starts with the given prefix. */
export function invalidateLiveSessions(prefix: readonly string[] = liveSessionKeys.all) {
  const p = keyOf(prefix);
  listeners.forEach((set, k) => {
    if (k === p || k.startsWith(`${p}|`)) set.forEach((fn) => fn());
  });
}

interface QueryState<T> {
  data: T | undefined;
  error: string | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
  setData: (updater: (current: T | undefined) => T | undefined) => void;
}

function useLiveQuery<T>(
  key: readonly string[],
  fetcher: () => Promise<T>,
  enabled: boolean
): QueryState<T> {
  const [data, setDataState] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const cacheKey = keyOf(key);

  const refetch = useCallback(async () => {
    try {
      const result = await fetcherRef.current();
      setDataState(result);
      setError(null);
    } catch (e) {
      setError(getApiErrorMessage(e, 'Failed to load'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    setIsLoading(true);
    void refetch();
    return subscribe(cacheKey.split('|'), () => void refetch());
  }, [cacheKey, enabled, refetch]);

  const setData = useCallback(
    (updater: (current: T | undefined) => T | undefined) => setDataState(updater),
    []
  );

  return { data, error, isLoading, refetch, setData };
}

export function useCourseLiveSessions(courseId: string, enabled = true) {
  return useLiveQuery<LiveSessionItem[]>(
    liveSessionKeys.list(courseId),
    () => fetchCourseLiveSessions(courseId),
    enabled
  );
}

export function useSessionArtifacts(sessionId: string, enabled = true) {
  return useLiveQuery<SessionArtifactsResponse>(
    liveSessionKeys.artifacts(sessionId),
    () => fetchSessionArtifacts(sessionId),
    enabled
  );
}

export function useCreateLiveSession(courseId: string) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (payload: Omit<CreateLiveSessionPayload, 'courseId'>) => {
      setIsPending(true);
      setError(null);
      try {
        const created = await createLiveSessionRequest({ ...payload, courseId });
        invalidateLiveSessions(liveSessionKeys.list(courseId));
        return created;
      } catch (e) {
        setError(getApiErrorMessage(e));
        throw e;
      } finally {
        setIsPending(false);
      }
    },
    [courseId]
  );

  return { mutate, isPending, error };
}

export function useEndLiveSession(
  courseId: string,
  applyOptimistic?: (sessionId: string) => () => void
) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  const mutate = useCallback(
    async (sessionId: string) => {
      setPendingId(sessionId);
      const rollback = applyOptimistic?.(sessionId);
      try {
        const ended = await endLiveSessionRequest(sessionId);
        invalidateLiveSessions(liveSessionKeys.list(courseId));
        invalidateLiveSessions(liveSessionKeys.artifacts(sessionId));
        return ended;
      } catch (e) {
        rollback?.();
        throw e;
      } finally {
        setPendingId(null);
      }
    },
    [courseId, applyOptimistic]
  );

  return { mutate, pendingId };
}
