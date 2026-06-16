import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { batchInstructorSchema, removeBatchInstructorSchema } from '@/lib/validations';
import { db } from '@/lib/db';
import getSafeProfile from '@/actions/get-safe-profile';

type Params = { params: Promise<{ batchId: string }> };

/** Only the batch creator and ADMINs can manage the instructor list. */
async function resolveOwnerBatch(batchId: string, userId: string, role: string) {
  const batch = await db.batch.findUnique({ where: { id: batchId } });
  if (!batch) return null;
  if (role !== 'ADMIN' && batch.createdBy !== userId) return null;
  return batch;
}

/** GET — list batch instructors with name + email */
export async function GET(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await getSafeProfile();
    if (!profile) return apiError('Unauthorized', 401);

    const { batchId } = await params;
    const batch = await resolveOwnerBatch(batchId, userId, profile.role);
    if (!batch) return apiError('Not found or forbidden', 404);

    const rows = await db.batchInstructor.findMany({
      where: { batchId },
      orderBy: { createdAt: 'asc' }
    });

    const userIds = rows.map((r) => r.userId);
    const profiles = await db.profile.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, name: true, email: true, imageUrl: true }
    });
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    const enriched = rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      addedBy: r.addedBy,
      createdAt: r.createdAt.toISOString(),
      name: profileMap.get(r.userId)?.name ?? 'Unknown',
      email: profileMap.get(r.userId)?.email ?? '',
      imageUrl: profileMap.get(r.userId)?.imageUrl ?? null
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    return handleApiError('GET_BATCH_INSTRUCTORS', error);
  }
}

/** POST — add instructor by email */
export async function POST(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await getSafeProfile();
    if (!profile) return apiError('Unauthorized', 401);

    const { batchId } = await params;
    const batch = await resolveOwnerBatch(batchId, userId, profile.role);
    if (!batch) return apiError('Not found or forbidden', 404);

    const body = await req.json();
    const validation = validateBody(batchInstructorSchema, body);
    if (!validation.success) return validation.response;

    const { email } = validation.data;

    const target = await db.profile.findFirst({
      where: { email },
      select: { userId: true, name: true, email: true, role: true }
    });

    if (!target) return apiError(`No account found with email "${email}"`, 404);
    if (target.role !== 'TEACHER' && target.role !== 'ADMIN') {
      return apiError(
        `"${target.name}" (${email}) does not have a Teacher or Admin role and cannot be added as a batch instructor.`,
        422
      );
    }
    if (target.userId === batch.createdBy) {
      return apiError('This user is already the batch owner.', 422);
    }

    const existing = await db.batchInstructor.findUnique({
      where: { batchId_userId: { batchId, userId: target.userId } }
    });
    if (existing) {
      return apiError(`"${target.name}" is already an instructor on this batch.`, 409);
    }

    const created = await db.batchInstructor.create({
      data: { batchId, userId: target.userId, addedBy: userId }
    });

    return NextResponse.json(
      {
        id: created.id,
        userId: target.userId,
        name: target.name,
        email: target.email,
        addedBy: userId,
        createdAt: created.createdAt.toISOString(),
        imageUrl: null
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError('ADD_BATCH_INSTRUCTOR', error);
  }
}

/** DELETE — remove instructor by userId */
export async function DELETE(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await getSafeProfile();
    if (!profile) return apiError('Unauthorized', 401);

    const { batchId } = await params;
    const batch = await resolveOwnerBatch(batchId, userId, profile.role);
    if (!batch) return apiError('Not found or forbidden', 404);

    const body = await req.json();
    const validation = validateBody(removeBatchInstructorSchema, body);
    if (!validation.success) return validation.response;

    const { userId: targetUserId } = validation.data;

    const record = await db.batchInstructor.findUnique({
      where: { batchId_userId: { batchId, userId: targetUserId } }
    });
    if (!record) return apiError('Instructor not found on this batch', 404);

    await db.batchInstructor.delete({ where: { id: record.id } });

    return NextResponse.json({ removed: true });
  } catch (error) {
    return handleApiError('REMOVE_BATCH_INSTRUCTOR', error);
  }
}
