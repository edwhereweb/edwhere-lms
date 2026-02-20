import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ListChecks } from 'lucide-react';

import { db } from '@/lib/db';
import { canEditCourse } from '@/lib/course-auth';
import { IconBadge } from '@/components/icon-badge';
import { ChaptersForm } from '../_components/chapters-form';

const CourseStructurePage = async ({ params }: { params: { courseId: string } }) => {
  const { userId } = await auth();
  if (!userId) return redirect('/sign-in');

  // Check permissions — owner, instructor, or admin
  const allowed = await canEditCourse(userId, params.courseId);
  if (!allowed) return redirect('/teacher/courses');

  const course = await db.course.findUnique({
    where: { id: params.courseId },
    include: {
      chapters: { orderBy: { position: 'asc' } }
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
      <div className="mt-8 max-w-3xl">
        <div className="flex items-center gap-x-2 mb-6">
          <IconBadge icon={ListChecks} />
          <h2 className="text-xl">Course chapters</h2>
        </div>
        <ChaptersForm initialData={course} courseId={course.id} />
      </div>
    </div>
  );
};

export default CourseStructurePage;
