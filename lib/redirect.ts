import { debug } from '@/lib/debug';

const SAFE_FALLBACK_PATH = '/dashboard';

function hasControlChars(value: string) {
  return /[\u0000-\u001F\u007F]/.test(value);
}

export function validateInternalNextPath(rawNext: string | null | undefined): string | null {
  if (!rawNext) return null;

  const candidate = rawNext.trim();
  if (!candidate || hasControlChars(candidate) || candidate.length > 2048) {
    debug('BLOCKED_NEXT_REDIRECT', { rawNext, reason: 'empty_or_invalid_chars' });
    return null;
  }

  if (!candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\')) {
    debug('BLOCKED_NEXT_REDIRECT', { rawNext, reason: 'non_internal_path' });
    return null;
  }

  try {
    const parsed = new URL(candidate, 'https://learn.edwhere.com');
    if (parsed.origin !== 'https://learn.edwhere.com') {
      debug('BLOCKED_NEXT_REDIRECT', { rawNext, reason: 'cross_origin' });
      return null;
    }

    if (parsed.pathname.startsWith('/api/') || parsed.pathname.startsWith('/api')) {
      debug('BLOCKED_NEXT_REDIRECT', { rawNext, reason: 'api_path' });
      return null;
    }

    if (parsed.pathname.startsWith('/sign-in') || parsed.pathname.startsWith('/sign-up')) {
      debug('BLOCKED_NEXT_REDIRECT', { rawNext, reason: 'auth_loop' });
      return null;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    debug('BLOCKED_NEXT_REDIRECT', { rawNext, reason: 'parse_error' });
    return null;
  }
}

export function getSafeNextOrFallback(
  rawNext: string | null | undefined,
  fallback = SAFE_FALLBACK_PATH
) {
  return validateInternalNextPath(rawNext) ?? fallback;
}
