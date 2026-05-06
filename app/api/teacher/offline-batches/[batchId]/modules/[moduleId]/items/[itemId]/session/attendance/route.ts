import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { markAttendanceSchema, updateLateAttendanceSchema } from '@/lib/validations';
import { canManageBatch } from '@/lib/batch-auth';
import { getAttendanceWindow, isPastAutoSubmitTime } from '@/lib/attendance';
import { db } from '@/lib/db';

type Params = { params: Promise<{ batchId: string; itemId: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const allowed = await canManageBatch(userId);
    if (!allowed) return apiError('Forbidden', 403);

    const { batchId, itemId } = await params;

    const session = await db.offlineSession.findUnique({
      where: { itemId },
      include: { attendances: true }
    });
    if (!session) return apiError('Session not found', 404);

    const enrollments = await db.batchEnrollment.findMany({
      where: { batchId },
      select: { userId: true }
    });
    const enrolledIds = enrollments.map((e) => e.userId);

    // Fetch user profiles for display
    const profiles = await db.profile.findMany({
      where: { userId: { in: enrolledIds } },
      select: { userId: true, name: true, email: true, imageUrl: true }
    });

    const now = new Date();

    // Lazy Evaluation: If it's past 15 mins and attendance hasn't been submitted, we auto-submit everyone as ABSENT
    if (!session.attendanceSubmittedAt && isPastAutoSubmitTime(session.scheduledAt, now)) {
      const existingAttIds = new Set(session.attendances.map((a) => a.userId));
      const missingIds = enrolledIds.filter((id) => !existingAttIds.has(id));

      if (missingIds.length > 0) {
        await db.sessionAttendance.createMany({
          data: missingIds.map((id) => ({
            sessionId: session.id,
            userId: id,
            status: 'ABSENT'
          }))
        });
      }

      await db.offlineSession.update({
        where: { id: session.id },
        data: { attendanceSubmittedAt: now }
      });

      // Gamification: Reset streaks for absentees
      await db.batchEnrollment.updateMany({
        where: {
          batchId,
          userId: { in: missingIds }
        },
        data: { attendanceStreak: 0 }
      });

      // Refetch after lazy eval
      const updatedAttendances = await db.sessionAttendance.findMany({
        where: { sessionId: session.id }
      });
      return NextResponse.json({
        submittedAt: now,
        attendances: updatedAttendances,
        profiles
      });
    }

    return NextResponse.json({
      submittedAt: session.attendanceSubmittedAt,
      attendances: session.attendances,
      profiles
    });
  } catch (error) {
    return handleApiError('GET_ATTENDANCE', error);
  }
}

export async function POST(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const allowed = await canManageBatch(userId);
    if (!allowed) return apiError('Forbidden', 403);

    const { batchId, itemId } = await params;
    const session = await db.offlineSession.findUnique({ where: { itemId } });
    if (!session) return apiError('Session not found', 404);

    if (session.attendanceSubmittedAt) {
      return apiError('Attendance has already been submitted for this session', 400);
    }

    const now = new Date();
    const window = getAttendanceWindow(session.scheduledAt, now);

    const body = await req.json();
    const validation = validateBody(markAttendanceSchema, body);
    if (!validation.success) return validation.response;

    const { markedStudents, isAutoSubmit } = validation.data;

    // Reject manual submission if locked out (or early)
    if (window === 'EARLY') return apiError('Session has not started yet', 400);
    if (window === 'LOCKED' && !isAutoSubmit) {
      return apiError('Attendance window is strictly locked out (passed 18 minutes)', 403);
    }

    // Get all enrolled students
    const enrollments = await db.batchEnrollment.findMany({
      where: { batchId },
      select: { userId: true }
    });
    const enrolledIds = enrollments.map((e) => e.userId);
    const markedMap = new Map(markedStudents.map((s) => [s.userId, s]));

    const attendanceData = enrolledIds.map((uid) => {
      const marked = markedMap.get(uid);
      if (marked) {
        // Enforce LATE constraint (if window 2, instructor might be forced to enter remarks by UI, but we accept LATE with remarks)
        // If they try to submit PRESENT in window 2, we should probably allow it if they queued them in Window 1 and hit submit in Window 2.
        return {
          sessionId: session.id,
          userId: uid,
          status: marked.status,
          remarks: marked.remarks
        };
      }
      // Remaining students are marked ABSENT
      return {
        sessionId: session.id,
        userId: uid,
        status: 'ABSENT' as const
      };
    });

    // Get current streaks to handle null/missing fields safely in MongoDB
    const currentEnrollments = await db.batchEnrollment.findMany({
      where: { batchId, userId: { in: enrolledIds } },
      select: { userId: true, attendanceStreak: true }
    });
    const streakMap = new Map(currentEnrollments.map((e) => [e.userId, e.attendanceStreak ?? 0]));

    await db.$transaction([
      db.sessionAttendance.deleteMany({ where: { sessionId: session.id } }),
      db.sessionAttendance.createMany({ data: attendanceData }),
      db.offlineSession.update({
        where: { id: session.id },
        data: { attendanceSubmittedAt: now }
      }),
      // Gamification: Update Streaks
      ...attendanceData.map((a) =>
        db.batchEnrollment.update({
          where: {
            batchId_userId: {
              batchId,
              userId: a.userId
            }
          },
          data: {
            attendanceStreak: a.status === 'ABSENT' ? 0 : (streakMap.get(a.userId) ?? 0) + 1
          }
        })
      )
    ]);

    return NextResponse.json({ success: true, submittedAt: now });
  } catch (error) {
    return handleApiError('SUBMIT_ATTENDANCE', error);
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const allowed = await canManageBatch(userId);
    if (!allowed) return apiError('Forbidden', 403);

    const { batchId, itemId } = await params;
    const session = await db.offlineSession.findUnique({ where: { itemId } });
    if (!session) return apiError('Session not found', 404);

    const now = new Date();
    const window = getAttendanceWindow(session.scheduledAt, now);

    if (window === 'LOCKED') {
      return apiError(
        'Attendance is strictly locked out. Cannot update remarks after 18 minutes.',
        403
      );
    }

    const body = await req.json();
    const validation = validateBody(updateLateAttendanceSchema, body);
    if (!validation.success) return validation.response;

    const { userId: studentId, remarks } = validation.data;

    const existing = await db.sessionAttendance.findUnique({
      where: { sessionId_userId: { sessionId: session.id, userId: studentId } }
    });

    if (!existing) return apiError('Attendance record not found', 404);
    if (existing.status !== 'ABSENT')
      return apiError('Can only update ABSENT students to LATE', 400);

    const updated = await db.sessionAttendance.update({
      where: { id: existing.id },
      data: { status: 'LATE', remarks }
    });

    // Gamification: Increment streak robustly
    const enrollment = await db.batchEnrollment.findUnique({
      where: { batchId_userId: { batchId, userId: studentId } },
      select: { attendanceStreak: true }
    });

    await db.batchEnrollment.update({
      where: {
        batchId_userId: {
          batchId,
          userId: studentId
        }
      },
      data: {
        attendanceStreak: (enrollment?.attendanceStreak ?? 0) + 1
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError('UPDATE_LATE_ATTENDANCE', error);
  }
}
