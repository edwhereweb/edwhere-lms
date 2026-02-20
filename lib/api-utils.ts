import { NextResponse } from 'next/server';
import { ZodSchema, ZodError } from 'zod';

export function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

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

export function handleApiError(tag: string, error: unknown) {
  console.error(`[${tag}]`, error instanceof Error ? error.message : error);
  return apiError('Internal Server Error', 500);
}
