import { auth } from '@clerk/nextjs/server';
import {
  mobileError,
  validateMobileBody,
  handleMobileApiError,
  mobileSuccess
} from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';
import { hasBatchAccess } from '@/lib/batch-auth';
import { markAttendanceSchema } from '@/lib/validations';

type Params = { params: Promise<{ batchId: string; moduleId: string; itemId: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { batchId, itemId } = await params;

    const hasAccess = await hasBatchAccess(batchId, userId);
    if (!hasAccess) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const session = await db.offlineSession.findUnique({ where: { itemId } });
    if (!session) return mobileError('NOT_FOUND', 'Session not found', 404);

    const attendances = await db.sessionAttendance.findMany({
      where: { sessionId: session.id },
      orderBy: { markedAt: 'asc' }
    });

    const userIds = attendances.map((a) => a.userId);
    const profiles = await db.profile.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, name: true, email: true }
    });
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    const enriched = attendances.map((a) => ({
      ...a,
      name: profileMap.get(a.userId)?.name || 'Unknown',
      email: profileMap.get(a.userId)?.email || 'No Email'
    }));

    return mobileSuccess(enriched);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_ATTENDANCE_GET', error);
  }
}

export async function POST(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const { batchId, itemId } = await params;

    const hasAccess = await hasBatchAccess(batchId, userId);
    if (!hasAccess) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const session = await db.offlineSession.findUnique({ where: { itemId } });
    if (!session) return mobileError('NOT_FOUND', 'Session not found', 404);

    const body = await req.json();
    const result = validateMobileBody(markAttendanceSchema, body);
    if (!result.success) return result.response;

    // Get all enrolled students to mark absent those not in the list
    const enrollments = await db.batchEnrollment.findMany({
      where: { batchId },
      select: { userId: true }
    });

    const markedSet = new Set(result.data.markedStudents.map((s) => s.userId));

    // Upsert PRESENT/LATE students
    for (const student of result.data.markedStudents) {
      await db.sessionAttendance.upsert({
        where: {
          sessionId_userId: {
            sessionId: session.id,
            userId: student.userId
          }
        },
        create: {
          sessionId: session.id,
          userId: student.userId,
          status: student.status,
          remarks: student.remarks
        },
        update: {
          status: student.status,
          remarks: student.remarks
        }
      });

      // Update attendance streak for PRESENT/LATE students
      await db.batchEnrollment.update({
        where: { batchId_userId: { batchId, userId: student.userId } },
        data: { attendanceStreak: { increment: 1 } }
      });
    }

    // Mark absent students (enrolled but not in markedStudents)
    for (const enrollment of enrollments) {
      if (!markedSet.has(enrollment.userId)) {
        await db.sessionAttendance.upsert({
          where: {
            sessionId_userId: {
              sessionId: session.id,
              userId: enrollment.userId
            }
          },
          create: {
            sessionId: session.id,
            userId: enrollment.userId,
            status: 'ABSENT'
          },
          update: {
            status: 'ABSENT'
          }
        });

        // Reset attendance streak for absent students
        await db.batchEnrollment.update({
          where: { batchId_userId: { batchId, userId: enrollment.userId } },
          data: { attendanceStreak: 0 }
        });
      }
    }

    // Mark attendance as submitted on session
    await db.offlineSession.update({
      where: { id: session.id },
      data: { attendanceSubmittedAt: new Date() }
    });

    return mobileSuccess({ success: true });
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_ATTENDANCE_SUBMIT', error);
  }
}
