import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, User } from 'lucide-react';

import { db } from '@/lib/db';
import { canEditCourse } from '@/lib/course-auth';
import { IconBadge } from '@/components/icon-badge';
import { ProgressResetManager } from './_components/progress-reset-manager';

const StudentProgressPage = async ({
  params
}: {
  params: { courseId: string; studentId: string };
}) => {
  const { userId } = await auth();
  if (!userId) return redirect('/sign-in');

  const allowed = await canEditCourse(userId, params.courseId);
  if (!allowed) return redirect('/teacher/courses');

  const course = await db.course.findUnique({
    where: { id: params.courseId },
    include: {
      chapters: {
        where: { isPublished: true },
        orderBy: { position: 'asc' },
        include: {
          userProgress: {
            where: { userId: params.studentId }
          }
        }
      },
      modules: {
        include: {
          chapters: {
            where: { isPublished: true },
            orderBy: { position: 'asc' },
            include: {
              userProgress: {
                where: { userId: params.studentId }
              }
            }
          }
        }
      }
    }
  });

  if (!course) return redirect('/teacher/courses');

  const profile = await db.profile.findUnique({
    where: { userId: params.studentId }
  });

  if (!profile) return redirect(`/teacher/courses/${params.courseId}/learners`);

  const purchase = await db.purchase.findFirst({
    where: {
      courseId: params.courseId,
      userId: params.studentId
    }
  });

  if (!purchase) return redirect(`/teacher/courses/${params.courseId}/learners`);

  // Flatten chapters from chapters and modules
  let allChapters = course.chapters.map((ch) => ({
    id: ch.id,
    title: ch.title,
    isCompleted: !!ch.userProgress[0]?.isCompleted,
    contentType: ch.contentType || null
  }));

  course.modules.forEach((m) => {
    const moduleChapters = m.chapters.map((ch) => ({
      id: ch.id,
      title: ch.title,
      isCompleted: !!ch.userProgress[0]?.isCompleted,
      contentType: ch.contentType || null
    }));
    allChapters = [...allChapters, ...moduleChapters];
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Link
        href={`/teacher/courses/${params.courseId}/learners`}
        className="flex items-center text-sm hover:opacity-75 transition mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to learners
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div className="flex flex-col gap-y-2">
          <h1 className="text-2xl font-semibold flex items-center gap-x-2">
            <IconBadge icon={TrendingUp} />
            Manage Student Progress
          </h1>
          <div className="flex items-center gap-x-2 text-slate-500">
            <User className="h-4 w-4" />
            <span className="text-sm font-medium">{profile.name}</span>
            <span className="text-xs">({profile.email})</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 md:p-6 border border-slate-200 dark:border-slate-800">
        <div className="mb-6">
          <h2 className="text-lg font-medium text-slate-800 dark:text-slate-100">
            Course Chapters
          </h2>
          <p className="text-sm text-slate-500">
            Reset progress for specific chapters to allow the student to re-take evaluations or
            re-submit projects.
          </p>
        </div>

        <ProgressResetManager
          courseId={params.courseId}
          purchaseId={purchase.id}
          chapters={allChapters}
        />
      </div>
    </div>
  );
};

export default StudentProgressPage;
