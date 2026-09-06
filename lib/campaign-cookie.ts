/**
 * Signed, tamper-proof cookie carrying a short-lived Meta Ads campaign
 * token across the auth redirect boundary (landing page -> sign-in/sign-up
 * -> checkout). The cookie only ever stores an opaque token — the actual
 * coupon it maps to is always re-resolved and re-validated server-side
 * (see `lib/coupons.ts#resolveCampaignCoupon`), so a forged/expired cookie
 * can never grant a discount by itself.
 *
 * Uses the Web Crypto API (SubtleCrypto) rather than Node's `crypto` module
 * so this file works from both the Edge middleware runtime and Node.js
 * server components/route handlers. Deliberately avoids importing
 * `lib/env.ts` (which eagerly validates the *entire* env schema at import
 * time) so this lightweight module stays safely importable from the Edge
 * middleware bundle and from unit tests.
 */

export const CAMPAIGN_COOKIE_NAME = 'edwhere_campaign';
const CAMPAIGN_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24; // 24h — typical ad-to-purchase window
const CAMPAIGN_TOKEN_PATTERN = /^[A-Za-z0-9_-]{4,60}$/;

let cachedKeyPromise: Promise<CryptoKey> | null = null;

function getSecret(): string {
  // Reuse the Clerk secret as the HMAC key so no new required env var is
  // introduced; this value is already treated as a server-only secret.
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) {
    throw new Error('CLERK_SECRET_KEY is required to sign campaign cookies');
  }
  return secret;
}

function getKey(): Promise<CryptoKey> {
  if (!cachedKeyPromise) {
    const secretBytes = new TextEncoder().encode(getSecret());
    cachedKeyPromise = crypto.subtle.importKey(
      'raw',
      secretBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );
  }
  return cachedKeyPromise;
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function sign(payload: string): Promise<string> {
  const key = await getKey();
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return toHex(signature);
}

export function isValidCampaignToken(token: string | null | undefined): token is string {
  return typeof token === 'string' && CAMPAIGN_TOKEN_PATTERN.test(token);
}

/**
 * Builds the signed cookie value for a given campaign token + expiry.
 * Format: `<token>.<expiresAtMs>.<hmacSignature>`
 */
export async function buildCampaignCookieValue(token: string): Promise<string> {
  const expiresAt = Date.now() + CAMPAIGN_COOKIE_MAX_AGE_SECONDS * 1000;
  const payload = `${token}.${expiresAt}`;
  const signature = await sign(payload);
  return `${payload}.${signature}`;
}

export function getCampaignCookieMaxAgeSeconds(): number {
  return CAMPAIGN_COOKIE_MAX_AGE_SECONDS;
}

/**
 * Verifies a signed campaign cookie and returns the token if valid,
 * unexpired, and untampered. Returns null for any malformed/forged/expired
 * cookie — callers must treat that as "no campaign context" and fail open
 * to the normal (non-discounted) flow.
 */
export async function verifyCampaignCookieValue(
  cookieValue: string | null | undefined
): Promise<string | null> {
  if (!cookieValue) return null;

  const parts = cookieValue.split('.');
  if (parts.length !== 3) return null;

  const [token, expiresAtRaw, signature] = parts;
  if (!isValidCampaignToken(token)) return null;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;

  const expectedSignature = await sign(`${token}.${expiresAtRaw}`);
  if (!timingSafeEqualHex(expectedSignature, signature)) {
    return null;
  }

  return token;
}
