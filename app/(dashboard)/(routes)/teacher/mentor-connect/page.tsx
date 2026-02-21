import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { isTeacher } from '@/lib/teacher';
import getSafeProfile from '@/actions/get-safe-profile';
import { MentorConnectHub } from './_components/mentor-connect-hub';

export const dynamic = 'force-dynamic';

export default async function MentorConnectPage() {
  const { userId } = await auth();
  if (!userId) return redirect('/sign-in');

  const authorized = await isTeacher();
  if (!authorized) return redirect('/');

  const profile = await getSafeProfile();
  if (!profile) return redirect('/');

  // Get all courses this instructor owns or is assigned to
  const courses = await db.course.findMany({
    where:
      profile.role === 'ADMIN'
        ? {}
        : {
            OR: [{ userId }, { instructors: { some: { profileId: profile.id } } }]
          },
    select: {
      id: true,
      title: true,
      imageUrl: true,
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          content: true,
          createdAt: true,
          author: { select: { name: true, role: true } }
        }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  // Get lastRead records — filter out legacy null-studentId records from old schema
  const lastReads = await db.mentorLastRead.findMany({
    where: {
      instructorId: profile.id,
      courseId: { in: courses.map((c) => c.id) },
      studentId: { not: null }
    }
  });

  // Count unread messages per course (messages from non-instructors after lastReadAt)
  const unreadCounts = await Promise.all(
    courses.map(async (course) => {
      const lastRead = lastReads.find((lr) => lr.courseId === course.id);
      const count = await db.courseMessage.count({
        where: {
          courseId: course.id,
          ...(lastRead ? { createdAt: { gt: lastRead.lastReadAt } } : {}),
          NOT: { authorId: profile.id }
        }
      });
      return { courseId: course.id, count };
    })
  );

  const courseData = courses.map((course) => ({
    id: course.id,
    title: course.title,
    imageUrl: course.imageUrl,
    lastMessage: course.messages[0] ?? null,
    unreadCount: unreadCounts.find((u) => u.courseId === course.id)?.count ?? 0
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
