import axios from 'axios';
import type {
  CreateLiveSessionPayload,
  LiveSessionItem,
  PreflightResponse,
  SessionArtifactsResponse
} from './ui';

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === 'string' && data.trim()) return data;
    if (data && typeof data === 'object' && 'error' in data) {
      const message = (data as { error?: unknown }).error;
      if (typeof message === 'string' && message) return message;
    }
  }
  return fallback;
}

export function getApiErrorDetails(
  error: unknown,
  fallback = 'Something went wrong'
): { message: string; code?: string; requestId?: string } {
  const message = getApiErrorMessage(error, fallback);
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data && typeof data === 'object') {
      const { code, requestId } = data as { code?: unknown; requestId?: unknown };
      return {
        message,
        code: typeof code === 'string' ? code : undefined,
        requestId: typeof requestId === 'string' ? requestId : undefined
      };
    }
  }
  return { message };
}

export function formatApiErrorDetails(details: {
  message: string;
  code?: string;
  requestId?: string;
}): string {
  const parts = [details.message];
  if (details.code) parts.push(`Code: ${details.code}`);
  if (details.requestId) parts.push(`Reference ID: ${details.requestId}`);
  return parts.join(' · ');
}

export async function fetchLiveSessionPreflight(courseId: string): Promise<PreflightResponse> {
  const { data } = await axios.get<PreflightResponse>(`/api/live-sessions/preflight/${courseId}`, {
    validateStatus: (status) => status === 200 || status === 403 || status === 404
  });
  return data;
}

export async function fetchCourseLiveSessions(courseId: string): Promise<LiveSessionItem[]> {
  const { data } = await axios.get<LiveSessionItem[]>(`/api/courses/${courseId}/live-sessions`);
  return data;
}

export async function fetchSessionArtifacts(sessionId: string): Promise<SessionArtifactsResponse> {
  const { data } = await axios.get<SessionArtifactsResponse>(
    `/api/live-sessions/${sessionId}/artifacts`
  );
  return data;
}

export async function createLiveSessionRequest(payload: CreateLiveSessionPayload) {
  const { data } = await axios.post<LiveSessionItem>('/api/live-sessions', payload);
  return data;
}

export async function endLiveSessionRequest(sessionId: string) {
  const { data } = await axios.post<LiveSessionItem>(`/api/live-sessions/${sessionId}/end`, {});
  return data;
}

export async function deleteLiveSessionRequest(sessionId: string) {
  const { data } = await axios.delete<LiveSessionItem>(`/api/live-sessions/${sessionId}`);
  return data;
}
