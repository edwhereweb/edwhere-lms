import axios from 'axios';
import type { CreateLiveSessionPayload, LiveSessionItem, SessionArtifactsResponse } from './ui';

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
