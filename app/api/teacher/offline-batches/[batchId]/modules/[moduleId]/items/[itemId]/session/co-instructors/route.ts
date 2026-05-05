import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { addCoInstructorSchema } from '@/lib/validations';
import { canManageBatch } from '@/lib/batch-auth';
import { db } from '@/lib/db';

type Params = { params: Promise<{ itemId: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const allowed = await canManageBatch(userId);
    if (!allowed) return apiError('Forbidden', 403);

    const { itemId } = await params;
    const coInstructors = await db.sessionCoInstructor.findMany({
      where: { session: { itemId } },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json(coInstructors);
  } catch (error) {
    return handleApiError('GET_CO_INSTRUCTORS', error);
  }
}

export async function POST(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const allowed = await canManageBatch(userId);
    if (!allowed) return apiError('Forbidden', 403);

    const { itemId } = await params;
    const session = await db.offlineSession.findUnique({ where: { itemId } });
    if (!session) return apiError('Session not found', 404);

    const body = await req.json();
    const validation = validateBody(addCoInstructorSchema, body);
    if (!validation.success) return validation.response;

    // Verify the target user is a teacher/admin
    const targetProfile = await db.profile.findUnique({
      where: { userId: validation.data.userId },
      select: { role: true, name: true }
    });
    if (!targetProfile || (targetProfile.role !== 'TEACHER' && targetProfile.role !== 'ADMIN')) {
      return apiError('Target user must be a Teacher or Admin', 400);
    }

    const coInstructor = await db.sessionCoInstructor.upsert({
      where: { sessionId_userId: { sessionId: session.id, userId: validation.data.userId } },
      create: { sessionId: session.id, userId: validation.data.userId },
      update: {}
    });

    return NextResponse.json(coInstructor, { status: 201 });
  } catch (error) {
    return handleApiError('ADD_CO_INSTRUCTOR', error);
  }
}

export async function DELETE(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const allowed = await canManageBatch(userId);
    if (!allowed) return apiError('Forbidden', 403);

    const { itemId } = await params;
    const session = await db.offlineSession.findUnique({ where: { itemId } });
    if (!session) return apiError('Session not found', 404);

    const body = await req.json();
    const validation = validateBody(addCoInstructorSchema, body);
    if (!validation.success) return validation.response;

    await db.sessionCoInstructor.deleteMany({
      where: { sessionId: session.id, userId: validation.data.userId }
    });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    return handleApiError('REMOVE_CO_INSTRUCTOR', error);
  }
}
