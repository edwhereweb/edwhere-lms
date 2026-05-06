import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { createOfflineSessionSchema, updateOfflineSessionSchema } from '@/lib/validations';
import { canManageBatch } from '@/lib/batch-auth';
import { db } from '@/lib/db';

type Params = { params: Promise<{ batchId: string; moduleId: string; itemId: string }> };

async function resolveItem(itemId: string, moduleId: string) {
  return db.batchItem.findFirst({
    where: { id: itemId, moduleId },
    include: { module: { select: { batchId: true } } }
  });
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const allowed = await canManageBatch(userId);
    if (!allowed) return apiError('Forbidden', 403);

    const { itemId } = await params;
    const session = await db.offlineSession.findUnique({
      where: { itemId },
      include: {
        coInstructors: true,
        uploads: { include: { logs: { orderBy: { uploadedAt: 'desc' } } } },
        mcq: { include: { questions: { orderBy: { position: 'asc' } } } },
        feedback: true
      }
    });

    if (!session) return apiError('Session not found', 404);
    return NextResponse.json(session);
  } catch (error) {
    return handleApiError('GET_OFFLINE_SESSION', error);
  }
}

export async function POST(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const allowed = await canManageBatch(userId);
    if (!allowed) return apiError('Forbidden', 403);

    const { batchId, moduleId, itemId } = await params;
    const item = await resolveItem(itemId, moduleId);
    if (!item) return apiError('Item not found', 404);
    if (item.type !== 'OFFLINE_SESSION') return apiError('Item is not an Offline Session', 400);

    // Prevent duplicate sessions
    const existing = await db.offlineSession.findUnique({ where: { itemId } });
    if (existing) return apiError('Session already configured', 409);

    const body = await req.json();
    const validation = validateBody(createOfflineSessionSchema, body);
    if (!validation.success) return validation.response;

    const { title, scheduledAt, durationMinutes, location, meetLink } = validation.data;

    // Same-day check: load the batch and its allowSameDayOfflineSession flag
    const scheduledDate = new Date(scheduledAt);
    const todayUtc = new Date();
    todayUtc.setUTCHours(0, 0, 0, 0);
    const schedDay = new Date(scheduledDate);
    schedDay.setUTCHours(0, 0, 0, 0);

    if (schedDay.getTime() === todayUtc.getTime()) {
      const batch = await db.batch.findUnique({
        where: { id: batchId },
        select: { allowSameDayOfflineSession: true }
      });
      if (!batch?.allowSameDayOfflineSession) {
        return apiError('Same-day session scheduling is not enabled for this batch', 400);
      }
    }

    // Update the item title and create the session
    const [, session] = await Promise.all([
      db.batchItem.update({ where: { id: itemId }, data: { title } }),
      db.offlineSession.create({
        data: {
          itemId,
          scheduledAt: scheduledDate,
          durationMinutes: durationMinutes ?? 60,
          location: location ?? null,
          meetLink: meetLink ?? null,
          instructorId: userId
        }
      })
    ]);

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    return handleApiError('CREATE_OFFLINE_SESSION', error);
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const allowed = await canManageBatch(userId);
    if (!allowed) return apiError('Forbidden', 403);

    const { itemId } = await params;
    const session = await db.offlineSession.findUnique({ where: { itemId } });
    if (!session) return apiError('Session not found', 404);

    const body = await req.json();
    const validation = validateBody(updateOfflineSessionSchema, body);
    if (!validation.success) return validation.response;

    const { title, scheduledAt, durationMinutes, location, meetLink } = validation.data;

    const [updated] = await Promise.all([
      db.offlineSession.update({
        where: { itemId },
        data: {
          ...(scheduledAt && { scheduledAt: new Date(scheduledAt) }),
          ...(durationMinutes !== undefined && { durationMinutes }),
          ...(location !== undefined && { location }),
          ...(meetLink !== undefined && { meetLink })
        }
      }),
      title ? db.batchItem.update({ where: { id: itemId }, data: { title } }) : Promise.resolve()
    ]);

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError('UPDATE_OFFLINE_SESSION', error);
  }
}
