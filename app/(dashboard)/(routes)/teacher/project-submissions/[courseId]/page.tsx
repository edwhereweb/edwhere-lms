import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import { db } from '@/lib/db';
import { canEditCourse } from '@/lib/course-auth';

interface Props {
  params: { courseId: string };
}

export default async function ProjectSubmissionsCourseePage({ params }: Props) {
  const { userId } = await auth();
  if (!userId) return redirect('/sign-in');

  const allowed = await canEditCourse(userId, params.courseId);
  if (!allowed) return redirect('/teacher/project-submissions');

  const course = await db.course.findUnique({
    where: { id: params.courseId },
    select: { title: true }
  });
  if (!course) return redirect('/teacher/project-submissions');

  const chapters = await db.chapter.findMany({
    where: { courseId: params.courseId, contentType: 'HANDS_ON_PROJECT' },
    select: {
      id: true,
      title: true,
      isPublished: true,
      projectSubmissions: { select: { status: true } }
    },
    orderBy: { position: 'asc' }
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Link
        href="/teacher/project-submissions"
        className="flex items-center text-sm hover:opacity-75 transition mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        All courses
      </Link>

      <div className="flex items-center gap-x-2 mb-2">
        <ClipboardList className="h-6 w-6 text-orange-500" />
        <h1 className="text-2xl font-bold">{course.title}</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">Hands-on Project chapters in this course</p>

      {chapters.length === 0 ? (
        <p className="text-muted-foreground text-center py-16">
          No Hands-on Project chapters in this course.
        </p>
      ) : (
        <div className="space-y-3">
          {chapters.map((ch) => {
            const pending = ch.projectSubmissions.filter((s) => s.status === 'PENDING').length;
            const approved = ch.projectSubmissions.filter((s) => s.status === 'APPROVED').length;
            const rejected = ch.projectSubmissions.filter((s) => s.status === 'REJECTED').length;
            const total = ch.projectSubmissions.length;

            return (
              <Link
                key={ch.id}
                href={`/teacher/project-submissions/${params.courseId}/${ch.id}`}
                className="flex items-center justify-between p-4 border rounded-lg bg-white dark:bg-gray-800 shadow-sm hover:shadow-md hover:border-orange-300 dark:hover:border-orange-700 transition-all group"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <h2 className="font-semibold text-base truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                    {ch.title}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {total} submission{total !== 1 ? 's' : ''} ·{' '}
                    {ch.isPublished ? (
                      <span className="text-emerald-600">Published</span>
                    ) : (
                      <span className="text-amber-600">Draft</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-xs font-medium">
                  {pending > 0 && (
                    <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2.5 py-1 rounded-full">
                      🕐 {pending} pending
                    </span>
                  )}
                  {approved > 0 && (
                    <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2.5 py-1 rounded-full">
                      ✅ {approved}
                    </span>
                  )}
                  {rejected > 0 && (
                    <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2.5 py-1 rounded-full">
                      ❌ {rejected}
                    </span>
                  )}
                  {total === 0 && (
                    <span className="text-muted-foreground text-xs">No submissions</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
