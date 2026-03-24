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
  params: { courseId: string; purchaseId: string };
}) => {
  const { userId: teacherUserId } = await auth();
  if (!teacherUserId) return redirect('/sign-in');

  const allowed = await canEditCourse(teacherUserId, params.courseId);
  if (!allowed) return redirect('/teacher/courses');

  const purchase = await db.purchase.findUnique({
    where: {
      id: params.purchaseId,
      courseId: params.courseId
    }
  });

  if (!purchase) return redirect(`/teacher/courses/${params.courseId}/learners`);

  const studentId = purchase.userId;

  const course = await db.course.findUnique({
    where: { id: params.courseId },
    include: {
      modules: {
        orderBy: { position: 'asc' },
        include: {
          chapters: {
            orderBy: { position: 'asc' },
            include: {
              userProgress: {
                where: { userId: studentId }
              },
              quiz: {
                select: {
                  id: true,
                  maxAttempts: true,
                  attempts: {
                    where: { userId: studentId }
                  }
                }
              },
              projectSubmissions: {
                where: { userId: studentId }
              }
            }
          }
        }
      },
      chapters: {
        where: {
          moduleId: null
        },
        orderBy: { position: 'asc' },
        include: {
          userProgress: {
            where: { userId: studentId }
          },
          quiz: {
            select: {
              id: true,
              maxAttempts: true,
              attempts: {
                where: { userId: studentId }
              }
            }
          },
          projectSubmissions: {
            where: { userId: studentId }
          }
        }
      }
    }
  });

  if (!course) return redirect('/teacher/courses');

  const profile = await db.profile.findUnique({
    where: { userId: studentId }
  });

  if (!profile) return redirect(`/teacher/courses/${params.courseId}/learners`);

  // Flatten chapters from modules first, then un-moduled chapters
  let allChapters: {
    id: string;
    title: string;
    isCompleted: boolean;
    contentType: string | null;
    attemptsCount?: number;
    maxAttempts?: number;
    hasProjectSubmission?: boolean;
  }[] = [];

  course.modules.forEach((m) => {
    const moduleChapters = m.chapters.map((ch) => ({
      id: ch.id,
      title: ch.title,
      isCompleted: !!ch.userProgress[0]?.isCompleted,
      contentType: ch.contentType || null,
      attemptsCount: ch.quiz?.attempts.length,
      maxAttempts: ch.quiz?.maxAttempts,
      hasProjectSubmission: ch.projectSubmissions.length > 0
    }));
    allChapters = [...allChapters, ...moduleChapters];
  });

  const unmoduledChapters = course.chapters.map((ch) => ({
    id: ch.id,
    title: ch.title,
    isCompleted: !!ch.userProgress[0]?.isCompleted,
    contentType: ch.contentType || null,
    attemptsCount: ch.quiz?.attempts.length,
    maxAttempts: ch.quiz?.maxAttempts,
    hasProjectSubmission: ch.projectSubmissions.length > 0
  }));

  allChapters = [...allChapters, ...unmoduledChapters];

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
          purchaseId={params.purchaseId}
          chapters={allChapters}
        />
      </div>
    </div>
  );
};

export default StudentProgressPage;
