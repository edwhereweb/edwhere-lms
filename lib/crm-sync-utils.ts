const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_BACKOFF_BASE_SECONDS = 60;
const DEFAULT_BATCH_SIZE = 50;
const MAX_BACKOFF_SECONDS = 6 * 60 * 60;
const MAX_ERROR_MESSAGE_LENGTH = 500;

function readPositiveInt(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getMaxAttempts(): number {
  return readPositiveInt('CRM_SYNC_MAX_ATTEMPTS', DEFAULT_MAX_ATTEMPTS);
}

export function getBackoffBaseSeconds(): number {
  return readPositiveInt('CRM_SYNC_BACKOFF_BASE_SECONDS', DEFAULT_BACKOFF_BASE_SECONDS);
}

export function getSyncBatchSize(): number {
  return readPositiveInt('CRM_SYNC_BATCH_SIZE', DEFAULT_BATCH_SIZE);
}

/** Digits only, e.g. "+91 73565-43520" → "917356543520". */
export function normalizePhone(raw: string | null | undefined): string {
  return (raw ?? '').replace(/\D/g, '');
}

/** One sync record per enrollment (Purchase is unique on userId + courseId). */
export function buildDedupeKey(userId: string, courseId: string): string {
  return `enrollment:${userId}:${courseId}`;
}

/**
 * Deterministic exponential backoff: base * 2^(attemptsMade - 1), capped at 6h.
 * attemptsMade is the number of attempts already made (>= 1).
 */
export function computeBackoffSeconds(
  attemptsMade: number,
  baseSeconds: number = getBackoffBaseSeconds()
): number {
  const exponent = Math.max(0, attemptsMade - 1);
  return Math.min(baseSeconds * 2 ** exponent, MAX_BACKOFF_SECONDS);
}

export function isRetryable(attemptsMade: number, maxAttempts: number = getMaxAttempts()): boolean {
  return attemptsMade < maxAttempts;
}

export function computeNextAttemptAt(
  attemptsMade: number,
  now: Date = new Date(),
  maxAttempts: number = getMaxAttempts(),
  baseSeconds: number = getBackoffBaseSeconds()
): Date | null {
  if (!isRetryable(attemptsMade, maxAttempts)) return null;
  return new Date(now.getTime() + computeBackoffSeconds(attemptsMade, baseSeconds) * 1000);
}

export function truncateError(message: string): string {
  return message.length > MAX_ERROR_MESSAGE_LENGTH
    ? `${message.slice(0, MAX_ERROR_MESSAGE_LENGTH)}…`
    : message;
}

/** Maps a WACRM HTTP status to a stable error code (0 = network/fetch failure). */
export function errorCodeForStatus(status: number): string {
  return status === 0 ? 'NETWORK_ERROR' : `HTTP_${status}`;
}
