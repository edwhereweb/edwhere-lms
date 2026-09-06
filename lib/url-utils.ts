/**
 * Canonical default public application base URL for production links.
 */
export const DEFAULT_PUBLIC_APP_URL = 'https://learn.edwhere.com';

/**
 * Returns a clean, normalized base URL suitable for generating public/user-facing links.
 *
 * Fallback behavior:
 * 1. Explicit `baseUrl` if provided (e.g. from function arguments).
 * 2. `process.env.NEXT_PUBLIC_APP_URL` if defined and valid.
 * 3. Default fallback (`DEFAULT_PUBLIC_APP_URL`) if no base URL is defined or if `preferPublic` / production
 *    mode is active and the candidate URL is a localhost/loopback address.
 */
export function getPublicBaseUrl(options?: { baseUrl?: string; preferPublic?: boolean }): string {
  const candidate = options?.baseUrl ?? process.env.NEXT_PUBLIC_APP_URL;

  if (!candidate || !candidate.trim()) {
    return DEFAULT_PUBLIC_APP_URL;
  }

  const normalized = candidate.trim().replace(/\/+$/, '');

  const isLocalhost =
    normalized.includes('localhost') ||
    normalized.includes('127.0.0.1') ||
    normalized.includes('0.0.0.0');

  // In production environment or when explicitly generating shareable public links,
  // do not expose localhost URLs to end users. Fall back to canonical public domain.
  if (isLocalhost && (process.env.NODE_ENV === 'production' || options?.preferPublic)) {
    return DEFAULT_PUBLIC_APP_URL;
  }

  return normalized;
}

/**
 * Constructs a normalized, absolute URL for public/user-facing links.
 * Slashes between base URL and path are automatically normalized and query params appended cleanly.
 */
export function buildPublicUrl(
  path: string,
  options?: {
    baseUrl?: string;
    queryParams?: Record<string, string | number | boolean | null | undefined>;
    preferPublic?: boolean;
  }
): string {
  const base = getPublicBaseUrl({ baseUrl: options?.baseUrl, preferPublic: options?.preferPublic });
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  const url = new URL(`${base}${cleanPath}`);

  if (options?.queryParams) {
    Object.entries(options.queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}
