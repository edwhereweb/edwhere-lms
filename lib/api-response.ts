import { NextResponse } from 'next/server';
import { ZodSchema, ZodError } from 'zod';
import { logError } from '@/lib/debug';
import type { ErrorCode, PageMeta } from '@/types/api';

export function apiOk<T>(data: T, meta?: PageMeta, status = 200) {
  const body: { data: T; meta?: PageMeta } = { data };
  if (meta) body.meta = meta;
  return NextResponse.json(body, { status });
}

export function apiErr(code: ErrorCode, message: string, status: number, details?: unknown) {
  return NextResponse.json(
    { error: { code, message, ...(details !== undefined && { details }) } },
    { status }
  );
}

export function validateRequest<T>(
  schema: ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; response: NextResponse } {
  try {
    const parsed = schema.parse(data);
    return { success: true, data: parsed };
  } catch (err) {
    if (err instanceof ZodError) {
      const issues = err.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
      return {
        success: false,
        response: apiErr('VALIDATION', 'Validation failed', 400, issues)
      };
    }
    return {
      success: false,
      response: apiErr('VALIDATION', 'Invalid request body', 400)
    };
  }
}

export function handleRouteError(tag: string, error: unknown) {
  logError(tag, error);
  return apiErr('INTERNAL', 'Internal Server Error', 500);
}
