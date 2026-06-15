import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { batchEnrollSchema } from '@/lib/validations';
import { canEnrollInBatch } from '@/lib/batch-auth';
import { enrollStudentInBatch, unenrollStudentFromBatch } from '@/lib/batch-enrollment';
import { db } from '@/lib/db';

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

    let studentUserId = validation.data.userId;

    if (!studentUserId && validation.data.email) {
      const profile = await db.profile.findFirst({ where: { email: validation.data.email } });
      if (!profile) return apiError('No user found with this email', 404);
      studentUserId = profile.userId;
    }

    if (!studentUserId) return apiError('Either userId or email is required', 400);

    const result = await enrollStudentInBatch(batchId, studentUserId, userId);

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

    let studentUserId = validation.data.userId;

    if (!studentUserId && validation.data.email) {
      const profile = await db.profile.findFirst({ where: { email: validation.data.email } });
      if (!profile) return apiError('No user found with this email', 404);
      studentUserId = profile.userId;
    }

    if (!studentUserId) return apiError('Either userId or email is required', 400);

    const removed = await unenrollStudentFromBatch(batchId, studentUserId);
    return NextResponse.json({ removed });
  } catch (error) {
    return handleApiError('UNENROLL_BATCH_STUDENT', error);
  }
}
