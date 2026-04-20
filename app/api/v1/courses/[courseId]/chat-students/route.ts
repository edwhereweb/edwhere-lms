import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { currentProfile } from '@/lib/current-profile';
import { canEditCourse } from '@/lib/course-auth';
import { apiOk, apiErr, handleRouteError } from '@/lib/api-response';

interface Params {
  params: { courseId: string };
}

// GET /api/v1/courses/[courseId]/chat-students
export async function GET(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiErr('UNAUTHORIZED', 'Unauthorized', 401);

    const allowed = await canEditCourse(userId, params.courseId);
    if (!allowed) return apiErr('FORBIDDEN', 'Forbidden', 403);

    const profile = await currentProfile();
    if (!profile) return apiErr('UNAUTHORIZED', 'Unauthorized', 401);

    const threads = await db.courseMessage.findMany({
      where: { courseId: params.courseId },
      distinct: ['threadStudentId'],
      select: { threadStudentId: true }
    });

    const studentIds = threads.map((t) => t.threadStudentId);
    if (studentIds.length === 0) return apiOk([]);

    const allProfiles = await db.profile.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, name: true, imageUrl: true, role: true }
    });

    const students = allProfiles.filter((p) => p.role === 'STUDENT');
    const validStudentIds = students.map((s) => s.id);

    if (validStudentIds.length === 0) return apiOk([]);

    // Batched: fetch lastReads, all recent messages, and all unread-candidate messages in 3 queries
    const [lastReads, recentMessages, unreadMessages] = await Promise.all([
      db.mentorLastRead.findMany({
        where: {
          instructorId: profile.id,
          courseId: params.courseId,
          studentId: { in: validStudentIds, not: null }
        }
      }),
      db.courseMessage.findMany({
        where: { courseId: params.courseId, threadStudentId: { in: validStudentIds } },
        orderBy: { createdAt: 'desc' },
        select: {
          threadStudentId: true,
          id: true,
          content: true,
          createdAt: true,
          author: { select: { name: true } }
        }
      }),
      db.courseMessage.findMany({
        where: {
          courseId: params.courseId,
          threadStudentId: { in: validStudentIds },
          NOT: { authorId: profile.id }
        },
        select: { threadStudentId: true, createdAt: true }
      })
    ]);

    // Derive latest message per student (first occurrence since ordered desc)
    const latestByStudent = new Map<string, (typeof recentMessages)[0]>();
    for (const msg of recentMessages) {
      if (!latestByStudent.has(msg.threadStudentId)) {
        latestByStudent.set(msg.threadStudentId, msg);
      }
    }

    // Derive unread count per student
    const unreadByStudent = new Map<string, number>();
    for (const msg of unreadMessages) {
      const lastRead = lastReads.find((lr) => lr.studentId === msg.threadStudentId);
      if (!lastRead || msg.createdAt > lastRead.lastReadAt) {
        unreadByStudent.set(
          msg.threadStudentId,
          (unreadByStudent.get(msg.threadStudentId) ?? 0) + 1
        );
      }
    }

    const result = students.map((student) => ({
      id: student.id,
      name: student.name,
      imageUrl: student.imageUrl,
      lastMessage: latestByStudent.get(student.id) ?? null,
      unreadCount: unreadByStudent.get(student.id) ?? 0
    }));

    result.sort((a, b) => {
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
      const aDate = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bDate = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bDate - aDate;
    });

    return apiOk(result);
  } catch (error) {
    return handleRouteError('CHAT_STUDENTS_GET', error);
  }
}
