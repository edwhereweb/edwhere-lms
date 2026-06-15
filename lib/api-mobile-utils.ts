import { NextResponse } from 'next/server';
import type { ZodSchema } from 'zod';
import { ZodError } from 'zod';
import { logError } from '@/lib/debug';
import type { MobileErrorCode } from '@/types/mobile-api';

const API_VERSION = '1';

function versionHeaders(): HeadersInit {
  return { 'X-API-Version': API_VERSION };
}

export function mobileSuccess<T>(data: T, meta?: Record<string, unknown> | null) {
  return NextResponse.json({ data, meta: meta ?? null }, { headers: versionHeaders() });
}

export function mobileCreated<T>(data: T) {
  return NextResponse.json({ data, meta: null }, { status: 201, headers: versionHeaders() });
}

export function mobileError(
  code: MobileErrorCode,
  message: string,
  status: number,
  details?: unknown
) {
  return NextResponse.json(
    { error: { code, message, details: details ?? null } },
    { status, headers: versionHeaders() }
  );
}

export function validateMobileBody<T>(
  schema: ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; response: NextResponse } {
  try {
    const parsed = schema.parse(data);
    return { success: true, data: parsed };
  } catch (err) {
    if (err instanceof ZodError) {
      const messages = err.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
      logError('MOBILE_VALIDATION_ERROR', messages.join('; '));
      return {
        success: false,
        response: mobileError('VALIDATION', 'Validation failed', 400, messages)
      };
    }
    return {
      success: false,
      response: mobileError('VALIDATION', 'Invalid request body', 400)
    };
  }
}

export function handleMobileApiError(tag: string, error: unknown) {
  logError(tag, error);
  return mobileError('INTERNAL', 'Internal Server Error', 500);
}
