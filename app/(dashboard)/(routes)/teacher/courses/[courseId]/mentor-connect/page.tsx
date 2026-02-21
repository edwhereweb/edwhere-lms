import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { isTeacher } from '@/lib/teacher';
import getSafeProfile from '@/actions/get-safe-profile';
import { MentorChat } from '@/app/(course)/courses/[courseId]/chat/_components/mentor-chat';
import Link from 'next/link';
import { ArrowLeft, MessageCircle } from 'lucide-react';

interface Props {
  params: { courseId: string };
}

export default async function InstructorMentorConnectPage({ params }: Props) {
  const { userId } = await auth();
  if (!userId) return redirect('/sign-in');

  const authorized = await isTeacher();
  if (!authorized) return redirect('/');

  const profile = await getSafeProfile();
  if (!profile) return redirect('/');

  const course = await db.course.findUnique({
    where: { id: params.courseId },
    select: { id: true, title: true, userId: true }
  });

  if (!course) return redirect('/teacher/courses');

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b bg-white dark:bg-slate-900">
        <Link
          href={`/teacher/courses/${params.courseId}`}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Course
        </Link>
        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
        <MessageCircle className="h-4 w-4 text-emerald-600" />
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Mentor Connect — {course.title}
        </span>
      </div>

      {/* Chat fills remaining height */}
      <div className="flex-1 overflow-hidden">
        <MentorChat
          courseId={params.courseId}
          currentProfileId={profile.id}
          currentRole={profile.role}
        />
      </div>
    </div>
  );
}
