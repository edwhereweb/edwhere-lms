import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ListChecks } from 'lucide-react';

import { db } from '@/lib/db';
import { canEditCourse } from '@/lib/course-auth';
import { IconBadge } from '@/components/icon-badge';
import { ChaptersForm } from '../_components/chapters-form';
import { ModulesForm } from '../_components/modules-form';

const CourseStructurePage = async ({ params }: { params: { courseId: string } }) => {
  const { userId } = await auth();
  if (!userId) return redirect('/sign-in');

  // Check permissions — owner, instructor, or admin
  const allowed = await canEditCourse(userId, params.courseId);
  if (!allowed) return redirect('/teacher/courses');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const course = await (db.course.findUnique as any)({
    where: { id: params.courseId },
    include: {
      modules: {
        orderBy: { position: 'asc' },
        include: {
          chapters: {
            where: { isLibraryAsset: false },
            orderBy: { position: 'asc' }
          }
        }
      },
      chapters: {
        where: { moduleId: null, isLibraryAsset: false },
        orderBy: { position: 'asc' }
      }
    }
  });

  if (!course) return redirect('/teacher/courses');

  return (
    <div className="p-6">
      <Link
        href={`/teacher/courses`}
        className="flex items-center text-sm hover:opacity-75 transition mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to courses
      </Link>
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-y-2">
          <h1 className="text-2xl font-medium">Course Structure</h1>
          <span className="text-sm text-slate-700 dark:text-slate-300">
            Manage your course modules and content
          </span>
        </div>
      </div>
      <div className="mt-8 max-w-3xl space-y-8">
        <div>
          <div className="flex items-center gap-x-2 mb-6">
            <IconBadge icon={ListChecks} />
            <h2 className="text-xl">Course Modules</h2>
          </div>
          <ModulesForm initialData={course} courseId={course.id} />
        </div>

        <div>
          <div className="flex items-center gap-x-2 mb-6 text-slate-500">
            <IconBadge icon={ListChecks} />
            <h2 className="text-xl">Unassigned Content</h2>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900 border rounded-md p-4">
            <p className="text-xs text-muted-foreground mb-4">
              These chapters are not assigned to any module and will appear at the root of the
              course.
            </p>
            <ChaptersForm initialData={course} courseId={course.id} moduleId={undefined} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseStructurePage;
