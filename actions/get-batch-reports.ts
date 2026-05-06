import { db } from '@/lib/db';
import { logError } from '@/lib/debug';
import { SessionFeedback } from '@prisma/client';

export interface BatchReportSummary {
  id: string;
  title: string;
  instructorName: string;
  progressPercent: number;
  avgAttendancePercent: number | null;
  avgIeScore: number | null;
  status: string;
}

export async function getBatchReportsList(): Promise<BatchReportSummary[]> {
  try {
    const batches = await db.batch.findMany({
      include: {
        modules: {
          include: {
            items: {
              where: { type: 'OFFLINE_SESSION' },
              include: {
                session: {
                  include: {
                    feedback: true,
                    attendances: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const instructorIds = Array.from(new Set(batches.map((b) => b.createdBy)));
    const profiles = await db.profile.findMany({
      where: { userId: { in: instructorIds } },
      select: { userId: true, name: true }
    });
    const profileMap = new Map(profiles.map((p) => [p.userId, p.name]));

    return batches.map((batch) => {
      let totalSessions = 0;
      let completedSessions = 0;
      let totalAttendancePercent = 0;
      let attendanceCount = 0;
      let totalIeScore = 0;
      let ieScoreCount = 0;

      batch.modules.forEach((m) => {
        m.items.forEach((i) => {
          if (i.session) {
            totalSessions++;
            if (i.session.completedAt) completedSessions++;

            if (i.session.attendanceSubmittedAt && i.session.attendances.length > 0) {
              const presentOrLate = i.session.attendances.filter(
                (a) => a.status === 'PRESENT' || a.status === 'LATE'
              ).length;
              totalAttendancePercent += (presentOrLate / i.session.attendances.length) * 100;
              attendanceCount++;
            }

            if (i.session.feedback) {
              totalIeScore += i.session.feedback.ieScore;
              ieScoreCount++;
            }
          }
        });
      });

      const now = new Date();
      let status = 'Active';
      if (!batch.startDate && !batch.endDate) status = 'Draft';
      else if (batch.endDate && batch.endDate < now) status = 'Archived';

      return {
        id: batch.id,
        title: batch.title,
        instructorName: profileMap.get(batch.createdBy) || 'Unknown',
        progressPercent:
          totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0,
        avgAttendancePercent:
          attendanceCount > 0 ? Math.round(totalAttendancePercent / attendanceCount) : null,
        avgIeScore: ieScoreCount > 0 ? Number((totalIeScore / ieScoreCount).toFixed(1)) : null,
        status
      };
    });
  } catch (error) {
    logError('GET_BATCH_REPORTS_LIST', error);
    return [];
  }
}

export type SessionReportDetail = {
  id: string; // itemId
  title: string;
  sessionId: string;
  scheduledAt: Date;
  completedAt: Date | null;
  attendancePercent: number | null;
  ieScore: number | null;
  feedback: SessionFeedback | null;
  studentFeedback: unknown[]; // Avoid complex type for now, it's just the StudentSessionFeedback model
};

export interface BatchReportDetail {
  id: string;
  title: string;
  description: string | null;
  sessions: SessionReportDetail[];
}

export async function getBatchReportDetail(batchId: string): Promise<BatchReportDetail | null> {
  try {
    const batch = await db.batch.findUnique({
      where: { id: batchId },
      include: {
        modules: {
          include: {
            items: {
              where: { type: 'OFFLINE_SESSION' },
              include: {
                session: {
                  include: {
                    feedback: true,
                    attendances: true,
                    studentFeedback: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!batch) return null;

    const sessions: SessionReportDetail[] = [];

    batch.modules.forEach((m) => {
      m.items.forEach((i) => {
        if (i.session) {
          let attendancePercent = null;
          if (i.session.attendanceSubmittedAt && i.session.attendances.length > 0) {
            const presentOrLate = i.session.attendances.filter(
              (a) => a.status === 'PRESENT' || a.status === 'LATE'
            ).length;
            attendancePercent = Math.round((presentOrLate / i.session.attendances.length) * 100);
          }

          sessions.push({
            id: i.id,
            title: i.title,
            sessionId: i.session.id,
            scheduledAt: i.session.scheduledAt,
            completedAt: i.session.completedAt,
            attendancePercent,
            ieScore: i.session.feedback?.ieScore ?? null,
            feedback: i.session.feedback,
            studentFeedback: i.session.studentFeedback || []
          });
        }
      });
    });

    // Sort chronologically
    sessions.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

    return {
      id: batch.id,
      title: batch.title,
      description: batch.description,
      sessions
    };
  } catch (error) {
    logError('GET_BATCH_REPORT_DETAIL', error);
    return null;
  }
}
