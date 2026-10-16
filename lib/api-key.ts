import crypto from 'crypto';

/**
 * Generates a cryptographically random API key with a readable prefix.
 * Returns the raw plaintext key — this must be shown to the admin exactly once.
 */
export function generateApiKey(): string {
  const random = crypto.randomBytes(32).toString('hex');
  return `ew_${random}`;
}

/**
 * Produces the SHA-256 hex digest of a raw API key.
 * This is the value stored in the database; the raw key is never persisted.
 */
export function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

/**
 * Validates an incoming x-api-key header value against a stored hash using
 * constant-time comparison to prevent timing attacks.
 */
export function validateApiKey(rawKey: string, storedHash: string): boolean {
  const incoming = Buffer.from(hashApiKey(rawKey), 'hex');
  const expected = Buffer.from(storedHash, 'hex');
  if (incoming.length !== expected.length) return false;
  return crypto.timingSafeEqual(incoming, expected);
}
