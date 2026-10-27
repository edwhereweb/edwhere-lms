'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createLiveSessionRequest,
  deleteLiveSessionRequest,
  endLiveSessionRequest,
  fetchCourseLiveSessions,
  fetchLiveSessionPreflight,
  fetchSessionArtifacts,
  getApiErrorMessage
} from '@/lib/live-sessions/client';
import {
  liveSessionKeys,
  type CreateLiveSessionPayload,
  type LiveSessionItem,
  type PreflightResponse,
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

  const requestId = useRef(0);

  const refetch = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const result = await fetcherRef.current();
      if (id !== requestId.current) return;
      setDataState(result);
      setError(null);
    } catch (e) {
      if (id !== requestId.current) return;
      setError(getApiErrorMessage(e, 'Failed to load'));
    } finally {
      if (id === requestId.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    setDataState(undefined);
    setError(null);
    setIsLoading(true);
    void refetch();
    const unsubscribe = subscribe(cacheKey.split('|'), () => void refetch());
    return () => {
      requestId.current++;
      unsubscribe();
    };
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

export function useDeleteLiveSession(
  courseId: string,
  applyOptimistic?: (sessionId: string) => () => void
) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  const mutate = useCallback(
    async (sessionId: string) => {
      setPendingId(sessionId);
      const rollback = applyOptimistic?.(sessionId);
      try {
        const deleted = await deleteLiveSessionRequest(sessionId);
        invalidateLiveSessions(liveSessionKeys.list(courseId));
        invalidateLiveSessions(liveSessionKeys.artifacts(sessionId));
        return deleted;
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

export function useLiveSessionPreflight(courseId: string) {
  const [result, setResult] = useState<PreflightResponse | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setIsPending(true);
    setError(null);
    try {
      setResult(await fetchLiveSessionPreflight(courseId));
    } catch (e) {
      setResult(null);
      setError(getApiErrorMessage(e, 'Failed to run diagnostics'));
    } finally {
      setIsPending(false);
    }
  }, [courseId]);

  return { result, isPending, error, run };
}
