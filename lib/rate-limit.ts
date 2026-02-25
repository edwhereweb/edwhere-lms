const hits = new Map<string, { count: number; resetAt: number }>();

/**
 * Simple in-memory sliding-window rate limiter.
 * Returns `true` when the caller should be blocked.
 */
export function isRateLimited(
  key: string,
  { maxRequests = 5, windowMs = 60_000 }: { maxRequests?: number; windowMs?: number } = {}
): boolean {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  entry.count += 1;
  return entry.count > maxRequests;
}
