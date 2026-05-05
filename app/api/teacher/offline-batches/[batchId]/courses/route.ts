import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { batchCourseSchema } from '@/lib/validations';
import { canManageBatch } from '@/lib/batch-auth';
import { db } from '@/lib/db';

export async function POST(req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const allowed = await canManageBatch(userId);
    if (!allowed) return apiError('Forbidden', 403);

    const { batchId } = await params;
    const batch = await db.batch.findUnique({ where: { id: batchId } });
    if (!batch) return apiError('Batch not found', 404);

    const body = await req.json();
    const validation = validateBody(batchCourseSchema, body);
    if (!validation.success) return validation.response;

    const { courseId } = validation.data;

    const course = await db.course.findUnique({ where: { id: courseId } });
    if (!course) return apiError('Course not found', 404);

    const batchCourse = await db.batchCourse.upsert({
      where: { batchId_courseId: { batchId, courseId } },
      create: { batchId, courseId },
      update: {}
    });

    return NextResponse.json(batchCourse, { status: 201 });
  } catch (error) {
    return handleApiError('ADD_BATCH_COURSE', error);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const allowed = await canManageBatch(userId);
    if (!allowed) return apiError('Forbidden', 403);

    const { batchId } = await params;
    const body = await req.json();
    const validation = validateBody(batchCourseSchema, body);
    if (!validation.success) return validation.response;

    const { courseId } = validation.data;

    await db.batchCourse.deleteMany({ where: { batchId, courseId } });
    return NextResponse.json({ removed: true });
  } catch (error) {
    return handleApiError('REMOVE_BATCH_COURSE', error);
  }
}
