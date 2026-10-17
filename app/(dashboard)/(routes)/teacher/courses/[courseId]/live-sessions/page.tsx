import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { db } from '@/lib/db';
import { canEditCourse } from '@/lib/course-auth';
import { canUseMeet } from '@/lib/live-sessions/access';
import { InstructorLiveSessions } from '@/components/live-sessions/instructor-live-sessions';

export const dynamic = 'force-dynamic';

export default async function TeacherLiveSessionsPage({
  params
}: {
  params: { courseId: string };
}) {
  const { userId } = await auth();
  if (!userId) return redirect('/sign-in');

  if (!(await canEditCourse(userId, params.courseId))) return redirect('/teacher/courses');

  const course = await db.course.findUnique({
    where: { id: params.courseId },
    select: { id: true, title: true, googleMeetEnabled: true }
  });
  if (!course) return redirect('/teacher/courses');

  return (
    <div className="p-6 max-w-4xl">
      <Link
        href={`/teacher/courses/${course.id}/details`}
        className="flex items-center text-sm hover:opacity-75 transition mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to course details
      </Link>
      <h1 className="text-2xl font-medium">Live sessions</h1>
      <p className="text-sm text-slate-700 dark:text-slate-300 mb-6">{course.title}</p>
      <InstructorLiveSessions courseId={course.id} meetAvailable={canUseMeet(course)} />
    </div>
  );
}
