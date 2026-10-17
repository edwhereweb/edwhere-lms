export const ARTIFACT_SYNC_WINDOW_MS = 4 * 60 * 60 * 1000;

export interface BackoffConfig {
  initialDelayMin: number;
  maxDelayMin: number;
  maxRetries: number;
}

/** Exponential backoff: initial * 2^retryCount minutes, capped at maxDelayMin. */
export function computeBackoffMs(retryCount: number, cfg: BackoffConfig): number {
  const minutes = Math.min(cfg.initialDelayMin * 2 ** Math.max(0, retryCount), cfg.maxDelayMin);
  return minutes * 60 * 1000;
}

export function hasExhaustedRetries(
  nextRetryCount: number,
  endedAt: Date | null,
  now: Date,
  cfg: BackoffConfig
): boolean {
  if (nextRetryCount >= cfg.maxRetries) return true;
  return !!endedAt && now.getTime() - endedAt.getTime() > ARTIFACT_SYNC_WINDOW_MS;
}
