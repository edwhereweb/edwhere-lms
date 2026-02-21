import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { isTeacher } from '@/lib/teacher';
import getSafeProfile from '@/actions/get-safe-profile';

interface Params {
  params: { courseId: string };
}

// GET /api/courses/[courseId]/chat-students
// Returns distinct students who have sent messages in this course, with unread count
export async function GET(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const authorized = await isTeacher();
    if (!authorized) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const profile = await getSafeProfile();
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    // Find all distinct threadStudentIds for this course
    const threads = await db.courseMessage.findMany({
      where: { courseId: params.courseId },
      distinct: ['threadStudentId'],
      select: { threadStudentId: true }
    });

    const studentIds = threads.map((t) => t.threadStudentId);
    if (studentIds.length === 0) return NextResponse.json([]);

    // Fetch profile info for those students
    const allProfiles = await db.profile.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, name: true, imageUrl: true, role: true }
    });

    // Filter out instructors who might have sent legacy shared messages
    const students = allProfiles.filter((p) => p.role === 'STUDENT');
    const validStudentIds = students.map((s) => s.id);

    // Get lastRead records for this instructor × course × students
    const lastReads = await db.mentorLastRead.findMany({
      where: {
        instructorId: profile.id,
        courseId: params.courseId,
        studentId: { in: validStudentIds, not: null }
      }
    });

    // Get latest message per student thread
    const latestMessages = await Promise.all(
      validStudentIds.map(async (sid) => {
        const msg = await db.courseMessage.findFirst({
          where: { courseId: params.courseId, threadStudentId: sid },
          orderBy: { createdAt: 'desc' },
          select: { id: true, content: true, createdAt: true, author: { select: { name: true } } }
        });
        return { studentId: sid, msg };
      })
    );

    // Count unread messages per student thread
    const unreadCounts = await Promise.all(
      validStudentIds.map(async (sid) => {
        const lastRead = lastReads.find((lr) => lr.studentId === sid);
        const count = await db.courseMessage.count({
          where: {
            courseId: params.courseId,
            threadStudentId: sid,
            NOT: { authorId: profile.id },
            ...(lastRead ? { createdAt: { gt: lastRead.lastReadAt } } : {})
          }
        });
        return { studentId: sid, count };
      })
    );

    const result = students.map((student) => ({
      id: student.id,
      name: student.name,
      imageUrl: student.imageUrl,
      lastMessage: latestMessages.find((m) => m.studentId === student.id)?.msg ?? null,
      unreadCount: unreadCounts.find((u) => u.studentId === student.id)?.count ?? 0
    }));

    // Sort: unread first, then by latest message
    result.sort((a, b) => {
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
      const aDate = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bDate = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bDate - aDate;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[CHAT_STUDENTS_GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
