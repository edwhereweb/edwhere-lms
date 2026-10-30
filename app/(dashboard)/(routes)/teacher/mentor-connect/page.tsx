import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import getSafeProfile from '@/actions/get-safe-profile';
import { MentorConnectHub } from './_components/mentor-connect-hub';

export const dynamic = 'force-dynamic';

export default async function MentorConnectPage() {
  const { userId } = await auth();
  if (!userId) return redirect('/sign-in');

  // One profile read covers both the role check and the page's own use.
  const profile = await getSafeProfile();
  if (!profile || (profile.role !== 'ADMIN' && profile.role !== 'TEACHER')) return redirect('/');

  // Get all courses this instructor owns or is assigned to
  const courses = await db.course.findMany({
    where:
      profile.role === 'ADMIN'
        ? {}
        : {
            OR: [{ userId }, { instructors: { some: { profileId: profile.id } } }]
          },
    select: { id: true, title: true, imageUrl: true },
    orderBy: { updatedAt: 'desc' }
  });
  const courseIds = courses.map((c) => c.id);

  // A nested `messages: { take: 1 }` makes Prisma load every message of every course and trim
  // in memory, so find each course's latest timestamp in the database and fetch just those.
  const [lastReads, latestPerCourse] = await Promise.all([
    // Get lastRead records — filter out legacy null-studentId records from old schema
    db.mentorLastRead.findMany({
      where: {
        instructorId: profile.id,
        courseId: { in: courseIds },
        studentId: { not: null }
      }
    }),
    db.courseMessage.groupBy({
      by: ['courseId'],
      where: { courseId: { in: courseIds } },
      _max: { createdAt: true }
    })
  ]);
  const latestFilters = latestPerCourse.flatMap((g) =>
    g._max.createdAt ? [{ courseId: g.courseId, createdAt: g._max.createdAt }] : []
  );
  const latestMessages = latestFilters.length
    ? await db.courseMessage.findMany({
        where: { OR: latestFilters },
        select: {
          id: true,
          courseId: true,
          content: true,
          createdAt: true,
          author: { select: { name: true, role: true } }
        }
      })
    : [];
  const lastMessageByCourse = new Map<string, (typeof latestMessages)[number]>();
  for (const m of latestMessages) {
    if (!lastMessageByCourse.has(m.courseId)) lastMessageByCourse.set(m.courseId, m);
  }

  // Count unread messages per course (messages from non-instructors after lastReadAt)
  // in one grouped query instead of one count per course.
  const unreadFilters = courses.map((course) => {
    const lastRead = lastReads.find((lr) => lr.courseId === course.id);
    return {
      courseId: course.id,
      ...(lastRead ? { createdAt: { gt: lastRead.lastReadAt } } : {})
    };
  });
  const unreadGroups = unreadFilters.length
    ? await db.courseMessage.groupBy({
        by: ['courseId'],
        where: { OR: unreadFilters, NOT: { authorId: profile.id } },
        _count: { _all: true }
      })
    : [];
  const unreadByCourse = new Map(unreadGroups.map((g) => [g.courseId, g._count._all]));

  const courseData = courses.map((course) => ({
    id: course.id,
    title: course.title,
    imageUrl: course.imageUrl,
    lastMessage: lastMessageByCourse.get(course.id) ?? null,
    unreadCount: unreadByCourse.get(course.id) ?? 0
  }));

  // Sort: courses with unread messages first
  courseData.sort((a, b) => {
    if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
    if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
    // Then by latest message date
    const aDate = a.lastMessage?.createdAt ?? new Date(0);
    const bDate = b.lastMessage?.createdAt ?? new Date(0);
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Mentor Connect</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Student doubts from all your courses. Unread chats are at the top.
        </p>
      </div>
      <MentorConnectHub courses={courseData} instructorProfileId={profile.id} />
    </div>
  );
}
