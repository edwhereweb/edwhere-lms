import { db } from '@/lib/db';
import { logError } from '@/lib/debug';
import { hasBatchAccess } from '@/lib/batch-auth';

export type BatchStatus = 'active' | 'draft' | 'archived';

export interface BatchSummary {
  id: string;
  title: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  createdBy: string;
  courseCount: number;
  studentCount: number;
  status: BatchStatus;
  createdAt: string;
}

export interface StudentBatch {
  id: string;
  title: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  status: BatchStatus;
  courses: { id: string; title: string; imageUrl: string | null }[];
}

// Derives a batch's display status from its date range.
// A batch with no dates set is considered a draft (not yet scheduled).
export function classifyBatch(startDate: Date | null, endDate: Date | null): BatchStatus {
  const now = new Date();
  if (!startDate && !endDate) return 'draft';
  if (endDate && endDate < now) return 'archived';
  return 'active';
}

/**
 * Fetches batches for the teacher/admin dashboard.
 * Admins see all batches; teachers see only their own.
 */
export async function getBatches(userId: string, role: string): Promise<BatchSummary[]> {
  try {
    const where = role === 'ADMIN' ? {} : { createdBy: userId };

    const batches = await db.batch.findMany({
      where,
      include: {
        _count: {
          select: { courses: true, enrollments: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return batches.map((b) => ({
      id: b.id,
      title: b.title,
      description: b.description,
      startDate: b.startDate ? b.startDate.toISOString() : null,
      endDate: b.endDate ? b.endDate.toISOString() : null,
      createdBy: b.createdBy,
      courseCount: b._count.courses,
      studentCount: b._count.enrollments,
      status: classifyBatch(b.startDate, b.endDate),
      createdAt: b.createdAt.toISOString()
    }));
  } catch (error) {
    logError('GET_BATCHES', error);
    return [];
  }
}

/**
 * Fetches a single batch with its courses and enrolled students.
 * Returns null if not found or if the teacher doesn't own it.
 */
export async function getBatchDetail(batchId: string, userId: string, role: string) {
  try {
    const batch = await db.batch.findUnique({
      where: { id: batchId },
      include: {
        courses: {
          include: {
            course: {
              select: { id: true, title: true, imageUrl: true, isPublished: true }
            }
          }
        },
        enrollments: true
      }
    });

    if (!batch) return null;
    const hasAccess = role === 'ADMIN' || (await hasBatchAccess(batchId, userId));
    if (!hasAccess) return null;

    // Fetch profiles for all enrolled users to get names and emails
    const enrolledUserIds = batch.enrollments.map((e) => e.userId);
    const profiles = await db.profile.findMany({
      where: { userId: { in: enrolledUserIds } },
      select: { userId: true, name: true, email: true }
    });
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    const enrichedEnrollments = batch.enrollments.map((e) => ({
      ...e,
      name: profileMap.get(e.userId)?.name || 'Anonymous Student',
      email: profileMap.get(e.userId)?.email || 'No Email'
    }));

    return {
      ...batch,
      enrollments: enrichedEnrollments,
      status: classifyBatch(batch.startDate, batch.endDate),
      startDate: batch.startDate ? batch.startDate.toISOString() : null,
      endDate: batch.endDate ? batch.endDate.toISOString() : null,
      allowSameDayOfflineSession: batch.allowSameDayOfflineSession,
      createdAt: batch.createdAt.toISOString(),
      updatedAt: batch.updatedAt.toISOString()
    };
  } catch (error) {
    logError('GET_BATCH_DETAIL', error);
    return null;
  }
}

/**
 * Fetches all batches a student is enrolled in, including the courses in each batch.
 */
export async function getStudentBatches(userId: string): Promise<StudentBatch[]> {
  try {
    const enrollments = await db.batchEnrollment.findMany({
      where: { userId },
      include: {
        batch: {
          include: {
            courses: {
              include: {
                course: { select: { id: true, title: true, imageUrl: true } }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return enrollments.map(({ batch }) => ({
      id: batch.id,
      title: batch.title,
      description: batch.description,
      startDate: batch.startDate ? batch.startDate.toISOString() : null,
      endDate: batch.endDate ? batch.endDate.toISOString() : null,
      status: classifyBatch(batch.startDate, batch.endDate),
      courses: batch.courses.map((bc) => ({
        id: bc.course.id,
        title: bc.course.title,
        imageUrl: bc.course.imageUrl
      }))
    }));
  } catch (error) {
    logError('GET_STUDENT_BATCHES', error);
    return [];
  }
}

/**
 * Returns true if the given student userId has at least one batch enrollment.
 * Used by the dashboard layout to conditionally show the sidebar item.
 */
export async function studentHasBatchEnrollment(userId: string): Promise<boolean> {
  try {
    const count = await db.batchEnrollment.count({ where: { userId } });
    return count > 0;
  } catch (error) {
    logError('STUDENT_HAS_BATCH_ENROLLMENT', error);
    return false;
  }
}

/**
 * Verifies that a student is enrolled in a specific batch.
 */
export async function isStudentEnrolledInBatch(batchId: string, userId: string): Promise<boolean> {
  try {
    const record = await db.batchEnrollment.findUnique({
      where: { batchId_userId: { batchId, userId } }
    });
    return !!record;
  } catch (error) {
    logError('IS_STUDENT_ENROLLED', error);
    return false;
  }
}

export interface BatchContentModule {
  id: string;
  title: string;
  position: number;
  items: BatchContentItem[];
}

export interface BatchContentItem {
  id: string;
  type: string;
  title: string;
  position: number;
  pdfUrl: string | null;
  resourceUrl: string | null;
  task: BatchContentTask | null;
  session: {
    id: string;
    scheduledAt: string;
    durationMinutes: number;
    location: string | null;
    meetLink: string | null;
    completedAt: string | null;
    attendanceStatus: string | null;
    uploads: {
      id: string;
      type: string;
      filename: string;
      fileUrl: string;
      status: string;
    }[];
  } | null;
}

export interface BatchContentTask {
  id: string;
  description: string;
  maxMarks: number;
  submissionType: string;
  submissions: BatchContentSubmission[];
}

export interface BatchContentSubmission {
  id: string;
  userId: string;
  driveLink: string | null;
  marks: number | null;
  gradedBy: string | null;
  gradedAt: string | null;
  createdAt: string;
}

/**
 * Fetches the full module → item → task → submission tree for a batch.
 * For instructor/admin: returns all submissions.
 * For student: returns only their own submissions.
 */
export async function getBatchContent(
  batchId: string,
  viewerUserId: string,
  role: string
): Promise<BatchContentModule[] | null> {
  try {
    const batch = await db.batch.findUnique({ where: { id: batchId } });
    if (!batch) return null;
    // Teachers can view batches they are authorized for
    if (role !== 'ADMIN' && role !== 'STUDENT') {
      const hasAccess = await hasBatchAccess(batchId, viewerUserId);
      if (!hasAccess) return null;
    }

    const modules = await db.batchModule.findMany({
      where: { batchId },
      orderBy: { position: 'asc' },
      include: {
        items: {
          orderBy: { position: 'asc' },
          include: {
            task: {
              include: {
                submissions: role === 'STUDENT' ? { where: { userId: viewerUserId } } : true
              }
            },
            session: {
              include: {
                attendances: role === 'STUDENT' ? { where: { userId: viewerUserId } } : true,
                uploads: role === 'STUDENT' ? { where: { status: 'APPROVED' } } : true
              }
            }
          }
        }
      }
    });

    return modules.map((m) => ({
      id: m.id,
      title: m.title,
      position: m.position,
      items: m.items.map((i) => ({
        id: i.id,
        type: i.type,
        title: i.title,
        position: i.position,
        pdfUrl: i.pdfUrl,
        resourceUrl: i.resourceUrl,
        task: i.task
          ? {
              id: i.task.id,
              description: i.task.description,
              maxMarks: i.task.maxMarks,
              submissionType: i.task.submissionType,
              submissions: i.task.submissions.map((s) => ({
                id: s.id,
                userId: s.userId,
                driveLink: s.driveLink,
                marks: s.marks,
                gradedBy: s.gradedBy,
                gradedAt: s.gradedAt ? s.gradedAt.toISOString() : null,
                createdAt: s.createdAt.toISOString()
              }))
            }
          : null,
        session: i.session
          ? {
              id: i.session.id,
              scheduledAt: i.session.scheduledAt.toISOString(),
              durationMinutes: i.session.durationMinutes,
              location: i.session.location,
              meetLink: i.session.meetLink,
              completedAt: i.session.completedAt ? i.session.completedAt.toISOString() : null,
              attendanceStatus:
                role === 'STUDENT' && i.session.attendances?.length > 0
                  ? i.session.attendances[0].status
                  : null,
              uploads: i.session.uploads.map(
                (u: {
                  id: string;
                  type: string;
                  filename: string;
                  fileUrl: string;
                  status: string;
                }) => ({
                  id: u.id,
                  type: u.type,
                  filename: u.filename,
                  fileUrl: u.fileUrl,
                  status: u.status
                })
              )
            }
          : null
      }))
    }));
  } catch (error) {
    logError('GET_BATCH_CONTENT', error);
    return null;
  }
}

export async function getBatchLeaderboard(batchId: string) {
  try {
    const enrollments = await db.batchEnrollment.findMany({
      where: { batchId },
      select: {
        userId: true,
        totalMcqScore: true,
        totalMcqPossible: true,
        attendanceStreak: true
      },
      orderBy: [{ totalMcqScore: 'desc' }, { attendanceStreak: 'desc' }],
      take: 10
    });

    const userIds = enrollments.map((e) => e.userId);
    const profiles = await db.profile.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, name: true, imageUrl: true }
    });

    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    return enrollments.map((e) => ({
      userId: e.userId,
      name: profileMap.get(e.userId)?.name || 'Anonymous Student',
      imageUrl: profileMap.get(e.userId)?.imageUrl,
      score: e.totalMcqScore ?? 0,
      possible: e.totalMcqPossible ?? 0,
      streak: e.attendanceStreak ?? 0
    }));
  } catch (error) {
    logError('GET_BATCH_LEADERBOARD', error);
    return [];
  }
}

export async function getStudentBatchGamification(batchId: string, userId: string) {
  try {
    const enrollment = await db.batchEnrollment.findUnique({
      where: { batchId_userId: { batchId, userId } },
      select: {
        attendanceStreak: true,
        totalMcqScore: true,
        totalMcqPossible: true
      }
    });

    if (!enrollment) return null;

    // Calculate rank
    const rank = await db.batchEnrollment.count({
      where: {
        batchId,
        totalMcqScore: { gt: enrollment.totalMcqScore }
      }
    });

    return {
      attendanceStreak: enrollment.attendanceStreak ?? 0,
      totalMcqScore: enrollment.totalMcqScore ?? 0,
      totalMcqPossible: enrollment.totalMcqPossible ?? 0,
      rank: rank + 1
    };
  } catch (error) {
    logError('GET_STUDENT_GAMIFICATION', error);
    return null;
  }
}
