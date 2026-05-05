import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { batchEnrollSchema } from '@/lib/validations';
import { canEnrollInBatch } from '@/lib/batch-auth';
import { enrollStudentInBatch, unenrollStudentFromBatch } from '@/lib/batch-enrollment';

export async function POST(req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const allowed = await canEnrollInBatch(userId);
    if (!allowed)
      return apiError('Forbidden — only admins and instructors can enroll students', 403);

    const { batchId } = await params;
    const body = await req.json();
    const validation = validateBody(batchEnrollSchema, body);
    if (!validation.success) return validation.response;

    const result = await enrollStudentInBatch(batchId, validation.data.userId, userId);

    if (!result.enrolled) {
      return apiError(result.reason, 400);
    }

    return NextResponse.json({ enrolled: true }, { status: 201 });
  } catch (error) {
    return handleApiError('ENROLL_BATCH_STUDENT', error);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const allowed = await canEnrollInBatch(userId);
    if (!allowed) return apiError('Forbidden', 403);

    const { batchId } = await params;
    const body = await req.json();
    const validation = validateBody(batchEnrollSchema, body);
    if (!validation.success) return validation.response;

    const removed = await unenrollStudentFromBatch(batchId, validation.data.userId);
    return NextResponse.json({ removed });
  } catch (error) {
    return handleApiError('UNENROLL_BATCH_STUDENT', error);
  }
}
