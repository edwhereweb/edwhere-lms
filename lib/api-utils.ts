import { NextResponse } from 'next/server';
import { ZodSchema, ZodError } from 'zod';
import { logError } from '@/lib/debug';

/** @deprecated Use `apiErr` from `@/lib/api-response` instead. */
export function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** @deprecated Use `validateRequest` from `@/lib/api-response` instead. */
export function validateBody<T>(
  schema: ZodSchema<T>,
  data: unknown
):
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      response: NextResponse;
    } {
  try {
    const parsed = schema.parse(data);
    return { success: true, data: parsed };
  } catch (err) {
    if (err instanceof ZodError) {
      const messages = err.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
      console.error('[VALIDATION_ERROR]', messages);
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Validation failed', details: messages },
          { status: 400 }
        )
      };
    }
    return {
      success: false,
      response: apiError('Invalid request body', 400)
    };
  }
}

/** @deprecated Use `handleRouteError` from `@/lib/api-response` instead. */
export function handleApiError(tag: string, error: unknown) {
  logError(tag, error);
  return apiError('Internal Server Error', 500);
}
