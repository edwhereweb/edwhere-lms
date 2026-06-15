import { auth } from '@clerk/nextjs/server';
import {
  mobileError,
  validateMobileBody,
  handleMobileApiError,
  mobileSuccess,
  mobileCreated
} from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';
import { hasBatchAccess } from '@/lib/batch-auth';
import { createOfflineSessionSchema } from '@/lib/validations';

type Params = { params: Promise<{ batchId: string; moduleId: string; itemId: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { batchId, itemId } = await params;

    const hasAccess = await hasBatchAccess(batchId, userId);
    if (!hasAccess) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const session = await db.offlineSession.findUnique({
      where: { itemId },
      include: {
        attendances: true,
        mcq: { include: { questions: { orderBy: { position: 'asc' } } } },
        feedback: true,
        uploads: true,
        coInstructors: true,
        studentFeedback: true
      }
    });

    if (!session) return mobileError('NOT_FOUND', 'Session not found', 404);

    // Enrich attendance with student profiles
    const attendanceUserIds = session.attendances.map((a) => a.userId);
    const profiles = await db.profile.findMany({
      where: { userId: { in: attendanceUserIds } },
      select: { userId: true, name: true, email: true }
    });
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    const enrichedAttendances = session.attendances.map((a) => ({
      ...a,
      name: profileMap.get(a.userId)?.name || 'Unknown',
      email: profileMap.get(a.userId)?.email || 'No Email'
    }));

    return mobileSuccess({
      ...session,
      attendances: enrichedAttendances
    });
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_SESSION_GET', error);
  }
}

export async function POST(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { batchId, itemId } = await params;

    const hasAccess = await hasBatchAccess(batchId, userId);
    if (!hasAccess) return mobileError('FORBIDDEN', 'Forbidden', 403);

    // Verify item exists and has no session yet
    const existing = await db.offlineSession.findUnique({ where: { itemId } });
    if (existing) return mobileError('CONFLICT', 'Session already exists for this item', 409);

    const body = await req.json();
    const result = validateMobileBody(createOfflineSessionSchema, body);
    if (!result.success) return result.response;

    const session = await db.offlineSession.create({
      data: {
        itemId,
        scheduledAt: new Date(result.data.scheduledAt),
        durationMinutes: result.data.durationMinutes ?? 60,
        location: result.data.location,
        meetLink: result.data.meetLink,
        instructorId: userId
      }
    });

    return mobileCreated(session);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_SESSION_CREATE', error);
  }
}
